import { User } from '@/shared/microservices/auth/users/entities/entity';
import { UserNameResult } from '@/shared/microservices/auth/users/utilities/name/utility.interface';
import { UserSlugResult } from '@/shared/microservices/auth/users/utilities/slug/utility.interface';

export interface UserProps {
  user: User;
}

export interface UserResult {
  data: User;
  slug: UserSlugResult;
  name: UserNameResult;
}
