import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MatchService {
  constructor(private prisma: PrismaService) {}

  // 接收 Python 爬虫准实时推送的数据
  async syncMatchData(payload: any) {
    try {
      const { source, datetime, status, homeTeam, awayTeam, score, homeShots, awayShots, events } = payload;
      
      // 1. 查找或创建双方队伍
      // 注意：这里的真实业务逻辑最好基于ID去查，由于目前爬虫拿到的是文本名称，我们简化用纯净名称匹配。
      const fetchOrCreateTeam = async (name: string) => {
          let team = await this.prisma.team.findFirst({ where: { name: { contains: name } } });
          if (!team) {
              team = await this.prisma.team.create({ data: { name, city: name.slice(0, 2) } });
          }
          return team;
      };

      const home = await fetchOrCreateTeam(homeTeam);
      const away = await fetchOrCreateTeam(awayTeam);

      // 分割比分 (例如 "2-1")
      let homeScore = 0, awayScore = 0;
      if (score && score.includes('-')) {
          const parts = score.split('-');
          homeScore = parseInt(parts[0], 10);
          awayScore = parseInt(parts[1], 10);
      }

      // 状态转化: 0未开始, 1进行中, 2已结束
      let statusCode = 0;
      if (status === '进行中') statusCode = 1;
      else if (status === '已完结' || status === '已结束') statusCode = 2;

      const matchDateBase = new Date(datetime);
      // 加±12小时窗口，同一天同对阵视为同一场比赛（可更新），不同天则创建新记录
      const startOfDay = new Date(matchDateBase);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(matchDateBase);
      endOfDay.setHours(23, 59, 59, 999);

      const match = await this.prisma.match.findFirst({
          where: {
              home_team_id: home.id,
              away_team_id: away.id,
              match_time: {
                  gte: startOfDay,
                  lte: endOfDay,
              }
          }
      });

      let updatedMatchId;
      if (match) {
          const updated = await this.prisma.match.update({
              where: { id: match.id },
              data: {
                  home_score: homeScore,
                  away_score: awayScore,
                  status: statusCode,
                  shot_count_home: homeShots || match.shot_count_home,
                  shot_count_away: awayShots || match.shot_count_away,
                  updatedAt: new Date(),
              }
          });
          updatedMatchId = updated.id;
      } else {
          const created = await this.prisma.match.create({
              data: {
                  home_team_id: home.id,
                  away_team_id: away.id,
                  match_time: matchDateBase,
                  home_score: homeScore,
                  away_score: awayScore,
                  status: statusCode,
                  shot_count_home: homeShots || 0,
                  shot_count_away: awayShots || 0,
              }
          });
          updatedMatchId = created.id;
      }

      // 3. 记录新增事件
      if (events && Array.isArray(events)) {
          for (const ev of events) {
              // 防重发：查看是否这一分钟该类型的事件已经发过了
              const minute = ev.minute;
              const type = ev.event_type || ev.eventType;
              const team = ev.team_type || ev.teamType;
              const player = ev.player;

              const existing = await this.prisma.matchEvent.findFirst({
                  where: { match_id: updatedMatchId, minute, event_type: type, player }
              });
              if (!existing) {
                  await this.prisma.matchEvent.create({
                      data: {
                          match_id: updatedMatchId,
                          minute,
                          team_type: team || 'home',
                          event_type: type || 'goal',
                          player: player || '未知球员',
                          detail: ev.detail || ''
                      }
                  });
              }
          }
      }

      return { success: true, matchId: updatedMatchId, message: 'Sync successfully updated live match' };
    } catch (e: any) {
      console.error("爬虫数据汇入失败:", e);
      return { success: false, message: e.message };
    }
  }

  // 给前端吐出的通用赛程列表（无数量限制，按时间升序，支持前端年份过滤）
  async getLiveMatches() {
      const matches = await this.prisma.match.findMany({
          orderBy: { match_time: 'asc' },
          include: {
              home_team: true,
              away_team: true,
              events: true
          }
      });

      return matches.map(m => {
          let statusText = '未开始';
          if (m.status === 1) statusText = '进行中';
          else if (m.status === 2) statusText = '已完结';

          // 根据比赛时间推算赛季轮次信息（后续可从单独字段读取）
          const matchYear = m.match_time.getFullYear();
          const matchMonth = m.match_time.getMonth() + 1;

          return {
              id: String(m.id),
              round: `${matchYear}赛季`,
              datetime: m.match_time.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
              location: m.venue || '官方主场',
              status: statusText,
              homeTeamId: String(m.home_team_id),
              homeTeam: m.home_team?.name || '未知主队',
              awayTeamId: String(m.away_team_id),
              awayTeam: m.away_team?.name || '未知客队',
              homePossession: m.possession_rate_home || 50,
              awayPossession: 100 - (m.possession_rate_home || 50),
              homeShots: m.shot_count_home || 0,
              awayShots: m.shot_count_away || 0,
              homeLogoColor: m.home_team?.logo_url || '#008000',
              awayLogoColor: m.away_team?.logo_url || '#cc6b2c',
              score: `${m.home_score}-${m.away_score}`,
              timestamp: m.match_time.toISOString()
          };
      });
  }

  async getMatchById(id: string) {
      const match = await this.prisma.match.findUnique({
          where: { id: parseInt(id, 10) },
          include: {
              home_team: true,
              away_team: true,
              events: { orderBy: { minute: 'asc' } }
          }
      });

      if (!match) return null;

      let statusText = '未开始';
      if (match.status === 1) statusText = '进行中';
      else if (match.status === 2) statusText = '已完结';

      const matchYear = match.match_time.getFullYear();

      return {
          id: String(match.id),
          round: `${matchYear}赛季`,
          datetime: match.match_time.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
          location: match.venue || '官方主场',
          status: statusText,
          homeTeamId: String(match.home_team_id),
          homeTeam: match.home_team?.name || '未知主队',
          awayTeamId: String(match.away_team_id),
          awayTeam: match.away_team?.name || '未知客队',
          homePossession: match.possession_rate_home || 50,
          awayPossession: 100 - (match.possession_rate_home || 50),
          homeShots: match.shot_count_home || 0,
          awayShots: match.shot_count_away || 0,
          homeLogoColor: match.home_team?.logo_url || '#008000',
          awayLogoColor: match.away_team?.logo_url || '#cc6b2c',
          score: `${match.home_score}-${match.away_score}`,
          timestamp: match.match_time.toISOString(),
          events: match.events
      };
  }

  // 动态聚合生成积分榜
  async getStandings(yearStr: string) {
      const year = parseInt(yearStr, 10) || new Date().getFullYear();
      
      const startOfYear = new Date(`${year}-01-01T00:00:00Z`);
      const endOfYear = new Date(`${year}-12-31T23:59:59Z`);

      const teams = await this.prisma.team.findMany();
      const matches = await this.prisma.match.findMany({
          where: {
              status: 2, // 仅计算已完结赛事
              match_time: {
                  gte: startOfYear,
                  lte: endOfYear
              }
          }
      });

      // 初始化积分板
      const table: Record<number, any> = {};
      for (const t of teams) {
          table[t.id] = {
              teamId: t.id,
              teamName: t.name,
              logo: t.logo_url,
              played: 0,
              won: 0,
              drawn: 0,
              lost: 0,
              goalsFor: 0,
              goalsAgainst: 0,
              points: 0
          };
      }

      // 计算积分
      for (const m of matches) {
          const homeId = m.home_team_id;
          const awayId = m.away_team_id;
          if (!homeId || !awayId || !table[homeId] || !table[awayId]) continue;

          table[homeId].played += 1;
          table[awayId].played += 1;

          table[homeId].goalsFor += m.home_score;
          table[homeId].goalsAgainst += m.away_score;
          table[awayId].goalsFor += m.away_score;
          table[awayId].goalsAgainst += m.home_score;

          if (m.home_score > m.away_score) {
              table[homeId].won += 1;
              table[homeId].points += 3;
              table[awayId].lost += 1;
          } else if (m.home_score < m.away_score) {
              table[awayId].won += 1;
              table[awayId].points += 3;
              table[homeId].lost += 1;
          } else {
              table[homeId].drawn += 1;
              table[homeId].points += 1;
              table[awayId].drawn += 1;
              table[awayId].points += 1;
          }
      }

      // 排序：积分 > 净胜球 > 进球数
      const standings = Object.values(table).sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          const gdA = a.goalsFor - a.goalsAgainst;
          const gdB = b.goalsFor - b.goalsAgainst;
          if (gdA !== gdB) return gdB - gdA;
          return b.goalsFor - a.goalsFor;
      });

      // 添加排名
      return standings.map((item, index) => ({ rank: index + 1, ...item }));
  }

  // 动态聚合生成球员射手榜
  async getPlayerRankings(yearStr: string) {
      const year = parseInt(yearStr, 10) || new Date().getFullYear();
      
      const startOfYear = new Date(`${year}-01-01T00:00:00Z`);
      const endOfYear = new Date(`${year}-12-31T23:59:59Z`);

      // 提取符合年份的赛事的所有进球事件
      const matches = await this.prisma.match.findMany({
          where: {
              match_time: { gte: startOfYear, lte: endOfYear }
          },
          include: {
              events: true,
              home_team: true,
              away_team: true
          }
      });

      const playerMap: Record<string, { name: string, goals: number, team: string }> = {};

      for (const m of matches) {
          const homeName = m.home_team?.name || '未知主队';
          const awayName = m.away_team?.name || '未知客队';
          
          for (const ev of m.events) {
              if (ev.event_type === 'goal') {
                  const playerName = ev.player;
                  if (!playerMap[playerName]) {
                      playerMap[playerName] = { 
                          name: playerName, 
                          goals: 0, 
                          team: ev.team_type === 'home' || ev.team_type === '1' ? homeName : awayName 
                      };
                  }
                  playerMap[playerName].goals += 1;
              }
          }
      }

      const rankings = Object.values(playerMap).sort((a, b) => b.goals - a.goals).slice(0, 50);
      return rankings.map((item, index) => ({ rank: index + 1, ...item }));
  }
}
