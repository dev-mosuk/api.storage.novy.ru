import {
  UserNameProps,
  UserNameResult,
} from '@/shared/microservices/auth/users/utilities/name/utility.interface';

export function UserName({
  id,
  name,
  login,
  email,
}: UserNameProps): UserNameResult {
  let result = {
    initial: '',
    formatted: `Пользователь №${id}`,
  };

  if (name) {
    result.initial = name;
    result.formatted = name;

    return result;
  }

  if (login) {
    result.formatted = `@${login}`;

    return result;
  }

  if (email) {
    result.formatted = email;

    return result;
  }

  return result;
}
