import { Authentication } from '@/shared/microservices/auth/authentication/entities/entity';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';

@Injectable()
export class AuthenticationInterceptor
  implements NestInterceptor, OnModuleInit
{
  private secretKey: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    this.secretKey = this.configService.getOrThrow<string>('APP_SECRET_KEY');
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    // 1. Читаем request
    const request = this.readRequest(context);

    // 2. Читаем токен из request
    const token = this.readToken(request);

    // 3. Если токен есть, то проверяем его
    this.checkToken(request, token);

    // 4. Пропускаем запрос дальше
    return next.handle();
  }

  // 1. Читаем request
  private readRequest(context: ExecutionContext): any {
    return context.switchToHttp().getRequest();
  }

  // 2. Читаем токен из request
  private readToken(request: any): string | undefined {
    // 1. Читаем токен из authorization header
    const authHeader = request.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 2. Читаем токен из cookie
    const cookie = request.headers.cookie;

    if (cookie) {
      const match = /(?:^|; )auth=([^;]+)/.exec(cookie);
      if (match) {
        try {
          return JSON.parse(decodeURIComponent(match[1])).token;
        } catch {
          return undefined;
        }
      }
    }

    // 3. Если токен не найден, возвращаем undefined
    return undefined;
  }

  // 3. Проверяем токен
  private checkToken(request: any, token: string | undefined): void {
    if (token) {
      try {
        // 1. Проверяем токен
        const payload = this.jwtService.verify(token, {
          secret: this.secretKey,
        });

        // 2. Записываем данные авторизации в request
        const authenticationData: Authentication = {
          token,
          user: {
            id: payload.id,
            role: payload.role,
          },
        };

        request.authentication = authenticationData;
      } catch {
        request.authentication = undefined;
      }
    } else {
      // 4. Если токена нет, оставляем auth пустым
      request.authentication = undefined;
    }
  }
}
