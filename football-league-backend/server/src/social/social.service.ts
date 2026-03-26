import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';

const FRIEND_REQUEST_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
} as const;

@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  async followUser(currentUserId: number, targetUserId: number) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('不能关注自己');
    }

    return this.prisma.userFollow.create({
      data: {
        follower_id: currentUserId,
        following_id: targetUserId,
      },
    });
  }

  async unfollowUser(currentUserId: number, targetUserId: number) {
    return this.prisma.userFollow.delete({
      where: {
        uk_user_follow: {
          follower_id: currentUserId,
          following_id: targetUserId,
        },
      },
    });
  }

  async listFollowing(currentUserId: number) {
    const following = await this.prisma.userFollow.findMany({
      where: { follower_id: currentUserId },
      include: { following: true },
      orderBy: { createdAt: 'desc' },
    });

    return following.map((item: { following: { id: number; username: string; avatar_url: string | null } }) => ({
      id: item.following.id,
      username: item.following.username,
      avatar_url: item.following.avatar_url,
    }));
  }

  async listFollowers(currentUserId: number) {
    const followers = await this.prisma.userFollow.findMany({
      where: { following_id: currentUserId },
      include: { follower: true },
      orderBy: { createdAt: 'desc' },
    });

    return followers.map((item: { follower: { id: number; username: string; avatar_url: string | null } }) => ({
      id: item.follower.id,
      username: item.follower.username,
      avatar_url: item.follower.avatar_url,
    }));
  }

  async followTeam(currentUserId: number, teamId: number) {
    return this.prisma.userTeamFollow.create({
      data: {
        user_id: currentUserId,
        team_id: teamId,
      },
    });
  }

  async unfollowTeam(currentUserId: number, teamId: number) {
    return this.prisma.userTeamFollow.delete({
      where: {
        uk_user_team_follow: {
          user_id: currentUserId,
          team_id: teamId,
        },
      },
    });
  }

  async listFollowedTeams(currentUserId: number) {
    const teams = await this.prisma.userTeamFollow.findMany({
      where: { user_id: currentUserId },
      include: { team: true },
      orderBy: { createdAt: 'desc' },
    });

    return teams.map((item: { team: { id: number; name: string; city: string; logo_url: string | null } }) => ({
      id: item.team.id,
      name: item.team.name,
      city: item.team.city,
      logo_url: item.team.logo_url,
    }));
  }

  async sendFriendRequest(currentUserId: number, receiverId: number) {
    if (currentUserId === receiverId) {
      throw new BadRequestException('不能添加自己为好友');
    }

    const existingFriend = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { user_a_id: currentUserId, user_b_id: receiverId },
          { user_a_id: receiverId, user_b_id: currentUserId },
        ],
      },
    });

    if (existingFriend) {
      throw new BadRequestException('已经是好友');
    }

    return this.prisma.friendRequest.create({
      data: {
        sender_id: currentUserId,
        receiver_id: receiverId,
      },
    });
  }

  async listFriendRequests(currentUserId: number) {
    const incoming = await this.prisma.friendRequest.findMany({
      where: {
        receiver_id: currentUserId,
        status: FRIEND_REQUEST_STATUS.PENDING,
      },
      include: { sender: true },
      orderBy: { createdAt: 'desc' },
    });

    return incoming.map((item: { id: number; sender_id: number; sender: { username: string; avatar_url: string | null }; createdAt: Date }) => ({
      id: item.id,
      sender_id: item.sender_id,
      sender_name: item.sender.username,
      sender_avatar: item.sender.avatar_url,
      created_at: item.createdAt,
    }));
  }

  async acceptFriendRequest(currentUserId: number, requestId: number) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const request = await tx.friendRequest.findFirst({
        where: {
          id: requestId,
          receiver_id: currentUserId,
          status: FRIEND_REQUEST_STATUS.PENDING,
        },
      });

      if (!request) {
        throw new BadRequestException('申请不存在或已处理');
      }

      await tx.friendRequest.update({
        where: { id: requestId },
        data: { status: FRIEND_REQUEST_STATUS.ACCEPTED },
      });

      const userA = Math.min(request.sender_id, request.receiver_id);
      const userB = Math.max(request.sender_id, request.receiver_id);

      await tx.friend.create({
        data: {
          user_a_id: userA,
          user_b_id: userB,
        },
      });

      return { friend_id: request.id };
    });
  }

  async rejectFriendRequest(currentUserId: number, requestId: number) {
    const request = await this.prisma.friendRequest.findFirst({
      where: {
        id: requestId,
        receiver_id: currentUserId,
        status: FRIEND_REQUEST_STATUS.PENDING,
      },
    });

    if (!request) {
      throw new BadRequestException('申请不存在或已处理');
    }

    await this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: FRIEND_REQUEST_STATUS.REJECTED },
    });

    return { request_id: requestId };
  }

  async listFriends(currentUserId: number) {
    const friends = await this.prisma.friend.findMany({
      where: {
        OR: [{ user_a_id: currentUserId }, { user_b_id: currentUserId }],
      },
      include: {
        userA: true,
        userB: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return friends.map((item: { user_a_id: number; userA: { id: number; username: string; avatar_url: string | null }; userB: { id: number; username: string; avatar_url: string | null } }) => {
      const friend = item.user_a_id === currentUserId ? item.userB : item.userA;
      return {
        id: friend.id,
        username: friend.username,
        avatar_url: friend.avatar_url,
      };
    });
  }

  async getRelationStatus(currentUserId: number, targetUserId: number) {
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      throw new BadRequestException('user_id 参数无效');
    }

    if (currentUserId === targetUserId) {
      return {
        is_self: true,
        is_following: false,
        is_followed_by: false,
        is_friend: false,
        pending_request_sent: false,
        pending_request_received: false,
      };
    }

    const [following, followedBy, friend, pendingSent, pendingReceived] =
      await Promise.all([
        this.prisma.userFollow.findUnique({
          where: {
            uk_user_follow: {
              follower_id: currentUserId,
              following_id: targetUserId,
            },
          },
        }),
        this.prisma.userFollow.findUnique({
          where: {
            uk_user_follow: {
              follower_id: targetUserId,
              following_id: currentUserId,
            },
          },
        }),
        this.prisma.friend.findFirst({
          where: {
            OR: [
              { user_a_id: currentUserId, user_b_id: targetUserId },
              { user_a_id: targetUserId, user_b_id: currentUserId },
            ],
          },
        }),
        this.prisma.friendRequest.findFirst({
          where: {
            sender_id: currentUserId,
            receiver_id: targetUserId,
            status: FRIEND_REQUEST_STATUS.PENDING,
          },
        }),
        this.prisma.friendRequest.findFirst({
          where: {
            sender_id: targetUserId,
            receiver_id: currentUserId,
            status: FRIEND_REQUEST_STATUS.PENDING,
          },
        }),
      ]);

    return {
      is_self: false,
      is_following: Boolean(following),
      is_followed_by: Boolean(followedBy),
      is_friend: Boolean(friend),
      pending_request_sent: Boolean(pendingSent),
      pending_request_received: Boolean(pendingReceived),
    };
  }

  handlePrismaError(error: unknown) {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new BadRequestException('已存在记录');
      }
      if (error.code === 'P2025') {
        throw new BadRequestException('记录不存在');
      }
    }
    throw error;
  }
}
