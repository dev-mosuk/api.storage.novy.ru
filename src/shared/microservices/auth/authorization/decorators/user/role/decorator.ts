import { UserRole } from '@/shared/microservices/auth/users/enums/enum';
import { SetMetadata } from '@nestjs/common';

export const AuthorizationUserRoleKey = 'authorization_user_role';

// * Установка разрешенных ролей для маршрута
export const AuthorizationUserRoleDecorator = (...roles: UserRole[]) =>
  SetMetadata(AuthorizationUserRoleKey, roles);
