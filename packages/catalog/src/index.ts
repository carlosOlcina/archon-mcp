import { ScaffoldStatusSchema, type ScaffoldStatus } from '@archon/validators';

export interface CatalogPackageInfo {
  name: string;
  version: string;
}

export const CATALOG_PACKAGE_INFO: CatalogPackageInfo = {
  name: '@archon/catalog',
  version: '0.1.0',
};

export function getCatalogScaffoldStatus(): ScaffoldStatus {
  return ScaffoldStatusSchema.parse({
    package: CATALOG_PACKAGE_INFO.name,
    initialized: true,
    version: CATALOG_PACKAGE_INFO.version,
  });
}
