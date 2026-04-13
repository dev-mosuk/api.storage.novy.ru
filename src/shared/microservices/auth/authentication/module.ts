import { AuthenticationOtp } from '@/shared/microservices/auth/authentication/entities/otps/entity';
import { AuthenticationGuard } from '@/shared/microservices/auth/authentication/guards/guard';
import { AuthenticationInterceptor } from '@/shared/microservices/auth/authentication/interceptors/interceptor';
import { User } from '@/shared/microservices/auth/users/entities/entity';
import { UsersModule } from '@/shared/microservices/auth/users/module';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuthenticationOtp, User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService) => ({
        secret: configService.get('APP_SECRET_KEY'),
        signOptions: { expiresIn: '90d' },
      }),
      inject: [ConfigService],
    }),

    UsersModule,
  ],
  controllers: [],
  providers: [AuthenticationGuard, AuthenticationInterceptor],
  exports: [JwtModule, AuthenticationGuard, AuthenticationInterceptor],
})
export class AuthenticationModule {}
