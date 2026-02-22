import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Membership, MembershipRole, MembershipStatus } from '@prisma/client';

export type ActiveMembership = Pick<Membership, 'id' | 'orgId' | 'gymId' | 'role' | 'status' | 'userId'> & {
  role: MembershipRole;
  status: MembershipStatus;
};

export const CurrentMembership = createParamDecorator((_: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<{ membership?: ActiveMembership }>();
  return request.membership;
});

