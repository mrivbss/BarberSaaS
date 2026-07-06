-- Servicios: catálogo de servicios por barbería (multi-tenant)
-- barberia_id actúa como tenant_id en esta aplicación

CREATE TABLE IF NOT EXISTS servicios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barberia_id UUID NOT NULL REFERENCES barberias(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT servicios_barberia_name_unique UNIQUE (barberia_id, name)
);

CREATE INDEX IF NOT EXISTS idx_servicios_barberia ON servicios(barberia_id);
