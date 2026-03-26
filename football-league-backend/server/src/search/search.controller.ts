import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('api/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Query('keyword') keyword?: string,
    @Query('type') type?: 'match' | 'team' | 'player',
  ) {
    if (!keyword || !keyword.trim()) {
      return {
        code: 400,
        message: 'keyword is required',
        data: null,
      };
    }

    const data = await this.searchService.search(keyword, type);
    return {
      code: 200,
      message: '搜索成功',
      data,
    };
  }
}