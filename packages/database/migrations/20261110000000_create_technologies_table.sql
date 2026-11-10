-- migrate:up
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE technologies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(32) NOT NULL,
    father_technology_id UUID REFERENCES technologies(id) ON DELETE CASCADE,
    description TEXT,
    slug VARCHAR(64) NOT NULL UNIQUE,
    is_activate BOOLEAN NOT NULL DEFAULT true,
    aliases TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_technologies_category ON technologies (category);
CREATE INDEX idx_technologies_father_technology_id ON technologies (father_technology_id);
CREATE INDEX idx_technologies_aliases_gin ON technologies USING gin (aliases);

-- migrate:down
DROP TABLE IF EXISTS technologies CASCADE;
