import type { TechnologyRow, Technology } from '@archon/validators';

export type { TechnologyRow, Technology };

/**
 * Mapea una fila relacional devuelta por PostgreSQL (TechnologyRow) al modelo de dominio (Technology).
 */
export function mapTechnologyRowToEntity(row: TechnologyRow): Technology {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    fatherTechnologyId: row.father_technology_id,
    description: row.description,
    slug: row.slug,
    isActivate: row.is_activate,
    aliases: Array.isArray(row.aliases) ? row.aliases : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Mapea una entidad de dominio (Technology) a su representación de fila relacional en base de datos.
 */
export function mapEntityToTechnologyRow(entity: Technology): TechnologyRow {
  return {
    id: entity.id,
    name: entity.name,
    category: entity.category,
    father_technology_id: entity.fatherTechnologyId,
    description: entity.description ?? null,
    slug: entity.slug,
    is_activate: entity.isActivate,
    aliases: entity.aliases,
    created_at: entity.createdAt,
    updated_at: entity.updatedAt,
  };
}
