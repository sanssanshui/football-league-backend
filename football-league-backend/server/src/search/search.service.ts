import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(keyword: string, type?: 'match' | 'team' | 'player') {
    const searchKeyword = keyword.trim();

    const matchPromise =
      type && type !== 'match'
        ? this.getEmptyMatches()
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

    const teamPromise =
      type && type !== 'team'
        ? this.getEmptyTeams()
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

    const playerPromise =
      type && type !== 'player'
        ? this.getEmptyPlayers()
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

    const [matches, teams, players] = await Promise.all([matchPromise, teamPromise, playerPromise]);

    return {
      matches: matches.map((match: { id: number; match_time: Date; status: number; home_score: number; away_score: number; home_team: { name: string } | null; away_team: { name: string } | null }) => ({
        id: match.id,
        match_time: match.match_time,
        status: match.status,
        home_score: match.home_score,
        away_score: match.away_score,
        home_team: match.home_team?.name || null,
        away_team: match.away_team?.name || null,
      })),
      teams: teams.map((team: { id: number; name: string; city: string; logo_url: string | null }) => ({
        id: team.id,
        name: team.name,
        city: team.city,
        logo_url: team.logo_url,
      })),
      players: players.map(
        (player: {
          id: number;
          name: string;
          position: string | null;
          jersey_number: number | null;
          team: { id: number; name: string } | null;
        }) => ({
          id: player.id,
          name: player.name,
          position: player.position,
          jersey_number: player.jersey_number,
          team: player.team ? { id: player.team.id, name: player.team.name } : null,
        }),
      ),
    };
  }

  private async getEmptyMatches() {
    return this.prisma.match.findMany({ where: { id: -1 }, include: { home_team: true, away_team: true } });
  }

  private async getEmptyTeams() {
    return this.prisma.team.findMany({ where: { id: -1 } });
  }

  private async getEmptyPlayers() {
    return this.prisma.player.findMany({ where: { id: -1 }, include: { team: true } });
  }
}
