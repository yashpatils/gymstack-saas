import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { PublicApiContext } from './public-api.types';

type PublicApiRequest = Request & { apiKeyContext?: PublicApiContext };

export const PublicApiCtx = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PublicApiContext => {
    const request = context.switchToHttp().getRequest<PublicApiRequest>();
    if (!request.apiKeyContext) {
      throw new Error('Public API context missing');
    }
    return request.apiKeyContext;
  },
);
