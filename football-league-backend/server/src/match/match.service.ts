import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { ChatService } from '../chat/chat.service';

const DEFAULT_PLAYER_AVATAR =
  'https://gimg3.baidu.com/lego/src=http%3A%2F%2Fstatic.open.baidu.com%2Fmedia%2Fch16%2Fpng%2Fplayer.png&refer=http%3A%2F%2Fwww.baidu.com&app=2009&size=w931&n=0&g=0n&er=404&q=75&fmt=auto';

const SCHEDULE_2026: Array<{ week: string; date: string; home: string; away: string; venue: string }> = [
  { week: '第1轮', date: '2026-04-11', home: '常州队', away: '南通队', venue: '常州奥体中心体育场' },
  { week: '第1轮', date: '2026-04-11', home: '扬州队', away: '苏州队', venue: '扬州体育公园体育场' },
  { week: '第1轮', date: '2026-04-11', home: '无锡队', away: '镇江队', venue: '宜兴市体育中心体育场' },
  { week: '第1轮', date: '2026-04-11', home: '连云港队', away: '盐城队', venue: '连云港市体育中心体育场' },
  { week: '第2轮', date: '2026-04-18', home: '宿迁队', away: '南京队', venue: '宿迁奥体中心体育场' },
  { week: '第2轮', date: '2026-04-18', home: '淮安队', away: '扬州队', venue: '淮安市体育中心体育场' },
  { week: '第2轮', date: '2026-04-18', home: '徐州队', away: '泰州队', venue: '徐州奥体中心体育场' },
  { week: '第3轮', date: '2026-04-25', home: '连云港队', away: '无锡队', venue: '连云港市体育中心体育场' },
  { week: '第3轮', date: '2026-04-25', home: '南通队', away: '徐州队', venue: '南通体育会展中心体育场' },
  { week: '第3轮', date: '2026-04-25', home: '盐城队', away: '宿迁队', venue: '盐城奥体中心体育场' },
  { week: '第4轮', date: '2026-05-02', home: '南京队', away: '常州队', venue: '南京奥体中心体育场' },
  { week: '第4轮', date: '2026-05-02', home: '泰州队', away: '扬州队', venue: '泰州体育公园体育场' },
  { week: '第4轮', date: '2026-05-02', home: '苏州队', away: '淮安队', venue: '常熟市体育中心体育场' },
  { week: '第4轮', date: '2026-05-02', home: '镇江队', away: '盐城队', venue: '镇江市体育会展中心体育场' },
  { week: '第5轮', date: '2026-05-09', home: '无锡队', away: '泰州队', venue: '宜兴市体育中心体育场' },
  { week: '第5轮', date: '2026-05-09', home: '南通队', away: '南京队', venue: '南通体育会展中心体育场' },
  { week: '第5轮', date: '2026-05-09', home: '徐州队', away: '宿迁队', venue: '徐州奥体中心体育场' },
  { week: '第6轮', date: '2026-05-16', home: '常州队', away: '淮安队', venue: '常州奥体中心体育场' },
  { week: '第6轮', date: '2026-05-16', home: '苏州队', away: '连云港队', venue: '昆山奥体中心足球场' },
  { week: '第6轮', date: '2026-05-16', home: '扬州队', away: '镇江队', venue: '扬州体育公园体育场' },
  { week: '第7轮', date: '2026-05-23', home: '淮安队', away: '盐城队', venue: '淮安市体育中心体育场' },
  { week: '第7轮', date: '2026-05-23', home: '连云港队', away: '徐州队', venue: '连云港市体育中心体育场' },
  { week: '第7轮', date: '2026-05-23', home: '宿迁队', away: '南通队', venue: '宿迁奥体中心体育场' },
  { week: '第8轮', date: '2026-05-30', home: '泰州队', away: '苏州队', venue: '泰州体育公园体育场' },
  { week: '第8轮', date: '2026-05-30', home: '盐城队', away: '扬州队', venue: '盐城奥体中心体育场' },
  { week: '第8轮', date: '2026-05-30', home: '镇江队', away: '常州队', venue: '镇江市体育会展中心体育场' },
  { week: '第8轮', date: '2026-05-30', home: '无锡队', away: '南京队', venue: '江阴市体育中心体育场' },
  { week: '第9轮', date: '2026-06-13', home: '徐州队', away: '无锡队', venue: '徐州奥体中心体育场' },
  { week: '第9轮', date: '2026-06-13', home: '宿迁队', away: '镇江队', venue: '宿迁奥体中心体育场' },
  { week: '第9轮', date: '2026-06-13', home: '南通队', away: '泰州队', venue: '南通体育会展中心体育场' },
  { week: '第10轮', date: '2026-06-20', home: '常州队', away: '盐城队', venue: '常州奥体中心体育场' },
  { week: '第10轮', date: '2026-06-20', home: '扬州队', away: '连云港队', venue: '扬州体育公园体育场' },
  { week: '第10轮', date: '2026-06-20', home: '苏州队', away: '南通队', venue: '苏州市体育中心体育场' },
  { week: '第10轮', date: '2026-06-20', home: '南京队', away: '淮安队', venue: '南京奥体中心体育场' },
  { week: '第11轮', date: '2026-06-27', home: '淮安队', away: '无锡队', venue: '淮安市体育中心体育场' },
  { week: '第11轮', date: '2026-06-27', home: '镇江队', away: '苏州队', venue: '镇江市体育会展中心体育场' },
  { week: '第11轮', date: '2026-06-27', home: '连云港队', away: '常州队', venue: '连云港市体育中心体育场' },
  { week: '第12轮', date: '2026-07-04', home: '盐城队', away: '苏州队', venue: '盐城奥体中心体育场' },
  { week: '第12轮', date: '2026-07-04', home: '无锡队', away: '宿迁队', venue: '江阴市体育中心体育场' },
  { week: '第12轮', date: '2026-07-04', home: '泰州队', away: '镇江队', venue: '泰州体育公园体育场' },
  { week: '第12轮', date: '2026-07-04', home: '徐州队', away: '南京队', venue: '徐州奥体中心体育场' },
  { week: '第13轮', date: '2026-07-11', home: '宿迁队', away: '常州队', venue: '宿迁奥体中心体育场' },
  { week: '第13轮', date: '2026-07-11', home: '南京队', away: '连云港队', venue: '南京奥体中心体育场' },
  { week: '第13轮', date: '2026-07-11', home: '南通队', away: '扬州队', venue: '南通体育会展中心体育场' },
  { week: '第14轮', date: '2026-07-25', home: '镇江队', away: '淮安队', venue: '镇江市体育会展中心体育场' },
  { week: '第14轮', date: '2026-07-25', home: '苏州队', away: '无锡队', venue: '苏州市体育中心体育场' },
  { week: '第14轮', date: '2026-07-25', home: '常州队', away: '泰州队', venue: '常州奥体中心体育场' },
  { week: '第14轮', date: '2026-07-25', home: '扬州队', away: '徐州队', venue: '扬州体育公园体育场' },
  { week: '第15轮', date: '2026-08-01', home: '盐城队', away: '南京队', venue: '盐城奥体中心体育场' },
  { week: '第15轮', date: '2026-08-01', home: '淮安队', away: '南通队', venue: '淮安市体育中心体育场' },
  { week: '第15轮', date: '2026-08-01', home: '连云港队', away: '宿迁队', venue: '连云港市体育中心体育场' },
  { week: '第16轮', date: '2026-08-08', home: '无锡队', away: '盐城队', venue: '宜兴市体育中心体育场' },
  { week: '第16轮', date: '2026-08-08', home: '泰州队', away: '连云港队', venue: '泰州体育公园体育场' },
  { week: '第16轮', date: '2026-08-08', home: '徐州队', away: '常州队', venue: '徐州奥体中心体育场' },
  { week: '第17轮', date: '2026-08-15', home: '南通队', away: '镇江队', venue: '南通体育会展中心体育场' },
  { week: '第17轮', date: '2026-08-15', home: '宿迁队', away: '苏州队', venue: '宿迁奥体中心体育场' },
  { week: '第17轮', date: '2026-08-15', home: '南京队', away: '扬州队', venue: '南京奥体中心体育场' },
  { week: '第18轮', date: '2026-08-22', home: '苏州队', away: '南京队', venue: '苏州市体育中心体育场' },
  { week: '第18轮', date: '2026-08-22', home: '镇江队', away: '徐州队', venue: '镇江市体育会展中心体育场' },
  { week: '第18轮', date: '2026-08-22', home: '泰州队', away: '淮安队', venue: '泰州体育公园体育场' },
  { week: '第19轮', date: '2026-08-29', home: '扬州队', away: '宿迁队', venue: '扬州体育公园体育场' },
  { week: '第19轮', date: '2026-08-29', home: '常州队', away: '无锡队', venue: '常州奥体中心体育场' },
  { week: '第19轮', date: '2026-08-29', home: '淮安队', away: '连云港队', venue: '淮安市体育中心体育场' },
  { week: '第20轮', date: '2026-09-05', home: '连云港队', away: '泰州队', venue: '连云港市体育中心体育场' },
  { week: '第20轮', date: '2026-09-05', home: '盐城队', away: '徐州队', venue: '盐城奥体中心体育场' },
  { week: '第20轮', date: '2026-09-05', home: '南京队', away: '泰州队', venue: '南京奥体中心体育场' },
  { week: '第21轮', date: '2026-09-12', home: '宿迁队', away: '泰州队', venue: '宿迁奥体中心体育场' },
  { week: '第21轮', date: '2026-09-12', home: '盐城队', away: '南通队', venue: '盐城奥体中心体育场' },
  { week: '第21轮', date: '2026-09-12', home: '南京队', away: '镇江队', venue: '南京奥体中心体育场' },
  { week: '第21轮', date: '2026-09-12', home: '无锡队', away: '扬州队', venue: '江阴市体育中心体育场' },
  { week: '第21轮', date: '2026-09-12', home: '徐州队', away: '淮安队', venue: '徐州奥体中心体育场' },
  { week: '第21轮', date: '2026-09-12', home: '常州队', away: '苏州队', venue: '常州奥体中心体育场' },
  { week: '第22轮', date: '2026-09-19', home: '苏州队', away: '徐州队', venue: '昆山奥体中心足球场' },
  { week: '第22轮', date: '2026-09-19', home: '南通队', away: '无锡队', venue: '南通体育会展中心体育场' },
  { week: '第22轮', date: '2026-09-19', home: '镇江队', away: '连云港队', venue: '镇江市体育会展中心体育场' },
  { week: '第22轮', date: '2026-09-19', home: '扬州队', away: '常州队', venue: '扬州体育公园体育场' },
  { week: '第22轮', date: '2026-09-19', home: '淮安队', away: '宿迁队', venue: '淮安市体育中心体育场' },
  { week: '第22轮', date: '2026-09-19', home: '泰州队', away: '盐城队', venue: '泰州体育公园体育场' },
];

@Injectable()
export class MatchService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private chatService: ChatService,
  ) {}

  private getScheduleMeta(matchTime: Date, homeName?: string | null, awayName?: string | null) {
    const dateKey = matchTime.toISOString().slice(0, 10);
    const home = homeName ? this.normalizeTeamName(homeName) : '';
    const away = awayName ? this.normalizeTeamName(awayName) : '';
    return SCHEDULE_2026.find((item) => item.date === dateKey && (!home || item.home === home) && (!away || item.away === away));
  }

  private getRoundLabel(matchTime: Date, homeName?: string | null, awayName?: string | null) {
    const dateKey = matchTime.toISOString().slice(0, 10);
    const knockoutRounds2025: Record<string, string> = {
      '2025-10-04': '1/4决赛',
      '2025-10-05': '1/4决赛',
      '2025-10-07': '1/4决赛',
      '2025-10-08': '1/4决赛',
      '2025-10-18': '半决赛',
      '2025-10-19': '半决赛',
      '2025-11-01': '决赛',
    };

    return this.getScheduleMeta(matchTime, homeName, awayName)?.week || knockoutRounds2025[dateKey] || `${matchTime.getFullYear()}赛季`;
  }

  private getVenueLabel(matchTime: Date, homeName?: string | null, awayName?: string | null, storedVenue?: string | null) {
    if (storedVenue && storedVenue !== '官方主场') return storedVenue;
    return this.getScheduleMeta(matchTime, homeName, awayName)?.venue || storedVenue || '官方主场';
  }

  private normalizeTeamName(name: string) {
    return name.endsWith('队') ? name : name + '队';
  }

  private normalizePlayerNameKey(name?: string | null) {
    return String(name || '')
      .replace(/\(.*?\)|（.*?）/g, '')
      .replace(/[\s·•・.\-]/g, '')
      .trim();
  }

  private normalizePlayerPosition(position?: string | null) {
    const value = String(position || '').trim();
    if (!value || ['starter', '首发', '未知', 'null'].includes(value)) return null;
    return value;
  }

  private async findRosterPlayer(teamId: number, playerName?: string | null, jerseyNumber?: number | string | null) {
    const name = String(playerName || '').trim();
    const jersey =
      jerseyNumber === undefined || jerseyNumber === null || jerseyNumber === ''
        ? undefined
        : Number(jerseyNumber);

    let exact = null;
    if (name) {
      exact = await this.prisma.player.findFirst({
        where: { name, team_id: teamId, is_coach: false },
        orderBy: [{ avatar_url: 'desc' }, { updatedAt: 'desc' }],
      });
    }

    const needle = this.normalizePlayerNameKey(name);
    if (needle) {
      const teamPlayers = await this.prisma.player.findMany({
        where: { team_id: teamId, is_coach: false },
        orderBy: [{ avatar_url: 'desc' }, { updatedAt: 'desc' }],
      });
      const normalized = teamPlayers.find((player) => {
        const key = this.normalizePlayerNameKey(player.name);
        return key === needle || key.includes(needle) || needle.includes(key);
      });
      if (normalized) return normalized;
      if (exact) return exact;
    }

    const candidates = await this.prisma.player.findMany({
      where: {
        team_id: teamId,
        is_coach: false,
        ...(Number.isFinite(jersey) ? { jersey_number: jersey } : {}),
      },
      orderBy: [{ avatar_url: 'desc' }, { updatedAt: 'desc' }],
    });

    if (Number.isFinite(jersey) && candidates.length) {
      return candidates[0];
    }

    return null;
  }

  private isJiangsuCityTeam(name?: string | null) {
    if (!name) return false;
    return [
      '南京队', '苏州队', '无锡队', '南通队', '徐州队', '常州队', '连云港队',
      '淮安队', '盐城队', '扬州队', '镇江队', '泰州队', '宿迁队',
    ].includes(this.normalizeTeamName(name));
  }

  private async fetchOrCreateTeam(name: string) {
    const normalizedName = this.normalizeTeamName(name);
    let team = await this.prisma.team.findFirst({ where: { name: normalizedName } });
    if (!team) {
      team = await this.prisma.team.create({ data: { name: normalizedName, city: name.slice(0, 2) } });
    }
    return team;
  }

  private serializeJson(value: unknown) {
    if (value === undefined || value === null) return undefined;
    return typeof value === 'string' ? value : JSON.stringify(value);
  }

  private parseJson(value: string | null) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private isMissingOptionalTableError(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2021';
  }

  private async upsertPlayer(input: {
    name: string;
    teamId?: number | null;
    position?: string | null;
    jerseyNumber?: number | string | null;
    avatarUrl?: string | null;
    externalSource?: string | null;
    externalId?: string | null;
    isCoach?: boolean;
  }) {
    const name = String(input.name || '').trim();
    if (!name) return null;

    const existing = await this.prisma.player.findFirst({
      where: {
        name,
        team_id: input.teamId ?? undefined,
        is_coach: input.isCoach ?? false,
      },
    });

    const jerseyNumber =
      input.jerseyNumber === undefined || input.jerseyNumber === null || input.jerseyNumber === ''
        ? undefined
        : Number(input.jerseyNumber);

    const data = {
      team_id: input.teamId ?? undefined,
      position: this.normalizePlayerPosition(input.position) ?? undefined,
      jersey_number: Number.isFinite(jerseyNumber) ? jerseyNumber : undefined,
      avatar_url: input.avatarUrl ?? undefined,
      external_source: input.externalSource ?? undefined,
      external_id: input.externalId ?? undefined,
      is_coach: input.isCoach ?? false,
    };

    if (existing) {
      return this.prisma.player.update({ where: { id: existing.id }, data });
    }

    return this.prisma.player.create({
      data: {
        name,
        ...data,
      },
    });
  }

  private normalizeLineupPlayers(lineup: any) {
    if (!lineup) return [];
    if (Array.isArray(lineup)) return lineup;
    if (Array.isArray(lineup.players)) return lineup.players;
    if (typeof lineup === 'object' && lineup.players && typeof lineup.players === 'object') {
      return Object.values(lineup.players);
    }
    return [];
  }

  private hasLineupPlayers(lineup: any) {
    return this.normalizeLineupPlayers(lineup).length > 0;
  }

  private countLineupPlayers(lineup: any) {
    return this.normalizeLineupPlayers(lineup).length;
  }

  private hasCompleteStartingLineup(lineup: any) {
    return this.countLineupPlayers(lineup) >= 11;
  }

  private hasPartialStartingLineup(lineup: any) {
    const count = this.countLineupPlayers(lineup);
    return count > 0 && count < 11;
  }

  private completeLineupOrNull(lineup: any) {
    if (!lineup) return null;
    return this.hasCompleteStartingLineup(lineup) ? lineup : null;
  }

  private extractMinuteFromLive(content?: string | null) {
    const match = String(content || '').match(/(\d{1,3})(?:\+\d{1,2})?['’′-]/);
    return match ? match[1] : '';
  }

  private inferTeamTypeFromContent(content: string, homeTeam?: string | null, awayTeam?: string | null) {
    const home = homeTeam ? this.normalizeTeamName(homeTeam) : '';
    const away = awayTeam ? this.normalizeTeamName(awayTeam) : '';
    if (home && content.includes(home)) return 'home';
    if (away && content.includes(away)) return 'away';
    return 'home';
  }

  private extractPlayerFromLive(content: string, eventType: string) {
    if (eventType === 'substitution') {
      const subIn = content.match(/换人[，,]\s*([^↑↓\s]+)↑/);
      return subIn?.[1] || '换人';
    }
    const namedPlayer = content.match(/[-－]\s*([\u4e00-\u9fa5·•・A-Za-z0-9]{2,18})\((?:[\u4e00-\u9fa5]+队)\)/);
    if (namedPlayer) return namedPlayer[1];
    const cardedPlayer = content.match(/给了\s*([\u4e00-\u9fa5·•・A-Za-z0-9]{2,18})\((?:[\u4e00-\u9fa5]+队)\)/);
    if (cardedPlayer) return cardedPlayer[1];
    const afterDash = content.match(/[-－]\s*([\u4e00-\u9fa5·•・A-Za-z0-9]{2,18})(?:取得|$)/);
    if (afterDash && !afterDash[1].endsWith('队') && !afterDash[1].includes('角球')) return afterDash[1];
    const scoringTeam = content.match(/([\u4e00-\u9fa5]+队)取得/);
    if (scoringTeam) return scoringTeam[1];
    const teamOnly = content.match(/[-－]\s*([\u4e00-\u9fa5]+队)/);
    return teamOnly?.[1] || '未知球员';
  }

  private buildDetailFromLive(content: string, eventType: string) {
    if (eventType === 'substitution') {
      const subOut = content.match(/↑\s*([^↑↓\s]+)↓/);
      return subOut?.[1] ? `换下${subOut[1]}` : content;
    }
    const score = content.match(/比分(?:为)?\s*(\d+\s*[-:：]\s*\d+)/);
    if (score) return score[1].replace(/[：:]/g, '-').replace(/\s+/g, '');
    return content.length > 90 ? content.slice(0, 90) : content;
  }

  private synthesizeEventsFromTextLives(textLives: any[], homeTeam?: string | null, awayTeam?: string | null) {
    if (!Array.isArray(textLives)) return [];
    const events: any[] = [];
    const seen = new Set<string>();

    for (const item of textLives) {
      const content = String(item?.content || '').trim();
      if (!content || content.startsWith('纳米数据')) continue;
      const minute = this.extractMinuteFromLive(content);
      if (!minute) continue;

      let eventType = '';
      if (/点球不进|点球未进|罚丢|射失点球/.test(content)) eventType = 'penalty_missed';
      else if (/乌龙球/.test(content)) eventType = 'own_goal';
      else if (/进球/.test(content) && !/角球/.test(content)) eventType = /点球/.test(content) ? 'penalty_goal' : 'goal';
      else if (/红牌/.test(content)) eventType = 'red_card';
      else if (/黄牌/.test(content)) eventType = 'yellow_card';
      else if (/换人|↑.*↓/.test(content)) eventType = 'substitution';
      if (!eventType) continue;

      const player = this.extractPlayerFromLive(content, eventType);
      const key = `${minute}|${eventType}|${player}|${content}`;
      if (seen.has(key)) continue;
      seen.add(key);
      events.push({
        minute,
        team_type: this.inferTeamTypeFromContent(content, homeTeam, awayTeam),
        event_type: eventType,
        player,
        detail: this.buildDetailFromLive(content, eventType),
      });
    }

    return events.sort((a, b) => Number(a.minute) - Number(b.minute));
  }

  private normalizeEventForDisplay(event: any, homeTeam: string, awayTeam: string) {
    const detail = String(event?.detail || event?.content || '').trim();
    let eventType = event?.event_type || event?.eventType || 'other';
    if (/点球不进|点球未进|罚丢|射失点球/.test(detail)) eventType = 'penalty_missed';
    else if (eventType === 'goal' && /点球/.test(detail)) eventType = 'penalty_goal';

    const teamType = event?.team_type || event?.teamType || event?.side;
    let player = String(event?.player || '').trim();
    if (!player || player === '未知球员') {
      player = this.extractPlayerFromLive(detail, eventType);
      if (!player || player === '未知球员') {
        player = teamType === 'away' ? awayTeam : homeTeam;
      }
    }

    return {
      ...event,
      event_type: eventType,
      eventType,
      player,
    };
  }

  private normalizeLineupPlayerKey(player: any) {
    const name = String(player?.name || player?.player || '').replace(/[·•・\-\s]/g, '').trim();
    return name || '';
  }

  private cleanLineupAvatar(url?: string | null) {
    const avatar = String(url || '').trim();
    if (!avatar) return null;
    if (avatar.includes('/player.png') || avatar.includes('static.open.baidu.com')) return null;
    return avatar;
  }

  private cleanLineupProfileUrl(url?: string | null) {
    const profileUrl = String(url || '').trim();
    return /^https?:\/\//.test(profileUrl) ? profileUrl : null;
  }

  private sanitizeLineupForDisplay(lineup: any, duplicatedNames: Set<string>) {
    if (!lineup || typeof lineup !== 'object') return lineup;
    const players = this.normalizeLineupPlayers(lineup);
    if (!players.length) return lineup;

    return {
      ...lineup,
      players: players.map((entry: any, index: number) => {
        const key = this.normalizeLineupPlayerKey(entry);
        const isDuplicatedAcrossSides = key && duplicatedNames.has(key);
        const avatar = isDuplicatedAcrossSides
          ? null
          : this.cleanLineupAvatar(entry?.avatarUrl || entry?.avatar_url || entry?.avatar || null);
        const profileUrl = isDuplicatedAcrossSides
          ? null
          : this.cleanLineupProfileUrl(entry?.profileUrl || entry?.profile_url || null);

        return {
          ...entry,
          order: entry?.order ?? index + 1,
          avatarUrl: avatar,
          avatar_url: avatar,
          avatar,
          profileUrl,
          externalId: null,
          external_id: null,
        };
      }),
    };
  }

  private sanitizeLineupPairForDisplay(lineupHome: any, lineupAway: any) {
    const homeNames = new Set<string>(
      this.normalizeLineupPlayers(lineupHome)
        .map((player: any) => this.normalizeLineupPlayerKey(player))
        .filter((name: string) => Boolean(name)),
    );
    const awayNames = new Set<string>(
      this.normalizeLineupPlayers(lineupAway)
        .map((player: any) => this.normalizeLineupPlayerKey(player))
        .filter((name: string) => Boolean(name)),
    );
    const duplicatedNames = new Set<string>([...homeNames].filter((name) => awayNames.has(name)));

    return {
      home: this.sanitizeLineupForDisplay(lineupHome, duplicatedNames),
      away: this.sanitizeLineupForDisplay(lineupAway, duplicatedNames),
    };
  }

  private async syncLineupEntries(matchId: number, teamId: number, side: 'home' | 'away', lineup: any) {
    if (!lineup) return;
    const formation = typeof lineup === 'object' ? lineup.formation : undefined;
    const players = this.normalizeLineupPlayers(lineup);

    for (const [index, entry] of players.entries()) {
      const playerName = String(entry?.name || entry?.player || '').trim();
      if (!playerName) continue;
      const player = await this.upsertPlayer({
        name: playerName,
        teamId,
        position: this.normalizePlayerPosition(entry?.position) || null,
        jerseyNumber: entry?.number || entry?.jersey_number || entry?.jerseyNumber || null,
        avatarUrl: entry?.avatar || entry?.avatar_url || entry?.avatarUrl || null,
        externalSource: entry?.external_source || entry?.externalSource || null,
        externalId: entry?.external_id || entry?.externalId || null,
      });
      if (!player) continue;

      const existing = await this.prisma.matchLineupEntry.findFirst({
        where: { match_id: matchId, side, role: entry?.role || 'starter', player_id: player.id },
      });
      const data = {
        match_id: matchId,
        team_id: teamId,
        player_id: player.id,
        side,
        role: entry?.role || 'starter',
        position: this.normalizePlayerPosition(entry?.position) || player.position || null,
        jersey_number: player.jersey_number,
        formation: formation || null,
        display_order: index,
      };

      if (existing) {
        await this.prisma.matchLineupEntry.update({ where: { id: existing.id }, data });
      } else {
        await this.prisma.matchLineupEntry.create({ data });
      }
    }

    const coachName = typeof lineup === 'object' ? lineup.coach || lineup.coachName : null;
    if (coachName) {
      const coach = await this.upsertPlayer({ name: coachName, teamId, isCoach: true });
      if (coach) {
        const existing = await this.prisma.matchLineupEntry.findFirst({
          where: { match_id: matchId, side, role: 'coach', player_id: coach.id },
        });
        const data = {
          match_id: matchId,
          team_id: teamId,
          player_id: coach.id,
          side,
          role: 'coach',
          formation: formation || null,
          display_order: 999,
        };
        if (existing) await this.prisma.matchLineupEntry.update({ where: { id: existing.id }, data });
        else await this.prisma.matchLineupEntry.create({ data });
      }
    }
  }

  private async enrichLineupWithRoster(lineup: any, teamId: number) {
    if (!lineup || typeof lineup !== 'object') return lineup;
    const players = this.normalizeLineupPlayers(lineup);
    if (!players.length) return lineup;

    const enrichedPlayers = await Promise.all(players.map(async (entry: any, index: number) => {
      const playerName = String(entry?.name || entry?.player || '').trim();
      if (!playerName) return entry;
      const player = await this.findRosterPlayer(
        teamId,
        playerName,
        entry?.number || entry?.jerseyNumber || entry?.jersey_number || null,
      );
      return {
        ...entry,
        order: entry?.order ?? index + 1,
        number: entry?.number || entry?.jerseyNumber || player?.jersey_number || '',
        jerseyNumber: entry?.jerseyNumber || entry?.number || player?.jersey_number || '',
        avatarUrl: this.cleanLineupAvatar(entry?.avatarUrl || entry?.avatar_url || entry?.avatar || null),
        position: entry?.position || player?.position || null,
        profileUrl: this.cleanLineupProfileUrl(entry?.profileUrl || entry?.profile_url || null),
        externalId: entry?.externalId || entry?.external_id || null,
      };
    }));

    return {
      ...lineup,
      players: enrichedPlayers,
    };
  }

  // 接收 Python 爬虫准实时推送的数据
  async syncMatchData(payload: any) {
    try {
      const { 
          datetime, status, homeTeam, awayTeam, score, 
          homeShots, awayShots, possessionRateHome, possessionRateAway,
          attackHome, attackAway, dangerousAttackHome, dangerousAttackAway,
          shotsOnTargetHome, shotsOnTargetAway, shotsOffTargetHome, shotsOffTargetAway,
          cornerCountHome, cornerCountAway, penaltyCountHome, penaltyCountAway,
          yellowCardHome, yellowCardAway, redCardHome, redCardAway,
          lineupHome, lineupAway,
          events, textLives
      } = payload;
      
      const home = await this.fetchOrCreateTeam(homeTeam);
      const away = await this.fetchOrCreateTeam(awayTeam);

      // 分割比分 (例如 "2-1")
      let homeScore = 0, awayScore = 0;
      if (score && score.includes('-')) {
          const parts = score.split('-');
          homeScore = parseInt(parts[0], 10);
          awayScore = parseInt(parts[1], 10);
          if (isNaN(homeScore)) homeScore = 0;
          if (isNaN(awayScore)) awayScore = 0;
      }

      // 状态转化: 0未开始, 1进行中, 2已结束
      let statusCode = 0;
      const normalizedStatus = (status || '').trim();
      if (normalizedStatus === '进行中') statusCode = 1;
      else if (['已完结', '已结束', '已结选'].includes(normalizedStatus)) statusCode = 2;

      const matchDateBase = new Date(datetime);
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

      let updatedMatchId: number;
      const enrichedLineupHome = await this.enrichLineupWithRoster(lineupHome, home.id);
      const enrichedLineupAway = await this.enrichLineupWithRoster(lineupAway, away.id);
      const shouldUpdateLineupHome = this.hasCompleteStartingLineup(enrichedLineupHome);
      const shouldUpdateLineupAway = this.hasCompleteStartingLineup(enrichedLineupAway);
      const existingLineupHome = this.parseJson(match?.lineup_home ?? null);
      const existingLineupAway = this.parseJson(match?.lineup_away ?? null);
      const shouldClearPartialLineupHome =
        this.hasPartialStartingLineup(enrichedLineupHome) && (!existingLineupHome || this.hasPartialStartingLineup(existingLineupHome));
      const shouldClearPartialLineupAway =
        this.hasPartialStartingLineup(enrichedLineupAway) && (!existingLineupAway || this.hasPartialStartingLineup(existingLineupAway));
      const scheduleMeta = this.getScheduleMeta(matchDateBase, home.name, away.name);
      const venue = payload.location || payload.venue || scheduleMeta?.venue || undefined;
      const round = scheduleMeta?.week || payload.round || undefined;

      const updateData = {
        home_score: homeScore,
        away_score: awayScore,
        status: statusCode,
        venue,
        round,
        shot_count_home: homeShots ?? undefined,
        shot_count_away: awayShots ?? undefined,
        possession_rate_home: possessionRateHome ?? undefined,
        possession_rate_away: possessionRateAway ?? undefined,
        attack_home: attackHome ?? undefined,
        attack_away: attackAway ?? undefined,
        dangerous_attack_home: dangerousAttackHome ?? undefined,
        dangerous_attack_away: dangerousAttackAway ?? undefined,
        shots_on_target_home: shotsOnTargetHome ?? undefined,
        shots_on_target_away: shotsOnTargetAway ?? undefined,
        shots_off_target_home: shotsOffTargetHome ?? undefined,
        shots_off_target_away: shotsOffTargetAway ?? undefined,
        corner_count_home: cornerCountHome ?? undefined,
        corner_count_away: cornerCountAway ?? undefined,
        penalty_count_home: penaltyCountHome ?? undefined,
        penalty_count_away: penaltyCountAway ?? undefined,
        yellow_card_home: yellowCardHome ?? undefined,
        yellow_card_away: yellowCardAway ?? undefined,
        red_card_home: redCardHome ?? undefined,
        red_card_away: redCardAway ?? undefined,
        lineup_home: shouldUpdateLineupHome ? this.serializeJson(enrichedLineupHome) : shouldClearPartialLineupHome ? null : undefined,
        lineup_away: shouldUpdateLineupAway ? this.serializeJson(enrichedLineupAway) : shouldClearPartialLineupAway ? null : undefined,
        updatedAt: new Date(),
      };

      if (match) {
          const updated = await this.prisma.match.update({
              where: { id: match.id },
              data: updateData
          });
          updatedMatchId = updated.id;
      } else {
          const created = await this.prisma.match.create({
              data: {
                  ...updateData,
                  home_team: { connect: { id: home.id } },
                  away_team: { connect: { id: away.id } },
                  match_time: matchDateBase,
                  venue: venue || '官方主场'
              }
          });
          updatedMatchId = created.id;
      }

      if (shouldUpdateLineupHome) {
          await this.syncLineupEntries(updatedMatchId, home.id, 'home', enrichedLineupHome);
      }
      if (shouldUpdateLineupAway) {
          await this.syncLineupEntries(updatedMatchId, away.id, 'away', enrichedLineupAway);
      }

      if (statusCode === 2) {
          try {
              await this.usersService.evaluateGuesses(updatedMatchId);
          } catch (error) {
              console.error('自动结算竞猜失败:', error);
          }
      }

      // Update chat room status based on match status
      try {
          await this.chatService.updateRoomStatusByMatch(updatedMatchId, statusCode);
      } catch (error) {
          console.error('更新聊天室状态失败:', error);
      }

      // Auto-create chat room for this match if it doesn't exist yet
      try {
          await this.chatService.getRoomByMatchId(updatedMatchId);
      } catch (error) {
          console.error('自动创建聊天室失败:', error);
      }

      const eventsToSync =
          events && Array.isArray(events) && events.length
              ? events
              : this.synthesizeEventsFromTextLives(textLives, home.name, away.name);

      // 3. 记录新增事件
      if (eventsToSync && Array.isArray(eventsToSync)) {
          for (const ev of eventsToSync) {
              const minute = String(ev.minute || '');
              const type = ev.event_type || ev.eventType;
              const teamType = ev.team_type || ev.teamType;
              const player = ev.player || '未知球员';

              if (!minute || !type) continue;

              const existing = await this.prisma.matchEvent.findFirst({
                  where: { 
                      match_id: updatedMatchId, 
                      minute: minute, 
                      event_type: type, 
                      player: player
                  }
              });
              if (!existing) {
                  await this.prisma.matchEvent.create({
                      data: {
                          match_id: updatedMatchId,
                          minute: minute,
                          team_type: teamType || 'home',
                          event_type: type || 'goal',
                          player: player,
                          detail: ev.detail || ev.content || ''
                      }
                  });
              } else {
                  await this.prisma.matchEvent.update({
                      where: { id: existing.id },
                      data: {
                          team_type: teamType || existing.team_type,
                          event_type: type || existing.event_type,
                          detail: ev.detail || ev.content || existing.detail || ''
                      }
                  });
              }
          }
      }

      // 4. 记录文字直播
      if (textLives && Array.isArray(textLives)) {
          for (const tl of textLives) {
              const { time, content } = tl;
              if (!time || !content) continue;
              const liveTime = String(time).trim().slice(0, 20);

              const existing = await this.prisma.textLive.findFirst({
                  where: {
                      match_id: updatedMatchId,
                      content: content
                  }
              });
              if (!existing) {
                  await this.prisma.textLive.create({
                      data: {
                          match_id: updatedMatchId,
                          time: liveTime,
                          content: content
                      }
                  });
              }
          }
      }

      return { success: true, matchId: updatedMatchId, message: 'Sync successfully updated match with full stats' };
    } catch (e: any) {
      console.error("爬虫数据汇入失败:", e);
      return { success: false, message: e.message };
    }
  }

  private canGuessMatch(match: { status: number; match_time: Date }) {
      return match.status === 0 && new Date() < match.match_time;
  }

  // 给前端吐出的通用赛程列表
  async getLiveMatches(yearStr?: string) {
      const year = yearStr ? parseInt(yearStr, 10) : null;
      const whereClause = year ? {
          match_time: {
              gte: new Date(`${year}-01-01T00:00:00Z`),
              lte: new Date(`${year}-12-31T23:59:59Z`),
          }
      } : {};

      const matches = await this.prisma.match.findMany({
          where: whereClause,
          orderBy: { match_time: 'asc' },
          include: {
              home_team: true,
              away_team: true,
              events: true
          }
      });

      return matches.map(m => {
          let statusText = '待开始';
          if (m.status === 1) statusText = '进行中';
          else if (m.status === 2) statusText = '已完结';
          const homeName = m.home_team?.name || '未知主队';
          const awayName = m.away_team?.name || '未知客队';

          return {
              id: String(m.id),
              round: this.getRoundLabel(m.match_time, homeName, awayName),
              datetime: m.match_time.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
              location: this.getVenueLabel(m.match_time, homeName, awayName, m.venue),
              status: statusText,
              homeTeamId: String(m.home_team_id),
              homeTeam: homeName,
              awayTeamId: String(m.away_team_id),
              awayTeam: awayName,
              homePossession: m.possession_rate_home || 50,
              awayPossession: m.possession_rate_away || (100 - (m.possession_rate_home || 50)),
              homeShots: m.shot_count_home || 0,
              awayShots: m.shot_count_away || 0,
              homeLogoColor: m.home_team?.logo_url || '#008000',
              awayLogoColor: m.away_team?.logo_url || '#cc6b2c',
              score: `${m.home_score}-${m.away_score}`,
              homePenalties: m.penalty_count_home,
              awayPenalties: m.penalty_count_away,
              canGuess: this.canGuessMatch(m),
              timestamp: m.match_time.toISOString()
          };
      });
  }

  async getGuessableMatches() {
      const matches = await this.prisma.match.findMany({
          where: {
              status: 0,
              match_time: { gt: new Date() }
          },
          orderBy: { match_time: 'asc' },
          include: {
              home_team: true,
              away_team: true,
              guesses: {
                  select: { id: true, guess_result: true, user_id: true, isCorrect: true }
              }
          }
      });

      return matches.map(match => ({
          id: String(match.id),
          round: this.getRoundLabel(match.match_time, match.home_team?.name, match.away_team?.name),
          datetime: match.match_time.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
          location: this.getVenueLabel(match.match_time, match.home_team?.name, match.away_team?.name, match.venue),
          status: '未开始',
          canGuess: true,
          homeTeamId: String(match.home_team_id),
          homeTeam: match.home_team?.name || '未知主队',
          awayTeamId: String(match.away_team_id),
          awayTeam: match.away_team?.name || '未知客队',
          score: `${match.home_score}-${match.away_score}`,
          guessStats: {
              HOME_WIN: match.guesses.filter(g => g.guess_result === 'HOME_WIN').length,
              DRAW: match.guesses.filter(g => g.guess_result === 'DRAW').length,
              AWAY_WIN: match.guesses.filter(g => g.guess_result === 'AWAY_WIN').length,
          },
          totalGuesses: match.guesses.length,
          timestamp: match.match_time.toISOString(),
      }));
  }

  // 返回2026赛季未开赛的比赛（优先从数据库，兜底用SCHEDULE_2026静态表）
  async getUpcoming2026Matches() {
      const now = new Date();
      const end2026 = new Date('2026-12-31T23:59:59Z');

      // 先查数据库中2026年未开赛的比赛
      const dbMatches = await this.prisma.match.findMany({
          where: {
              status: 0,
              match_time: { gte: now, lte: end2026 },
          },
          orderBy: { match_time: 'asc' },
          include: { home_team: true, away_team: true },
          take: 30,
      });

      if (dbMatches.length > 0) {
          return dbMatches.map(m => ({
              id: String(m.id),
              round: this.getRoundLabel(m.match_time, m.home_team?.name, m.away_team?.name),
              date: m.match_time.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit' }).replace('/', '月').replace('/', '日'),
              time: m.match_time.toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit' }),
              homeTeam: m.home_team?.name || '未知主队',
              awayTeam: m.away_team?.name || '未知客队',
              venue: this.getVenueLabel(m.match_time, m.home_team?.name, m.away_team?.name, m.venue),
              timestamp: m.match_time.toISOString(),
              season: '2026',
          }));
      }

      // 兜底：从静态赛程表中取未来的比赛
      const upcoming = SCHEDULE_2026
          .filter(s => {
              const d = new Date(s.date + 'T12:00:00+08:00');
              return d > now;
          })
          .slice(0, 20);

      // 按轮次分组，每轮最多取前3场
      const byRound = new Map<string, typeof upcoming>();
      for (const s of upcoming) {
          if (!byRound.has(s.week)) byRound.set(s.week, []);
          const arr = byRound.get(s.week)!;
          if (arr.length < 4) arr.push(s);
      }

      const result: any[] = [];
      let id = 9001;
      for (const [round, games] of byRound) {
          for (const g of games) {
              result.push({
                  id: String(id++),
                  round,
                  date: g.date.slice(5).replace('-', '月') + '日',
                  time: '19:30',
                  homeTeam: g.home,
                  awayTeam: g.away,
                  venue: g.venue,
                  timestamp: new Date(g.date + 'T11:30:00Z').toISOString(),
                  season: '2026',
              });
          }
      }
      return result;
  }

  // AI预测：基于积分榜+历史对阵+近期状态计算胜率
  async getPrediction(homeTeamName: string, awayTeamName: string, year: string) {
      const normalizedHome = this.normalizeTeamName(homeTeamName);
      const normalizedAway = this.normalizeTeamName(awayTeamName);

      // 优先用当年积分榜，若数据不足则降级到2025赛季
      let standings = await this.getStandings(year);
      const homeInYear = standings.find(s => s.teamName === normalizedHome || s.teamName === homeTeamName);
      const awayInYear = standings.find(s => s.teamName === normalizedAway || s.teamName === awayTeamName);

      // 2026赛季早期数据不足（积分全为0），降级到2025
      const hasRealData = standings.some(s => s.played > 0);
      if (!hasRealData || (!homeInYear?.played && !awayInYear?.played)) {
          standings = await this.getStandings('2025');
      }

      const home = standings.find(s => s.teamName === normalizedHome || s.teamName === homeTeamName);
      const away = standings.find(s => s.teamName === normalizedAway || s.teamName === awayTeamName);

      // 如果找不到球队数据，返回均等预测
      if (!home || !away) {
          return {
              homeWinPct: 40, drawPct: 25, awayWinPct: 35,
              homeStrength: 50, awayStrength: 50,
              homeStats: { points: 0, wins: 0, draws: 0, losses: 0, goals: 0, conceded: 0 },
              awayStats: { points: 0, wins: 0, draws: 0, losses: 0, goals: 0, conceded: 0 },
              factors: [],
              prediction: 'draw',
              confidence: 40,
          };
      }

      // 计算综合实力分（满分100）
      // 各项权重：积分40 + 胜率25 + 进球15 + 净胜球10 + 主场加成10 = 100分满分
      const maxPoints = Math.max(...standings.map(s => s.points), 1);
      const maxGf = Math.max(...standings.map(s => s.gf), 1);
      const maxGd = Math.max(...standings.map(s => s.gd), 1);

      const homeStrength = Math.round(Math.min(Math.max(
          (home.points / maxPoints) * 40 +
          (home.won / Math.max(home.played, 1)) * 25 +
          (home.gf / maxGf) * 15 +
          (home.gd > 0 ? Math.min(home.gd / Math.max(maxGd, 1), 1) : 0) * 10 +
          10, // 主场优势固定加成
      10), 99));

      const awayStrength = Math.round(Math.min(Math.max(
          (away.points / maxPoints) * 40 +
          (away.won / Math.max(away.played, 1)) * 25 +
          (away.gf / maxGf) * 15 +
          (away.gd > 0 ? Math.min(away.gd / Math.max(maxGd, 1), 1) : 0) * 10,
      5), 89)); // 客队无主场加成，上限89

      // 基于ELO思路计算胜率
      const diff = homeStrength - awayStrength;
      const homeWinBase = 1 / (1 + Math.pow(10, -diff / 25));
      const homeAdv = 0.06; // 主场优势约6%
      const homeWinPct = Math.round(Math.min(Math.max((homeWinBase + homeAdv) * 100, 15), 75));
      const awayWinPct = Math.round(Math.min(Math.max((1 - homeWinBase - homeAdv - 0.22) * 100, 10), 65));
      const drawPct = 100 - homeWinPct - awayWinPct;

      // 分析关键因素
      const factors: { label: string; home: number; away: number; winner: 'home' | 'away' | 'draw' }[] = [
          {
              label: '积分',
              home: home.points,
              away: away.points,
              winner: home.points > away.points ? 'home' : home.points < away.points ? 'away' : 'draw',
          },
          {
              label: '胜率',
              home: Math.round((home.won / Math.max(home.played, 1)) * 100),
              away: Math.round((away.won / Math.max(away.played, 1)) * 100),
              winner: home.won / Math.max(home.played, 1) > away.won / Math.max(away.played, 1) ? 'home' : 'away',
          },
          {
              label: '进球数',
              home: home.gf,
              away: away.gf,
              winner: home.gf > away.gf ? 'home' : home.gf < away.gf ? 'away' : 'draw',
          },
          {
              label: '净胜球',
              home: home.gd,
              away: away.gd,
              winner: home.gd > away.gd ? 'home' : home.gd < away.gd ? 'away' : 'draw',
          },
          {
              label: '失球数',
              home: home.ga,
              away: away.ga,
              winner: home.ga < away.ga ? 'home' : home.ga > away.ga ? 'away' : 'draw',
          },
      ];

      const prediction = homeWinPct >= awayWinPct && homeWinPct >= drawPct
          ? 'home'
          : awayWinPct >= homeWinPct && awayWinPct >= drawPct
          ? 'away'
          : 'draw';

      const confidence = Math.max(homeWinPct, drawPct, awayWinPct);

      return {
          homeWinPct,
          drawPct,
          awayWinPct,
          homeStrength,
          awayStrength,
          homeStats: { points: home.points, wins: home.won, draws: home.drawn, losses: home.lost, goals: home.gf, conceded: home.ga },
          awayStats: { points: away.points, wins: away.won, draws: away.drawn, losses: away.lost, goals: away.gf, conceded: away.ga },
          factors: factors.map(f => ({ label: f.label, homeValue: f.home, awayValue: f.away, winner: f.winner })),
          prediction,
          confidence,
      };
  }

  async getMatchById(id: string) {
      const match = await this.prisma.match.findUnique({
          where: { id: parseInt(id, 10) },
          include: {
              home_team: true,
              away_team: true,
              events: { orderBy: { minute: 'asc' } },
              textLives: { orderBy: { createdAt: 'desc' } },
              lineupEntries: {
                  include: { player: true, team: true },
                  orderBy: [{ side: 'asc' }, { display_order: 'asc' }]
              },
              guesses: {
                  include: {
                      user: {
                          select: { id: true, username: true, avatar_url: true }
                      }
                  },
                  orderBy: { createdAt: 'desc' }
              }
          }
      });

      if (!match) return null;

      let statusText = '未开始';
      if (match.status === 1) statusText = '进行中';
      else if (match.status === 2) statusText = '已完结';
      const homeName = match.home_team?.name || '未知主队';
      const awayName = match.away_team?.name || '未知客队';
      const parsedLineupHome = this.completeLineupOrNull(this.parseJson(match.lineup_home));
      const parsedLineupAway = this.completeLineupOrNull(this.parseJson(match.lineup_away));
      const sanitizedLineups = this.sanitizeLineupPairForDisplay(parsedLineupHome, parsedLineupAway);
      const totalGuesses = match.guesses?.length || 0;
      const guessStats = {
          HOME_WIN: match.guesses?.filter(g => g.guess_result === 'HOME_WIN').length || 0,
          DRAW: match.guesses?.filter(g => g.guess_result === 'DRAW').length || 0,
          AWAY_WIN: match.guesses?.filter(g => g.guess_result === 'AWAY_WIN').length || 0,
      };
      const events =
          match.events && match.events.length
              ? match.events
              : this.synthesizeEventsFromTextLives(match.textLives || [], homeName, awayName);
      const displayEvents = events.map((event: any) => this.normalizeEventForDisplay(event, homeName, awayName));

      return {
          id: String(match.id),
          round: this.getRoundLabel(match.match_time, homeName, awayName),
          datetime: match.match_time.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
          location: this.getVenueLabel(match.match_time, homeName, awayName, match.venue),
          status: statusText,
          homeTeamId: String(match.home_team_id),
          homeTeam: homeName,
          awayTeamId: String(match.away_team_id),
          awayTeam: awayName,
          homePossession: match.possession_rate_home || 50,
          awayPossession: match.possession_rate_away || (100 - (match.possession_rate_home || 50)),
          homeShots: match.shot_count_home || 0,
          awayShots: match.shot_count_away || 0,
          homeAttack: match.attack_home || 0,
          awayAttack: match.attack_away || 0,
          homeDangerousAttack: match.dangerous_attack_home || 0,
          awayDangerousAttack: match.dangerous_attack_away || 0,
          homeShotsOnTarget: match.shots_on_target_home || 0,
          awayShotsOnTarget: match.shots_on_target_away || 0,
          homeShotsOffTarget: match.shots_off_target_home || 0,
          awayShotsOffTarget: match.shots_off_target_away || 0,
          homeCorners: match.corner_count_home || 0,
          awayCorners: match.corner_count_away || 0,
          homePenalties: match.penalty_count_home || 0,
          awayPenalties: match.penalty_count_away || 0,
          homeYellowCards: match.yellow_card_home || 0,
          awayYellowCards: match.yellow_card_away || 0,
          homeRedCards: match.red_card_home || 0,
          awayRedCards: match.red_card_away || 0,
          referee: (parsedLineupHome as any)?.referee || (parsedLineupAway as any)?.referee || null,
          lineupHome: sanitizedLineups.home,
          lineupAway: sanitizedLineups.away,
          lineupEntries: match.lineupEntries || [],
          guessStats,
          totalGuesses,
          guesses: match.guesses?.map((guess) => ({
              id: String(guess.id),
              userId: String(guess.user_id),
              username: guess.user?.username || null,
              avatarUrl: guess.user?.avatar_url || null,
              guessResult: guess.guess_result,
              status: guess.status,
              isCorrect: guess.isCorrect,
              scoreCost: guess.score_cost,
              scoreReward: guess.score_reward,
              createdAt: guess.createdAt,
          })) || [],
          homeLogoColor: match.home_team?.logo_url || '#008000',
          awayLogoColor: match.away_team?.logo_url || '#cc6b2c',
          score: `${match.home_score}-${match.away_score}`,
          canGuess: this.canGuessMatch(match),
          timestamp: match.match_time.toISOString(),
          events: displayEvents,
          textLives: match.textLives || []
      };
  }

  // 动态聚合生成积分榜
  async getStandings(yearStr: string) {
      if (String(yearStr) === '2025') {
          return [
              { teamId: '2025-nantong', teamName: '南通队', logo: '#a50044', played: 12, won: 10, drawn: 2, lost: 0, gf: 29, ga: 6, goalsFor: 29, goalsAgainst: 6, gd: 23, points: 32 },
              { teamId: '2025-nanjing', teamName: '南京队', logo: '#0066b3', played: 12, won: 7, drawn: 3, lost: 2, gf: 25, ga: 11, goalsFor: 25, goalsAgainst: 11, gd: 14, points: 24 },
              { teamId: '2025-xuzhou', teamName: '徐州队', logo: '#8a2be2', played: 12, won: 6, drawn: 5, lost: 1, gf: 17, ga: 11, goalsFor: 17, goalsAgainst: 11, gd: 6, points: 23 },
              { teamId: '2025-yancheng', teamName: '盐城队', logo: '#4682b4', played: 12, won: 7, drawn: 1, lost: 4, gf: 22, ga: 13, goalsFor: 22, goalsAgainst: 13, gd: 9, points: 22 },
              { teamId: '2025-wuxi', teamName: '无锡队', logo: '#f7b731', played: 12, won: 5, drawn: 4, lost: 3, gf: 18, ga: 12, goalsFor: 18, goalsAgainst: 12, gd: 6, points: 19 },
              { teamId: '2025-taizhou', teamName: '泰州队', logo: '#ff4500', played: 12, won: 5, drawn: 3, lost: 4, gf: 16, ga: 17, goalsFor: 16, goalsAgainst: 17, gd: -1, points: 18 },
              { teamId: '2025-lianyungang', teamName: '连云港队', logo: '#20b2aa', played: 12, won: 5, drawn: 3, lost: 4, gf: 15, ga: 17, goalsFor: 15, goalsAgainst: 17, gd: -2, points: 18 },
              { teamId: '2025-huaian', teamName: '淮安队', logo: '#d2691e', played: 12, won: 4, drawn: 4, lost: 4, gf: 14, ga: 10, goalsFor: 14, goalsAgainst: 10, gd: 4, points: 16 },
              { teamId: '2025-suqian', teamName: '宿迁队', logo: '#2e8b57', played: 12, won: 4, drawn: 3, lost: 5, gf: 14, ga: 18, goalsFor: 14, goalsAgainst: 18, gd: -4, points: 15 },
              { teamId: '2025-suzhou', teamName: '苏州队', logo: '#c91a1a', played: 12, won: 3, drawn: 5, lost: 4, gf: 18, ga: 16, goalsFor: 18, goalsAgainst: 16, gd: 2, points: 14 },
              { teamId: '2025-yangzhou', teamName: '扬州队', logo: '#9acd32', played: 12, won: 2, drawn: 1, lost: 9, gf: 8, ga: 23, goalsFor: 8, goalsAgainst: 23, gd: -15, points: 7 },
              { teamId: '2025-changzhou', teamName: '常州队', logo: '#ff8c00', played: 12, won: 1, drawn: 2, lost: 9, gf: 5, ga: 24, goalsFor: 5, goalsAgainst: 24, gd: -19, points: 5 },
              { teamId: '2025-zhenjiang', teamName: '镇江队', logo: '#5f9ea0', played: 12, won: 1, drawn: 0, lost: 11, gf: 6, ga: 29, goalsFor: 6, goalsAgainst: 29, gd: -23, points: 3 },
          ];
      }

      const year = parseInt(yearStr, 10) || new Date().getFullYear();
      const startOfYear = new Date(`${year}-01-01T00:00:00Z`);
      const endOfYear = new Date(`${year}-12-31T23:59:59Z`);

      const teams = await this.prisma.team.findMany();
      const matches = await this.prisma.match.findMany({
          where: {
              status: 2, 
              match_time: {
                  gte: startOfYear,
                  lte: endOfYear
              }
          }
      });

      const standings = teams.map(team => {
          const stats = {
              teamId: String(team.id),
              teamName: team.name,
              logo: team.logo_url || '#008000',
              played: 0,
              won: 0,
              drawn: 0,
              lost: 0,
              gf: 0,
              ga: 0,
              gd: 0,
              points: 0
          };

          matches.forEach(m => {
              if (m.home_team_id === team.id) {
                  stats.played++;
                  stats.gf += m.home_score;
                  stats.ga += m.away_score;
                  if (m.home_score > m.away_score) { stats.won++; stats.points += 3; }
                  else if (m.home_score === m.away_score) { stats.drawn++; stats.points += 1; }
                  else stats.lost++;
              } else if (m.away_team_id === team.id) {
                  stats.played++;
                  stats.gf += m.away_score;
                  stats.ga += m.home_score;
                  if (m.away_score > m.home_score) { stats.won++; stats.points += 3; }
                  else if (m.away_score === m.home_score) { stats.drawn++; stats.points += 1; }
                  else stats.lost++;
              }
          });

          stats.gd = stats.gf - stats.ga;
          return { ...stats, goalsFor: stats.gf, goalsAgainst: stats.ga };
      });

      return standings.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
  }

  // 射手榜 (基于 MatchEvent 统计)
  async getPlayerRankings(yearStr: string) {
      return this.getPlayerCategoryRankings(yearStr, 'goals');
  }

  async syncPlayerRankings(payload: any) {
      const season = String(payload.season || new Date().getFullYear());
      const category = String(payload.category || 'goals');
      const rows = Array.isArray(payload.rows) ? payload.rows : [];

      for (const row of rows) {
          const team = row.team || row.teamName ? await this.fetchOrCreateTeam(row.team || row.teamName) : null;
          const player = await this.upsertPlayer({
              name: row.name || row.playerName,
              teamId: team?.id,
              avatarUrl: row.avatarUrl || row.avatar_url,
              externalSource: row.externalSource || 'dongqiudi',
              externalId: row.externalId || row.external_id,
          });
          if (!player) continue;

          await this.prisma.playerRanking.upsert({
              where: {
                  uk_player_ranking_identity: {
                      season,
                      category,
                      player_name: player.name,
                      team_name: team?.name || row.team || row.teamName || '',
                  },
              },
              update: {
                  rank: Number(row.rank || 0),
                  player_id: player.id,
                  team_id: team?.id,
                  avatar_url: row.avatarUrl || row.avatar_url || player.avatar_url,
                  value: Number(row.value || row.goals || row.count || 0),
                  source: payload.source || 'dongqiudi',
              },
              create: {
                  season,
                  category,
                  rank: Number(row.rank || 0),
                  player_id: player.id,
                  player_name: player.name,
                  team_id: team?.id,
                  team_name: team?.name || row.team || row.teamName || '',
                  avatar_url: row.avatarUrl || row.avatar_url || player.avatar_url,
                  value: Number(row.value || row.goals || row.count || 0),
                  source: payload.source || 'dongqiudi',
              },
          });
      }

      return { success: true, count: rows.length };
  }

  async syncTeamRankings(payload: any) {
      const season = String(payload.season || new Date().getFullYear());
      const category = String(payload.category || 'goals_for');
      const rows = Array.isArray(payload.rows) ? payload.rows : [];

      for (const row of rows) {
          const team = await this.fetchOrCreateTeam(row.team || row.teamName);
          await this.prisma.teamRanking.upsert({
              where: {
                  uk_team_ranking_identity: {
                      season,
                      category,
                      team_name: team.name,
                  },
              },
              update: {
                  rank: Number(row.rank || 0),
                  team_id: team.id,
                  value: Number(row.value || row.count || 0),
                  source: payload.source || 'dongqiudi',
              },
              create: {
                  season,
                  category,
                  rank: Number(row.rank || 0),
                  team_id: team.id,
                  team_name: team.name,
                  value: Number(row.value || row.count || 0),
                  source: payload.source || 'dongqiudi',
              },
          });
      }

      return { success: true, count: rows.length };
  }

  async syncTeamRosters(payload: any) {
      const teams = Array.isArray(payload.teams) ? payload.teams : [];
      let playerCount = 0;

      for (const item of teams) {
          const teamName = item.teamName || item.name;
          if (!teamName) continue;
          const team = await this.fetchOrCreateTeam(teamName);
          const logoUrl = item.logoUrl || item.logo || undefined;
          if (logoUrl && team.logo_url !== logoUrl) {
              await this.prisma.team.update({ where: { id: team.id }, data: { logo_url: logoUrl } });
          }

          const players = Array.isArray(item.players) ? item.players : [];
          for (const row of players) {
              const player = await this.upsertPlayer({
                  name: row.name || row.playerName,
                  teamId: team.id,
                  position: row.position || null,
                  jerseyNumber: row.number || row.jerseyNumber || null,
                  avatarUrl: row.avatarUrl || row.avatar || null,
                  externalSource: row.externalSource || payload.source || 'baidu',
                  externalId: row.externalId || row.playerId || null,
              });
              if (player) playerCount++;
          }
      }

      return { success: true, teams: teams.length, players: playerCount };
  }

  async getTeamRosters() {
      const teams = await this.prisma.team.findMany({
          include: {
              players: {
                  where: { is_coach: false },
                  orderBy: [{ position: 'asc' }, { jersey_number: 'asc' }, { name: 'asc' }],
              },
          },
      });

      return teams
          .filter(team => this.isJiangsuCityTeam(team.name))
          .map(team => {
              const players = team.players.map(player => ({
                  id: String(player.id),
                  name: player.name,
                  position: player.position || '未分组',
                  number: player.jersey_number,
                  avatarUrl: player.avatar_url,
                  externalSource: player.external_source,
                  externalId: player.external_id,
              }));
              const positionSummary = players.reduce((acc: Record<string, number>, player) => {
                  acc[player.position] = (acc[player.position] || 0) + 1;
                  return acc;
              }, {});

              return {
                  id: String(team.id),
                  name: team.name,
                  city: team.city,
                  logoUrl: team.logo_url,
                  rosterSize: players.length,
                  positionSummary,
                  players,
              };
          })
          .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  }

  async getPlayerCategoryRankings(yearStr: string, category = 'goals') {
      const season = String(parseInt(yearStr, 10) || new Date().getFullYear());
      let stored: Array<{ player_name: string; team_name: string | null; value: number; avatar_url: string | null; rank: number; category: string }> = [];
      try {
          stored = await this.prisma.playerRanking.findMany({
              where: { season, category },
              orderBy: [{ rank: 'asc' }, { value: 'desc' }],
              take: 80,
          });
      } catch (error) {
          if (!this.isMissingOptionalTableError(error)) throw error;
      }

      if (stored.length > 0) {
          return stored.map(row => ({
              name: row.player_name,
              team: row.team_name || '未知球队',
              value: row.value,
              goals: row.value,
              avatarUrl: row.avatar_url,
              rank: row.rank,
              category: row.category,
          }));
      }

      const year = parseInt(yearStr, 10) || new Date().getFullYear();
      const startOfYear = new Date(`${year}-01-01T00:00:00Z`);
      const endOfYear = new Date(`${year}-12-31T23:59:59Z`);
      const eventTypeMap: Record<string, string> = {
          goals: 'goal',
          yellow_cards: 'yellow_card',
          red_cards: 'red_card',
          penalties: 'penalty',
      };
      const eventType = eventTypeMap[category] || 'goal';

      const events = await this.prisma.matchEvent.findMany({
          where: {
              event_type: eventType,
              match: {
                  match_time: {
                      gte: startOfYear,
                      lte: endOfYear
                  }
              }
          },
          include: {
              match: {
                  include: {
                      home_team: true,
                      away_team: true
                  }
              }
          }
      });

      const playerMap = new Map();

      events.forEach(ev => {
          const playerName = ev.player;
          if (playerName === '未知球员') return;

          const match = ev.match;
          const teamName = ev.team_type === 'home' ? match.home_team?.name : match.away_team?.name;

          if (!playerMap.has(playerName)) {
              playerMap.set(playerName, {
                  name: playerName,
                  team: teamName || '未知球队',
                  value: 0,
                  goals: 0,
              });
          }
          const stats = playerMap.get(playerName);
          stats.value += 1;
          stats.goals = stats.value;
      });

      return Array.from(playerMap.values()).sort((a, b) => b.value - a.value);
  }

  async getTeamCategoryRankings(yearStr: string, category = 'goals_for') {
      const season = String(parseInt(yearStr, 10) || new Date().getFullYear());
      let stored: Array<{ team_id: number | null; team_name: string; value: number; rank: number; category: string }> = [];
      try {
          stored = await this.prisma.teamRanking.findMany({
              where: { season, category },
              orderBy: [{ rank: 'asc' }, { value: 'desc' }],
              take: 80,
          });
      } catch (error) {
          if (!this.isMissingOptionalTableError(error)) throw error;
      }

      if (stored.length > 0 && !['goals_for', 'goals_against'].includes(category)) {
          return stored.map(row => ({
              teamId: String(row.team_id || ''),
              teamName: row.team_name,
              value: row.value,
              rank: row.rank,
              category: row.category,
          }));
      }

      const year = parseInt(yearStr, 10) || new Date().getFullYear();
      const startOfYear = new Date(`${year}-01-01T00:00:00Z`);
      const endOfYear = new Date(`${year}-12-31T23:59:59Z`);
      const teams = await this.prisma.team.findMany();
      const matches = await this.prisma.match.findMany({
          where: {
              status: 2,
              match_time: { gte: startOfYear, lte: endOfYear },
          },
      });

      const rows = teams.map(team => {
          const row = { teamId: String(team.id), teamName: team.name, value: 0, category };
          for (const match of matches) {
              const isHome = match.home_team_id === team.id;
              const isAway = match.away_team_id === team.id;
              if (!isHome && !isAway) continue;
              const own = (homeValue: number | null | undefined, awayValue: number | null | undefined) => isHome ? (homeValue || 0) : (awayValue || 0);
              const against = (homeValue: number | null | undefined, awayValue: number | null | undefined) => isHome ? (awayValue || 0) : (homeValue || 0);

              if (category === 'goals_for') row.value += own(match.home_score, match.away_score);
              else if (category === 'goals_against') row.value += against(match.home_score, match.away_score);
              else if (category === 'yellow_cards') row.value += own(match.yellow_card_home, match.yellow_card_away);
              else if (category === 'red_cards') row.value += own(match.red_card_home, match.red_card_away);
              else if (category === 'penalties') row.value += own(match.penalty_count_home, match.penalty_count_away);
              else if (category === 'shots') row.value += own(match.shot_count_home, match.shot_count_away);
              else if (category === 'shots_on_target') row.value += own(match.shots_on_target_home, match.shots_on_target_away);
              else if (category === 'corners') row.value += own(match.corner_count_home, match.corner_count_away);
          }
          return row;
      });

      return rows.sort((a, b) => b.value - a.value);
  }
}
