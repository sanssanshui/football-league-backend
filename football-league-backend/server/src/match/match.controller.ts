import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { MatchService } from './match.service';

@Controller('api/matches')
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  // 前端获取全部赛事 (可使用 GraphQL 继续演进)
  @Get()
  async getMatches() {
    return {
      code: 200,
      data: await this.matchService.getLiveMatches()
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

  // 竞猜入口列表：前端互动区可以直接调用这个接口拿到可竞猜比赛
  @Get('guessable/list')
  async getGuessableMatches() {
    return {
      code: 200,
      data: await this.matchService.getGuessableMatches()
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
