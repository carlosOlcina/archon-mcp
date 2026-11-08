import { describe, it, expect } from 'vitest';
import { CATALOG_PACKAGE_INFO, getCatalogScaffoldStatus } from '../src/index.js';

describe('@archon/catalog sanity tests', () => {
  it('should export catalog package info correctly', () => {
    expect(CATALOG_PACKAGE_INFO).toEqual({
      name: '@archon/catalog',
      version: '0.1.0',
    });
  });

  it('should generate valid scaffold status validating through @archon/validators', () => {
    const status = getCatalogScaffoldStatus();
    expect(status).toEqual({
      package: '@archon/catalog',
      initialized: true,
      version: '0.1.0',
    });
  });
});
