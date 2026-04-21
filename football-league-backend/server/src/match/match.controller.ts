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
}
