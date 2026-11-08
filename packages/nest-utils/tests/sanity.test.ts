import { describe, it, expect } from 'vitest';
import { NEST_UTILS_PACKAGE_INFO, NestUtilsSanityService } from '../src/index.js';

describe('@archon/nest-utils sanity tests', () => {
  it('should export package info correctly', () => {
    expect(NEST_UTILS_PACKAGE_INFO).toEqual({
      name: '@archon/nest-utils',
      version: '0.1.0',
    });
  });

  it('should instantiate NestUtilsSanityService and validate status via @archon/validators', () => {
    const service = new NestUtilsSanityService();
    const status = service.getStatus();

    expect(status).toEqual({
      package: '@archon/nest-utils',
      initialized: true,
      version: '0.1.0',
    });
  });
});
