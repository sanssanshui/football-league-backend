export type CreateRoomType = 'match' | 'team' | 'global';

export class CreateRoomDto {
  match_id!: number;
  name!: string;
  type?: CreateRoomType;
}
