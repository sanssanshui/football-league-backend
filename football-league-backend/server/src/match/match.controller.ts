import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { MatchService } from './match.service';

@Controller('api/matches')
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  // 前端获取全部赛事 (可使用 GraphQL 继续演进)
  @Get()
  async getMatches(@Query('year') year?: string) {
    return {
      code: 200,
      data: await this.matchService.getLiveMatches(year)
    };
  }

  // 积分榜
  @Get('standings/:year')
  async getStandings(@Param('year') year: string) {
    return {
      code: 200,
      data: await this.matchService.getStandings(year)
    };
  }

  // 射手榜
  @Get('players/ranking/:year')
  async getPlayerRankings(@Param('year') year: string) {
    return {
      code: 200,
      data: await this.matchService.getPlayerRankings(year)
    };
  }

  @Get('players/ranking/:year/:category')
  async getPlayerCategoryRankings(@Param('year') year: string, @Param('category') category: string) {
    return {
      code: 200,
      data: await this.matchService.getPlayerCategoryRankings(year, category)
    };
  }

  @Get('teams/ranking/:year/:category')
  async getTeamCategoryRankings(@Param('year') year: string, @Param('category') category: string) {
    return {
      code: 200,
      data: await this.matchService.getTeamCategoryRankings(year, category)
    };
  }

  @Get('teams/rosters')
  async getTeamRosters() {
    return {
      code: 200,
      data: await this.matchService.getTeamRosters()
    };
  }

  // 竞猜比赛列表（互动区直接使用）
  @Get('guessable/list')
  async getGuessableMatches() {
    return {
      code: 200,
      data: await this.matchService.getGuessableMatches()
    };
  }

  // 2026赛季未开赛比赛列表（竞猜+预测专用）
  @Get('upcoming/2026')
  async getUpcoming2026() {
    return {
      code: 200,
      data: await this.matchService.getUpcoming2026Matches()
    };
  }

  // AI预测接口
  @Get('prediction/:homeTeam/:awayTeam')
  async getPrediction(
    @Param('homeTeam') homeTeam: string,
    @Param('awayTeam') awayTeam: string,
    @Query('year') year?: string,
  ) {
    const y = year || String(new Date().getFullYear());
    return {
      code: 200,
      data: await this.matchService.getPrediction(
        decodeURIComponent(homeTeam),
        decodeURIComponent(awayTeam),
        y,
      ),
    };
  }

  // 赛事详情
  @Get(':id')
  async getMatchById(@Param('id') id: string) {
    const data = await this.matchService.getMatchById(id);
    return {
      code: data ? 200 : 404,
      data: data || null,
      message: data ? 'ok' : 'Not found'
    };
  }

  // 供 Python 定时调用的自动同步黑盒口
  @Post('sync')
  async syncData(@Body() body: any) {
    return this.matchService.syncMatchData(body);
  }

  @Post('rankings/players/sync')
  async syncPlayerRankings(@Body() body: any) {
    return this.matchService.syncPlayerRankings(body);
  }

  @Post('rankings/teams/sync')
  async syncTeamRankings(@Body() body: any) {
    return this.matchService.syncTeamRankings(body);
  }

  @Post('teams/rosters/sync')
  async syncTeamRosters(@Body() body: any) {
    return this.matchService.syncTeamRosters(body);
  }
}
