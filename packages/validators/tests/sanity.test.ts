import { describe, it, expect } from 'vitest';
import { ScaffoldStatusSchema, SCAFFOLD_VERSION } from '../src/index.js';

describe('@archon/validators sanity tests', () => {
  it('should export correct scaffold version constant', () => {
    expect(SCAFFOLD_VERSION).toBe('0.1.0');
  });

  it('should validate valid ScaffoldStatus data correctly', () => {
    const validData = {
      package: '@archon/validators',
      initialized: true,
      version: '0.1.0',
    };

    const parsed = ScaffoldStatusSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(validData);
    }
  });

  it('should reject invalid ScaffoldStatus data when required fields are missing', () => {
    const invalidData = {
      package: '@archon/validators',
      // missing initialized and version
    };

    const parsed = ScaffoldStatusSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });
});
