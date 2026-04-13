import { Authentication } from '@/shared/microservices/auth/authentication/entities/entity';
import { AuthorizationUserRoleKey } from '@/shared/microservices/auth/authorization/decorators/user/role/decorator';
import { UserRole } from '@/shared/microservices/auth/users/enums/enum';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AuthorizationUserRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  // * Проверка наличия роли у пользователя
  canActivate(context: ExecutionContext): boolean {
    // 1. Получаем требуемые роли для данного маршрута/контроллера
    const requiredRoles = this.readRequiredRoles(context);

    // 2. Читаем объект auth из request
    const request = this.readRequest(context);

    // 3. Читаем пользователя из объекта auth
    const user = this.readUser(request);

    // 4. Проверяем, есть ли у пользователя необходимая роль
    this.checkUserRole(requiredRoles, user);

    return true;
  }

  // 1. Читаем роли
  private readRequiredRoles(context: ExecutionContext): UserRole[] {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      AuthorizationUserRoleKey,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return [];
    }

    return requiredRoles;
  }

  // 2. Читаем request
  private readRequest(context: ExecutionContext): any {
    return context.switchToHttp().getRequest();
  }

  // 3. Читаем пользователя из объекта auth
  private readUser(request: any): NonNullable<Authentication['user']> {
    const user = request.authentication?.user;

    if (!user) {
      throw new UnauthorizedException('Необходимо авторизоваться');
    }

    return user;
  }

  // 4. Проверяем, есть ли у пользователя необходимая роль
  private checkUserRole(
    requiredRoles: UserRole[],
    user: NonNullable<Authentication['user']>,
  ): boolean {
    if (requiredRoles.length === 0) {
      return true;
    }

    const hasRole = requiredRoles.includes(user.role as UserRole);

    if (!hasRole) {
      throw new ForbiddenException(
        'Недостаточно прав для выполнения этого действия',
      );
    }

    return true;
  }
}
