import { Resolver, Query, Args } from '@nestjs/graphql';
import { MatchType } from './match.type';
import { MatchService } from './match.service';

@Resolver(() => MatchType)
export class MatchResolver {
  constructor(private matchService: MatchService) {}

  @Query(() => [MatchType])
  async getMatchesBySeason(@Args('season', { type: () => String, nullable: true }) season: string) {
    // 基础的业务桥接：如果前端传 2025、2026 我们可以在这里做拦截
    // 目前无论如何，直接返回底层的 Live Matches 作为所有的数据总集
    const payload = await this.matchService.getLiveMatches() || [];
    
    // 如果想要进行真实的数据过滤可以在这对 payload 进行 year 拦截
    if (season === '2025') {
        return payload.filter((p: any) => new Date(p.timestamp).getFullYear() === 2025);
    } else if (season === '2026') {
        return payload.filter((p: any) => new Date(p.timestamp).getFullYear() === 2026);
    }
    return payload; // 默认返回全部
  }
}
