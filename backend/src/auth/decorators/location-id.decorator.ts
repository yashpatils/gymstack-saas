import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const LocationId = createParamDecorator((_: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<{ activeLocationId?: string }>();
  return request.activeLocationId;
});

