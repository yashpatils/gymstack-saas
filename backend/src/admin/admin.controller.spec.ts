import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController', () => {
  const adminService = {
    getMigrationStatus: jest.fn(),
  } as unknown as AdminService;

  const controller = new AdminController(adminService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns migration status from admin service', async () => {
    const expected = {
      checkedAt: new Date().toISOString(),
      total: 2,
      failedCount: 1,
      failedMigrations: [{ migrationName: '20250201_add_table', startedAt: new Date().toISOString(), logs: null }],
      migrations: [],
      guidance: [],
    };

    (adminService.getMigrationStatus as jest.Mock).mockResolvedValue(expected);

    await expect(controller.migrationStatus()).resolves.toEqual(expected);
    expect(adminService.getMigrationStatus).toHaveBeenCalledTimes(1);
  });
});
