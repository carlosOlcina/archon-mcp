import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import {
  TechnologyRowSchema,
  TechnologySchema,
  CreateTechnologySchema,
  UpdateTechnologySchema,
} from '../src/technology.js';

describe('Technology Zod Schemas (@archon/validators)', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';
  const parentUuid = '223e4567-e89b-12d3-a456-426614174001';

  describe('R13: TechnologyRowSchema', () => {
    it('should validate a complete database row in snake_case [R13]', () => {
      const row = {
        id: validUuid,
        name: 'TypeScript',
        category: 'language',
        father_technology_id: parentUuid,
        description: 'Typed JavaScript superset',
        slug: 'typescript',
        is_activate: true,
        aliases: ['ts', 'tsc'],
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-01-01T00:00:00Z'),
      };

      const parsed = TechnologyRowSchema.parse(row);
      expect(parsed).toEqual(row);
    });

    it('should accept null father_technology_id and null description [R13]', () => {
      const row = {
        id: validUuid,
        name: 'JavaScript',
        category: 'language',
        father_technology_id: null,
        description: null,
        slug: 'javascript',
        is_activate: true,
        aliases: ['js', 'es6'],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

      const parsed = TechnologyRowSchema.parse(row);
      expect(parsed.father_technology_id).toBeNull();
      expect(parsed.description).toBeNull();
    });

    it('should reject invalid UUIDs for id and father_technology_id [R15]', () => {
      const invalidRow = {
        id: 'not-a-uuid',
        name: 'TypeScript',
        category: 'language',
        father_technology_id: 'bad-uuid',
        description: null,
        slug: 'typescript',
        is_activate: true,
        aliases: [],
        created_at: new Date(),
        updated_at: new Date(),
      };

      expect(() => TechnologyRowSchema.parse(invalidRow)).toThrow(ZodError);
    });
  });

  describe('R13: TechnologySchema (Domain Model)', () => {
    it('should validate a complete canonical domain model in camelCase [R13]', () => {
      const model = {
        id: validUuid,
        name: 'PostgreSQL',
        category: 'database',
        fatherTechnologyId: null,
        description: 'Relational database',
        slug: 'postgresql',
        isActivate: true,
        aliases: ['postgres', 'pgsql'],
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      };

      const parsed = TechnologySchema.parse(model);
      expect(parsed).toEqual(model);
    });

    it('should enforce kebab-case on slug and reject invalid formats [R13, R15]', () => {
      const validCases = ['react', 'next-js', 'node-js-v20', 'c-sharp'];
      for (const slug of validCases) {
        const result = TechnologySchema.safeParse({
          id: validUuid,
          name: 'Tech',
          category: 'framework',
          fatherTechnologyId: null,
          slug,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        expect(result.success).toBe(true);
      }

      const invalidCases = [
        'React',
        'next_js',
        'has spaces',
        '-leading-dash',
        'trailing-dash-',
        'UPPERCASE',
      ];
      for (const slug of invalidCases) {
        const result = TechnologySchema.safeParse({
          id: validUuid,
          name: 'Tech',
          category: 'framework',
          fatherTechnologyId: null,
          slug,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        expect(result.success).toBe(false);
      }
    });

    it('should apply defaults for isActivate (true) and aliases ([]) [R13]', () => {
      const model = {
        id: validUuid,
        name: 'Rust',
        category: 'language',
        fatherTechnologyId: null,
        slug: 'rust',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const parsed = TechnologySchema.parse(model);
      expect(parsed.isActivate).toBe(true);
      expect(parsed.aliases).toEqual([]);
    });
  });

  describe('R13 & R15: CreateTechnologySchema', () => {
    it('should normalize fatherTechnologyId from various alias keys [R13]', () => {
      const inputWithCamel = {
        name: 'React Native',
        category: 'framework',
        fatherTechnologyId: parentUuid,
        slug: 'react-native',
      };
      const res1 = CreateTechnologySchema.parse(inputWithCamel);
      expect(res1.fatherTechnologyId).toBe(parentUuid);

      const inputWithSnake = {
        name: 'React Native',
        category: 'framework',
        father_technology_id: parentUuid,
        slug: 'react-native',
      };
      const res2 = CreateTechnologySchema.parse(inputWithSnake);
      expect(res2.fatherTechnologyId).toBe(parentUuid);

      const inputWithFatherTecnology = {
        name: 'React Native',
        category: 'framework',
        fatherTecnology: parentUuid,
        slug: 'react-native',
      };
      const res3 = CreateTechnologySchema.parse(inputWithFatherTecnology);
      expect(res3.fatherTechnologyId).toBe(parentUuid);

      const inputWithoutParent = {
        name: 'React',
        category: 'framework',
        slug: 'react',
      };
      const res4 = CreateTechnologySchema.parse(inputWithoutParent);
      expect(res4.fatherTechnologyId).toBeNull();
    });

    it('should handle isActivate and is_activate correctly with boolean false [R13]', () => {
      const resFalse = CreateTechnologySchema.parse({
        name: 'OldTech',
        category: 'legacy',
        slug: 'old-tech',
        is_activate: false,
      });
      expect(resFalse.isActivate).toBe(false);

      const resFalseCamel = CreateTechnologySchema.parse({
        name: 'OldTech',
        category: 'legacy',
        slug: 'old-tech',
        isActivate: false,
      });
      expect(resFalseCamel.isActivate).toBe(false);

      const resDefault = CreateTechnologySchema.parse({
        name: 'NewTech',
        category: 'framework',
        slug: 'new-tech',
      });
      expect(resDefault.isActivate).toBe(true);
    });

    it('should trim string inputs and handle aliases [R13]', () => {
      const parsed = CreateTechnologySchema.parse({
        name: '   Vue.js   ',
        category: '   frontend   ',
        description: '   Progressive framework   ',
        slug: '   vue-js   ',
        aliases: ['  vue  ', '  vue3  '],
      });

      expect(parsed.name).toBe('Vue.js');
      expect(parsed.category).toBe('frontend');
      expect(parsed.description).toBe('Progressive framework');
      expect(parsed.slug).toBe('vue-js');
      expect(parsed.aliases).toEqual(['vue', 'vue3']);
    });

    it('should reject when name exceeds 100 characters [R15]', () => {
      const longName = 'a'.repeat(101);
      expect(() =>
        CreateTechnologySchema.parse({
          name: longName,
          category: 'language',
          slug: 'valid-slug',
        })
      ).toThrow(ZodError);

      try {
        CreateTechnologySchema.parse({
          name: longName,
          category: 'language',
          slug: 'valid-slug',
        });
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError);
        const issues = (err as ZodError).issues;
        expect(issues.some((i) => i.path.includes('name'))).toBe(true);
      }
    });

    it('should reject when category exceeds 32 characters or is empty [R15]', () => {
      const longCategory = 'c'.repeat(33);
      expect(() =>
        CreateTechnologySchema.parse({
          name: 'Tech',
          category: longCategory,
          slug: 'tech',
        })
      ).toThrow(ZodError);

      expect(() =>
        CreateTechnologySchema.parse({
          name: 'Tech',
          category: '   ',
          slug: 'tech',
        })
      ).toThrow(ZodError);
    });

    it('should reject when slug exceeds 64 characters [R15]', () => {
      const longSlug = 's'.repeat(65);
      expect(() =>
        CreateTechnologySchema.parse({
          name: 'Tech',
          category: 'tool',
          slug: longSlug,
        })
      ).toThrow(ZodError);
    });

    it('should reject invalid UUID for parent technology [R15]', () => {
      expect(() =>
        CreateTechnologySchema.parse({
          name: 'Tech',
          category: 'tool',
          slug: 'tech',
          fatherTechnologyId: 'invalid-uuid-string',
        })
      ).toThrow(ZodError);

      expect(() =>
        CreateTechnologySchema.parse({
          name: 'Tech',
          category: 'tool',
          slug: 'tech',
          fatherTecnology: 'not-valid-uuid',
        })
      ).toThrow(ZodError);
    });
  });

  describe('R13 & R15: UpdateTechnologySchema', () => {
    it('should validate partial updates and normalize parent key aliases [R13]', () => {
      const update1 = UpdateTechnologySchema.parse({
        name: 'TypeScript Updated',
      });
      expect(update1).toEqual({ name: 'TypeScript Updated' });

      const update2 = UpdateTechnologySchema.parse({
        fatherTecnology: parentUuid,
      });
      expect(update2).toEqual({ fatherTechnologyId: parentUuid });

      const update3 = UpdateTechnologySchema.parse({
        father_technology_id: null,
      });
      expect(update3).toEqual({ fatherTechnologyId: null });

      const update4 = UpdateTechnologySchema.parse({
        is_activate: false,
      });
      expect(update4).toEqual({ isActivate: false });
    });

    it('should reject invalid fields when provided in update payload [R15]', () => {
      expect(() =>
        UpdateTechnologySchema.parse({
          category: 'c'.repeat(33),
        })
      ).toThrow(ZodError);

      expect(() =>
        UpdateTechnologySchema.parse({
          slug: 'INVALID_SLUG',
        })
      ).toThrow(ZodError);

      expect(() =>
        UpdateTechnologySchema.parse({
          fatherTechnologyId: 'malformed-uuid',
        })
      ).toThrow(ZodError);
    });
  });
});
