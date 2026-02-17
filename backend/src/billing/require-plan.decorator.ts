import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PLAN_KEY = 'required_plan_key';

export function RequirePlan(plan: 'starter' | 'pro' | 'enterprise') {
  return SetMetadata(REQUIRED_PLAN_KEY, plan);
}
