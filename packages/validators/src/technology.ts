import { z } from 'zod';

/**
 * Esquema representativo de una fila directa de PostgreSQL (snake_case).
 */
export const TechnologyRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  category: z.string().trim().min(1).max(32),
  father_technology_id: z.string().uuid().nullable(),
  description: z.string().nullable(),
  slug: z.string().min(1).max(64),
  is_activate: z.boolean(),
  aliases: z.array(z.string()),
  created_at: z.date().or(z.string().datetime({ offset: true })),
  updated_at: z.date().or(z.string().datetime({ offset: true })),
});

export type TechnologyRow = z.infer<typeof TechnologyRowSchema>;

/**
 * Esquema canónico de la entidad de dominio Technology (camelCase).
 */
export const TechnologySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  category: z.string().trim().min(1).max(32),
  fatherTechnologyId: z.string().uuid().nullable(),
  description: z.string().nullable().optional(),
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El slug debe ser kebab-case en minúsculas'),
  isActivate: z.boolean().default(true),
  aliases: z.array(z.string()).default([]),
  createdAt: z.date().or(z.string().datetime({ offset: true })),
  updatedAt: z.date().or(z.string().datetime({ offset: true })),
});

export type Technology = z.infer<typeof TechnologySchema>;

/**
 * Esquema para la creación de una nueva tecnología.
 * Admite 'fatherTechnologyId', 'father_technology_id' y 'fatherTecnology' mediante preprocess/transform.
 */
export const CreateTechnologySchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    category: z.string().trim().min(1).max(32),
    fatherTechnologyId: z.string().uuid().nullable().optional(),
    father_technology_id: z.string().uuid().nullable().optional(),
    fatherTecnology: z.string().uuid().nullable().optional(),
    description: z.string().trim().nullable().optional(),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El slug debe ser kebab-case en minúsculas'),
    isActivate: z.boolean().optional(),
    is_activate: z.boolean().optional(),
    aliases: z.array(z.string().trim()).optional().default([]),
  })
  .transform((data) => {
    const fatherId =
      data.fatherTechnologyId ?? data.father_technology_id ?? data.fatherTecnology ?? null;
    const active = data.isActivate ?? data.is_activate ?? true;
    return {
      name: data.name,
      category: data.category,
      fatherTechnologyId: fatherId,
      description: data.description ?? null,
      slug: data.slug,
      isActivate: active,
      aliases: data.aliases,
    };
  });

export type CreateTechnologyInput = z.input<typeof CreateTechnologySchema>;
export type CreateTechnologyOutput = z.output<typeof CreateTechnologySchema>;

/**
 * Esquema para la actualización parcial de una tecnología.
 */
export const UpdateTechnologySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    category: z.string().trim().min(1).max(32).optional(),
    fatherTechnologyId: z.string().uuid().nullable().optional(),
    father_technology_id: z.string().uuid().nullable().optional(),
    fatherTecnology: z.string().uuid().nullable().optional(),
    description: z.string().trim().nullable().optional(),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El slug debe ser kebab-case en minúsculas')
      .optional(),
    isActivate: z.boolean().optional(),
    is_activate: z.boolean().optional(),
    aliases: z.array(z.string().trim()).optional(),
  })
  .transform((data) => {
    const fatherId =
      data.fatherTechnologyId !== undefined
        ? data.fatherTechnologyId
        : data.father_technology_id !== undefined
          ? data.father_technology_id
          : data.fatherTecnology !== undefined
            ? data.fatherTecnology
            : undefined;
    const active = data.isActivate !== undefined ? data.isActivate : data.is_activate;

    const result: {
      name?: string;
      category?: string;
      fatherTechnologyId?: string | null;
      description?: string | null;
      slug?: string;
      isActivate?: boolean;
      aliases?: string[];
    } = {};

    if (data.name !== undefined) result.name = data.name;
    if (data.category !== undefined) result.category = data.category;
    if (fatherId !== undefined) result.fatherTechnologyId = fatherId;
    if (data.description !== undefined) result.description = data.description;
    if (data.slug !== undefined) result.slug = data.slug;
    if (active !== undefined) result.isActivate = active;
    if (data.aliases !== undefined) result.aliases = data.aliases;

    return result;
  });

export type UpdateTechnologyInput = z.input<typeof UpdateTechnologySchema>;
export type UpdateTechnologyOutput = z.output<typeof UpdateTechnologySchema>;
