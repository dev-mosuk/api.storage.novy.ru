import { UserName } from '@/shared/microservices/auth/users/utilities/name/utility';
import { UserSlug } from '@/shared/microservices/auth/users/utilities/slug/utility';
import {
  UserProps,
  UserResult,
} from '@/shared/microservices/auth/users/utilities/utility.interface';

export function User({ user }: UserProps): UserResult {
  const slug = UserSlug({
    id: user.id,
    login: user.login,
  });

  const name = UserName({
    id: user.id,
    name: user.name,
    login: user.login,
    email: user.email,
  });

  return {
    data: user,
    slug,
    name,
  };
}
