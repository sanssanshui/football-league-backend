import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { NewsService } from './news.service';

@Controller('api/news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  async getNews(@Query('userId') userId?: string) {
    return {
      code: 200,
      data: await this.newsService.getLatestNews(userId ? parseInt(userId) : undefined)
    };
  }

  // 接收新闻爬虫数据的同步口
  @Post('sync')
  async syncNews(@Body() body: any) {
    return this.newsService.syncNewsData(body);
  }
}
