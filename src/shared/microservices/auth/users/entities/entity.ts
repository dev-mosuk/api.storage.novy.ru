import { UserAvatar } from '@/shared/microservices/auth/users/entities/avatar/entity';
import {
  UserRole,
  UserStatus,
} from '@/shared/microservices/auth/users/enums/enum';

export class User {
  id: number;
  role: UserRole;
  status: UserStatus;
  login: string | null;
  name: string | null;
  phone: string;
  email: string;

  created_at: Date;
  deleted_at: Date | null;

  // SubRelations

  avatar: UserAvatar | null;
}
