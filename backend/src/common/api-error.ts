import { HttpException, HttpStatus } from '@nestjs/common';

export const ApiErrorCode = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NO_ACTIVE_TENANT: 'NO_ACTIVE_TENANT',
  NO_ACTIVE_LOCATION: 'NO_ACTIVE_LOCATION',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  TWO_FACTOR_REQUIRED: 'TWO_FACTOR_REQUIRED',
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export function apiError(status: HttpStatus, code: string, message: string): HttpException {
  return new HttpException({ code, message }, status);
}

