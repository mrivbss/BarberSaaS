-- Habilitar la extensión para generar UUIDs si no está activa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla: barberias
-- Tabla principal que define a cada "Tenant" (inquilino/cliente)
CREATE TABLE barberias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(255) NOT NULL,
    comuna VARCHAR(255) NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla: usuarios
-- Tabla para administrar los usuarios (dueños y empleados) de las barberías.
-- El id debería coincidir con el auth.uid() de Supabase Auth para mantener todo sincronizado.
CREATE TABLE usuarios (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    rol VARCHAR(50) CHECK (rol IN ('admin', 'barbero')) NOT NULL,
    
    -- LLAVE FORÁNEA MULTI-TENANT: Relaciona obligatoriamente al usuario con su barbería
    barberia_id UUID NOT NULL REFERENCES barberias(id) ON DELETE CASCADE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla: citas
-- Agenda de las barberías. Incluye quién es el barbero y en qué barbería ocurre.
CREATE TABLE citas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente VARCHAR(255) NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    
    barbero_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    
    -- LLAVE FORÁNEA MULTI-TENANT: Permite aislar rápidamente las citas de una barbería
    barberia_id UUID NOT NULL REFERENCES barberias(id) ON DELETE CASCADE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla: ganancias (ventas)
-- Control de caja y pago de comisiones
CREATE TABLE ganancias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    monto DECIMAL(10, 2) NOT NULL,
    concepto VARCHAR(255) NOT NULL,
    
    -- Se relaciona a una cita (opcional, en caso de venta de productos)
    cita_id UUID REFERENCES citas(id) ON DELETE SET NULL,
    
    -- Qué barbero generó el ingreso
    barbero_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    
    -- LLAVE FORÁNEA MULTI-TENANT: Asegura que el flujo de caja se aisle por barbería
    barberia_id UUID NOT NULL REFERENCES barberias(id) ON DELETE CASCADE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ÍNDICES
-- Índices para optimizar las queries con filtros de multi-tenant (por barberia_id)
CREATE INDEX idx_usuarios_barberia ON usuarios(barberia_id);
CREATE INDEX idx_citas_barberia ON citas(barberia_id);
CREATE INDEX idx_ganancias_barberia ON ganancias(barberia_id);

-- SEGURIDAD ADICIONAL: ROW LEVEL SECURITY (RLS)
-- Te recomiendo habilitar esto en el futuro para reforzar la seguridad a nivel base de datos:
-- ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Aislamiento tenant citas" ON citas FOR ALL USING (barberia_id = (SELECT barberia_id FROM usuarios WHERE id = auth.uid()));
