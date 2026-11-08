import { describe, it, expect } from 'vitest';
import { DATABASE_PACKAGE_INFO, pg, pgvector } from '../src/index.js';

describe('@archon/database sanity tests', () => {
  it('should export database package info with pg driver and pgvector enabled', () => {
    expect(DATABASE_PACKAGE_INFO).toEqual({
      name: '@archon/database',
      driver: 'pg',
      pgvectorSupported: true,
    });
  });

  it('should successfully resolve pg and pgvector module bindings', () => {
    expect(pg).toBeDefined();
    expect(pg.Pool).toBeDefined();
    expect(pgvector).toBeDefined();
  });
});
