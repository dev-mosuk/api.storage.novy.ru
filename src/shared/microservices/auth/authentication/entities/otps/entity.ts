import { User } from '@/shared/microservices/auth/users/entities/entity';
import { AuthenticationOtpType } from '@/shared/microservices/auth/authentication/enums/otps/enums';

export class AuthenticationOtp {
  user_id: number;
  type: AuthenticationOtpType;
  otp: string | null;

  expires_at: Date | null;
  updated_at: Date;
  created_at: Date;

  // Relations

  user: User;
}
