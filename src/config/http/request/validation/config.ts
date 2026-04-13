import { UnprocessableEntityException, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export const validationConfig = (): ValidationPipe => {
  return new ValidationPipe({
    forbidNonWhitelisted: false,
    transform: true,
    whitelist: true,
    validationError: {
      target: false,
      value: false,
    },
    exceptionFactory: (errors: ValidationError[]) => {
      return new UnprocessableEntityException(readValidationErrors(errors));
    },
  });
};

function readValidationErrors(
  errors: ValidationError[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const error of errors) {
    if (error.children?.length) {
      const nested = readValidationErrors(error.children);
      if (Object.keys(nested).length > 0) {
        result[error.property] = nested;
      }
    } else if (error.constraints) {
      const [firstMessage] = Object.values(error.constraints);
      if (firstMessage) {
        result[error.property] = firstMessage as string;
      }
    }
  }

  return result;
}
