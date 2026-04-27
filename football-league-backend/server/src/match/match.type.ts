import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class MatchEventType {
  @Field(() => Int)
  id: number;

  @Field()
  minute: string;

  @Field()
  team_type: string;

  @Field()
  event_type: string;

  @Field()
  player: string;

  @Field({ nullable: true })
  detail?: string;
}

@ObjectType()
export class MatchType {
  @Field(() => String)
  id: string;

  @Field()
  round: string;

  @Field()
  datetime: string;

  @Field()
  location: string;

  @Field()
  status: string;

  @Field()
  homeTeamId: string;

  @Field()
  homeTeam: string;

  @Field()
  awayTeamId: string;

  @Field()
  awayTeam: string;

  @Field(() => Float)
  homePossession: number;

  @Field(() => Float)
  awayPossession: number;

  @Field(() => Int)
  homeShots: number;

  @Field(() => Int)
  awayShots: number;

  @Field()
  homeLogoColor: string;

  @Field()
  awayLogoColor: string;

  @Field()
  score: string;

  @Field(() => Int, { nullable: true })
  homePenalties?: number;

  @Field(() => Int, { nullable: true })
  awayPenalties?: number;

  @Field()
  timestamp: string;

  @Field(() => [MatchEventType], { nullable: true })
  events?: MatchEventType[];
}
