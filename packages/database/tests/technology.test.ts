import { describe, it, expect } from 'vitest';
import {
  mapTechnologyRowToEntity,
  mapEntityToTechnologyRow,
  type TechnologyRow,
  type Technology,
} from '../src/index.js';

describe('Technology Database Mappers (@archon/database)', () => {
  const sampleRow: TechnologyRow = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'PostgreSQL',
    category: 'database',
    father_technology_id: '223e4567-e89b-12d3-a456-426614174001',
    description: 'Advanced open-source relational database',
    slug: 'postgresql',
    is_activate: true,
    aliases: ['postgres', 'pgsql'],
    created_at: new Date('2026-01-01T10:00:00.000Z'),
    updated_at: new Date('2026-01-02T12:00:00.000Z'),
  };

  const sampleEntity: Technology = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'PostgreSQL',
    category: 'database',
    fatherTechnologyId: '223e4567-e89b-12d3-a456-426614174001',
    description: 'Advanced open-source relational database',
    slug: 'postgresql',
    isActivate: true,
    aliases: ['postgres', 'pgsql'],
    createdAt: new Date('2026-01-01T10:00:00.000Z'),
    updatedAt: new Date('2026-01-02T12:00:00.000Z'),
  };

  describe('R14: mapTechnologyRowToEntity', () => {
    it('should correctly map a relational snake_case TechnologyRow to camelCase Technology entity [R14]', () => {
      const entity = mapTechnologyRowToEntity(sampleRow);

      expect(entity.id).toBe(sampleRow.id);
      expect(entity.name).toBe(sampleRow.name);
      expect(entity.category).toBe(sampleRow.category);
      expect(entity.fatherTechnologyId).toBe(sampleRow.father_technology_id);
      expect(entity.description).toBe(sampleRow.description);
      expect(entity.slug).toBe(sampleRow.slug);
      expect(entity.isActivate).toBe(sampleRow.is_activate);
      expect(entity.aliases).toEqual(sampleRow.aliases);
      expect(entity.createdAt).toEqual(sampleRow.created_at);
      expect(entity.updatedAt).toEqual(sampleRow.updated_at);
    });

    it('should handle nullable father_technology_id and description correctly [R14]', () => {
      const rowWithNulls: TechnologyRow = {
        ...sampleRow,
        father_technology_id: null,
        description: null,
      };

      const entity = mapTechnologyRowToEntity(rowWithNulls);

      expect(entity.fatherTechnologyId).toBeNull();
      expect(entity.description).toBeNull();
    });

    it('should safeguard aliases as an array if row aliases is not an array [R14]', () => {
      const rowWithBadAliases = {
        ...sampleRow,
        aliases: null as unknown as string[],
      };

      const entity = mapTechnologyRowToEntity(rowWithBadAliases);
      expect(entity.aliases).toEqual([]);
    });
  });

  describe('R14: mapEntityToTechnologyRow', () => {
    it('should correctly map a camelCase Technology entity to a relational snake_case TechnologyRow [R14]', () => {
      const row = mapEntityToTechnologyRow(sampleEntity);

      expect(row.id).toBe(sampleEntity.id);
      expect(row.name).toBe(sampleEntity.name);
      expect(row.category).toBe(sampleEntity.category);
      expect(row.father_technology_id).toBe(sampleEntity.fatherTechnologyId);
      expect(row.description).toBe(sampleEntity.description);
      expect(row.slug).toBe(sampleEntity.slug);
      expect(row.is_activate).toBe(sampleEntity.isActivate);
      expect(row.aliases).toEqual(sampleEntity.aliases);
      expect(row.created_at).toEqual(sampleEntity.createdAt);
      expect(row.updated_at).toEqual(sampleEntity.updatedAt);
    });

    it('should normalize undefined description to null in database row [R14]', () => {
      const entityWithoutDesc: Technology = {
        ...sampleEntity,
        description: undefined,
      };

      const row = mapEntityToTechnologyRow(entityWithoutDesc);
      expect(row.description).toBeNull();
    });

    it('should achieve bi-directional round-trip consistency between entity and row [R14]', () => {
      const mappedEntity = mapTechnologyRowToEntity(sampleRow);
      const roundTripRow = mapEntityToTechnologyRow(mappedEntity);

      expect(roundTripRow).toEqual(sampleRow);
    });
  });
});
