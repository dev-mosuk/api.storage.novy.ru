import { User } from '@/shared/microservices/auth/users/entities/entity';

export class UserAvatar {
  user_id: number;
  path: string;

  // SubRelations

  user: User;
}
