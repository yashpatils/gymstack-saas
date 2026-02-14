import { sanitizeReturnTo } from './sanitize-return-to';

describe('sanitizeReturnTo', () => {
  const prisma = {
    customDomain: {
      findFirst: jest.fn(),
    },
  } as never;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('allows relative return paths', async () => {
    const result = await sanitizeReturnTo('/platform/settings', 'https://gymstack.club', 'gymstack.club,*.gymstack.club', prisma);
    expect(result).toBe('https://gymstack.club/platform/settings');
  });

  it('blocks unknown hosts', async () => {
    (prisma.customDomain.findFirst as jest.Mock).mockResolvedValue(null);
    const result = await sanitizeReturnTo('https://evil.com/phish', 'https://gymstack.club', 'gymstack.club,*.gymstack.club', prisma);
    expect(result).toBe('https://gymstack.club/platform');
  });
});
