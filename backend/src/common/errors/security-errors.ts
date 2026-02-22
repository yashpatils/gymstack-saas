import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';

export const SecurityErrors = {
  featureDisabled() {
    return new BadRequestException({
      error: { code: 'FEATURE_DISABLED', message: 'This feature is currently disabled.' },
    });
  },
  slugInvalid(reason = 'Invalid slug') {
    return new BadRequestException({
      error: { code: 'SLUG_INVALID', message: reason, field: 'newSlug' },
    });
  },
  slugReserved() {
    return new BadRequestException({
      error: { code: 'SLUG_RESERVED', message: 'This slug is reserved.', field: 'newSlug' },
    });
  },
  slugTaken() {
    return new ConflictException({
      error: { code: 'SLUG_TAKEN', message: 'This slug is already in use.', field: 'newSlug' },
    });
  },
  challengeNotFound() {
    return new NotFoundException({
      error: { code: 'CHALLENGE_NOT_FOUND', message: 'Challenge not found.' },
    });
  },
  otpInvalid() {
    return new BadRequestException({
      error: { code: 'OTP_INVALID', message: 'Invalid OTP.' },
    });
  },
  otpExpired() {
    return new BadRequestException({
      error: { code: 'OTP_EXPIRED', message: 'OTP expired. Request a new code.' },
    });
  },
  otpAttemptsExceeded() {
    return new BadRequestException({
      error: { code: 'OTP_ATTEMPTS_EXCEEDED', message: 'Maximum attempts exceeded. Request a new code.' },
    });
  },
  forbidden() {
    return new ForbiddenException({
      error: { code: 'FORBIDDEN', message: 'You do not have access to perform this action.' },
    });
  },
  rateLimited(retryAfterSeconds = 60) {
    return new HttpException({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Try again later.',
        retryAfterSeconds,
      },
    }, HttpStatus.TOO_MANY_REQUESTS);
  },
};
