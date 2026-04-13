import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Authentication } from '@/shared/microservices/auth/authentication/entities/entity';

export const AuthenticationDecorator = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Authentication | undefined => {
    // Получаем аутентификацию из request
    const { authentication } = context.switchToHttp().getRequest();

    // Возвращаем аутентификацию
    return authentication;
  },
);
