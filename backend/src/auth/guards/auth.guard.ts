import { Injectable } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode, apiError } from '../../common/api-error';

@Injectable()
export class AuthGuard extends PassportAuthGuard('jwt') {
  handleRequest<TUser = unknown>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      throw apiError(HttpStatus.UNAUTHORIZED, ApiErrorCode.UNAUTHORIZED, 'Missing or invalid authentication token');
    }

    return user;
  }
}

