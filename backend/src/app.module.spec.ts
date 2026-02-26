import { MODULE_METADATA } from '@nestjs/common/constants';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { DebugModule } from './debug/debug.module';
import { LocationMembershipsModule } from './location-memberships/location-memberships.module';

describe('AppModule', () => {
  it('registers LocationMembershipsModule in imports', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) as unknown[];
    expect(imports).toContain(LocationMembershipsModule);
  });

  it('wires all top-level module imports into @Module imports', () => {
    const appModulePath = join(__dirname, 'app.module.ts');
    const source = readFileSync(appModulePath, 'utf-8');

    const importedModules = new Set(
      Array.from(source.matchAll(/^import\s+\{\s*(\w+Module)\s*\}\s+from\s+/gm)).map(
        ([, moduleName]) => moduleName,
      ),
    );

    importedModules.delete('Module');

    const metadataImports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) as unknown[];
    const wiredModuleNames = new Set(
      metadataImports
        .map((entry) => {
          if (typeof entry === 'function' && 'name' in entry) {
            return entry.name;
          }

          if (entry && typeof entry === 'object' && 'module' in entry) {
            const importedModule = entry.module;

            if (typeof importedModule === 'function' && 'name' in importedModule) {
              return importedModule.name;
            }
          }

          return null;
        })
        .filter((value): value is string => value !== null),
    );

    importedModules.forEach((moduleName) => {
      expect(wiredModuleNames).toContain(moduleName);
    });
  });

  it('does not register DebugModule imports in production unless explicitly enabled', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalDebugFlag = process.env.ENABLE_DEBUG_ROUTES;
    process.env.NODE_ENV = 'production';
    delete process.env.ENABLE_DEBUG_ROUTES;

    let imports: unknown[] = [];
    jest.isolateModules(() => {
      const { AppModule: IsolatedAppModule } = require('./app.module') as typeof import('./app.module');
      imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, IsolatedAppModule) as unknown[];
    });

    expect(imports).not.toContain(DebugModule);

    process.env.NODE_ENV = originalNodeEnv;
    process.env.ENABLE_DEBUG_ROUTES = originalDebugFlag;
  });
});
