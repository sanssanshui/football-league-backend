import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(keyword: string, type?: 'match' | 'team' | 'player') {
    const searchKeyword = keyword.trim();

    const matchPromise = type && type !== 'match'
      ? Promise.resolve([])
      : this.prisma.match.findMany({
          where: {
            OR: [
              { home_team: { name: { contains: searchKeyword } } },
              { away_team: { name: { contains: searchKeyword } } },
            ],
          },
          include: {
            home_team: true,
            away_team: true,
          },
          orderBy: { match_time: 'desc' },
          take: 50,
        });

    const teamPromise = type && type !== 'team'
      ? Promise.resolve([])
      : this.prisma.team.findMany({
          where: {
            OR: [
              { name: { contains: searchKeyword } },
              { city: { contains: searchKeyword } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });

    const playerPromise = type && type !== 'player'
      ? Promise.resolve([])
      : this.prisma.player.findMany({
          where: {
            OR: [
              { name: { contains: searchKeyword } },
              { position: { contains: searchKeyword } },
            ],
          },
          include: { team: true },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });

    const [matches, teams, players] = await Promise.all([
      matchPromise,
      teamPromise,
      playerPromise,
    ]);

    return {
      matches: matches.map((match) => ({
        id: match.id,
        match_time: match.match_time,
        status: match.status,
        home_score: match.home_score,
        away_score: match.away_score,
        home_team: match.home_team?.name || null,
        away_team: match.away_team?.name || null,
      })),
      teams: teams.map((team) => ({
        id: team.id,
        name: team.name,
        city: team.city,
        logo_url: team.logo_url,
      })),
      players: players.map((player) => ({
        id: player.id,
        name: player.name,
        position: player.position,
        jersey_number: player.jersey_number,
        team: player.team
          ? { id: player.team.id, name: player.team.name }
          : null,
      })),
    };
  }
}
