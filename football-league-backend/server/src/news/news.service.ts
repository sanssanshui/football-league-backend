import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NewsService {
  constructor(private prisma: PrismaService) {}

  async getLatestNews(userId?: number) {
    if (userId) {
      // 获取用户关注的球队ID
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { focusTeams: true }
      });

      if (user && user.focusTeams.length > 0) {
        const focusTeamIds = user.focusTeams.map(t => t.id);
        
        // 优先获取与关注球队相关的新闻
        const focusedNews = await this.prisma.news.findMany({
          where: { team_id: { in: focusTeamIds } },
          orderBy: { createdAt: 'desc' },
          take: 5
        });

        // 补齐全站热门/最新新闻
        const otherNews = await this.prisma.news.findMany({
          where: { id: { notIn: focusedNews.map(n => n.id) } },
          orderBy: { createdAt: 'desc' },
          take: 10 - focusedNews.length
        });

        return [...focusedNews, ...otherNews];
      }
    }

    // 默认展示最新新闻
    return this.prisma.news.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
  }

  async syncNewsData(items: any[]) {
     let count = 0;
     for (const item of items) {
         const existing = await this.prisma.news.findFirst({
             where: { title: item.title }
         });
         if (!existing) {
             await this.prisma.news.create({
                 data: {
                     title: item.title,
                     content: item.content || item.title,
                     read_count: Math.floor(Math.random() * 500) + 100
                 }
             });
             count++;
         }
     }
     return { added: count };
  }
}
