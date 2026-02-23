import { MODULE_METADATA } from '@nestjs/common/constants';
import { AppModule } from './app.module';
import { LocationMembershipsModule } from './location-memberships/location-memberships.module';

describe('AppModule', () => {
  it('registers LocationMembershipsModule in imports', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) as unknown[];
    expect(imports).toContain(LocationMembershipsModule);
  });
});
