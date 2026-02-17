import { PublicService } from './public.service';

describe('PublicService', () => {
  const gym = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  };

  const prisma = {
    gym,
    organization: {
      findUnique: jest.fn(),
    },
  };

  const subscriptionGatingService = {
    getEffectiveWhiteLabel: jest.fn((tenant: { whiteLabelEnabled: boolean }) => tenant.whiteLabelEnabled),
  };

  let service: PublicService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BASE_DOMAIN = 'gymstack.club';
    service = new PublicService(prisma as never, subscriptionGatingService as never);
  });

  it('returns null for base app hosts', async () => {
    await expect(service.resolveLocationFromHost('gymstack.club')).resolves.toBeNull();
    await expect(service.resolveLocationFromHost('www.gymstack.club')).resolves.toBeNull();
    await expect(service.resolveLocationFromHost('admin.gymstack.club')).resolves.toBeNull();

    expect(gym.findFirst).not.toHaveBeenCalled();
    expect(gym.findUnique).not.toHaveBeenCalled();
  });

  it('resolves verified custom domain before slug fallback', async () => {
    gym.findFirst.mockResolvedValue({
      id: 'loc-1',
      slug: 'downtown',
      displayName: 'Downtown',
      logoUrl: 'https://cdn/logo.png',
      primaryColor: '#111111',
      accentGradient: 'linear-gradient(#111,#222)',
      heroTitle: 'Hero',
      heroSubtitle: 'Subtitle',
      org: {
        id: 'tenant-1',
        whiteLabelEnabled: true,
        whiteLabelBrandingEnabled: false,
      },
    });

    await expect(service.resolveLocationFromHost('fit.example.com:443')).resolves.toEqual({
      location: {
        id: 'loc-1',
        slug: 'downtown',
        displayName: 'Downtown',
        logoUrl: 'https://cdn/logo.png',
        primaryColor: '#111111',
        accentGradient: 'linear-gradient(#111,#222)',
        heroTitle: 'Hero',
        heroSubtitle: 'Subtitle',
      },
      tenant: {
        id: 'tenant-1',
        whiteLabelEnabled: true,
      },
    });

    expect(gym.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          customDomain: 'fit.example.com',
          domainVerifiedAt: { not: null },
        },
      }),
    );
    expect(gym.findUnique).not.toHaveBeenCalled();
  });

  it('falls back to slug subdomain when no verified custom domain exists', async () => {
    gym.findFirst.mockResolvedValue(null);
    gym.findUnique.mockResolvedValue({
      id: 'loc-2',
      slug: 'uptown',
      displayName: 'Uptown',
      logoUrl: null,
      primaryColor: null,
      accentGradient: null,
      heroTitle: null,
      heroSubtitle: null,
      org: {
        id: 'tenant-2',
        whiteLabelEnabled: false,
        whiteLabelBrandingEnabled: true,
      },
    });

    await expect(service.resolveLocationFromHost('uptown.gymstack.club')).resolves.toEqual({
      location: {
        id: 'loc-2',
        slug: 'uptown',
        displayName: 'Uptown',
        logoUrl: null,
        primaryColor: null,
        accentGradient: null,
        heroTitle: null,
        heroSubtitle: null,
      },
      tenant: {
        id: 'tenant-2',
        whiteLabelEnabled: true,
      },
    });

    expect(gym.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: 'uptown' } }),
    );
  });

  it('returns null location and tenant from location-by-host response when host does not resolve', async () => {
    gym.findFirst.mockResolvedValue(null);

    await expect(service.getLocationByHost('missing.gymstack.club')).resolves.toEqual({
      location: null,
      tenant: null,
    });
  });
});
