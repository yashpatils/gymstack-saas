import { assertQaSeedingAllowed } from './ensure-qa-user';

describe('assertQaSeedingAllowed', () => {
  it('throws in production even when ENABLE_QA_USER_SEED is true', () => {
    expect(() => assertQaSeedingAllowed({
      ENABLE_QA_USER_SEED: 'true',
      NODE_ENV: 'production',
    } as NodeJS.ProcessEnv)).toThrow('Refusing to run ensure-qa-user in production.');
  });

  it('allows non-production qa seed when explicit flag is true', () => {
    expect(() => assertQaSeedingAllowed({
      ENABLE_QA_USER_SEED: 'true',
      NODE_ENV: 'development',
    } as NodeJS.ProcessEnv)).not.toThrow();
  });
});
