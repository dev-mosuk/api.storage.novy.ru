import {
  UserSlugProps,
  UserSlugResult,
} from '@/shared/microservices/auth/users/utilities/slug/utility.interface';

export function UserSlug({ id, login }: UserSlugProps): UserSlugResult {
  let result = {
    id: id,
    login: '',
    loginOrId: id?.toString(),
  };

  // Если слаг передан, используем его
  if (login) {
    result.login = login;
    result.loginOrId = login;
  }

  return result;
}
