-- ================================================================
-- TechStore Database Schema
-- Cubre: Todas las tablas del caso de estudio
-- Perfiles: Admin, Gerente, Empleado, Auditor
-- Módulos: Auth, RBAC, ABAC, Audit Log
-- ================================================================

-- ──────────────────────────────────────────
-- SCHEMAS por dominio (separación de servicios)
-- ──────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS rbac;
CREATE SCHEMA IF NOT EXISTS inventory;

-- ──────────────────────────────────────────
-- TABLA: tiendas (compartida entre servicios)
-- Referenciada por usuarios y productos
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tiendas (
    id             SERIAL PRIMARY KEY,
    nombre         VARCHAR(100) NOT NULL,
    ciudad         VARCHAR(100) NOT NULL,
    activo         BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- SCHEMA AUTH
-- Caso → Fase 1: Autenticación completa
-- ──────────────────────────────────────────

-- Tabla principal de usuarios
-- Caso → Módulo de Gestión de Usuarios
CREATE TABLE IF NOT EXISTS auth.usuarios (
    id               SERIAL PRIMARY KEY,
    email            VARCHAR(255) NOT NULL UNIQUE,
    password_hash    VARCHAR(255) NOT NULL,
    nombre_completo  VARCHAR(150) NOT NULL,
    tienda_id        INTEGER REFERENCES public.tiendas(id) ON DELETE SET NULL,
    mfa_habilitado   BOOLEAN DEFAULT FALSE,
    mfa_secret       VARCHAR(255),
    intentos_fallidos INTEGER DEFAULT 0,
    bloqueado_hasta  TIMESTAMPTZ,
    activo           BOOLEAN DEFAULT TRUE,
    fecha_creacion   TIMESTAMPTZ DEFAULT NOW()
);

-- Tokens temporales para flujo MFA (antes de JWT completo)
-- Caso → Flujo MFA: pasos 2-4
CREATE TABLE IF NOT EXISTS auth.mfa_temp_tokens (
    id          SERIAL PRIMARY KEY,
    usuario_id  INTEGER NOT NULL REFERENCES auth.usuarios(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,
    usado       BOOLEAN DEFAULT FALSE,
    expira_en   TIMESTAMPTZ NOT NULL,
    creado_en   TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- SCHEMA RBAC
-- Caso → Parte A: Role-Based Access Control
-- ──────────────────────────────────────────

-- Tabla roles
-- Caso → PARTE A: Módulo de Gestión de Roles
CREATE TABLE IF NOT EXISTS rbac.roles (
    id             SERIAL PRIMARY KEY,
    nombre         VARCHAR(50) NOT NULL UNIQUE,
    descripcion    TEXT,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

-- Asignación roles-usuarios
-- Caso → PARTE A: Módulo de Asignación Roles-Usuarios
CREATE TABLE IF NOT EXISTS rbac.usuario_roles (
    id               SERIAL PRIMARY KEY,
    usuario_id       INTEGER NOT NULL REFERENCES auth.usuarios(id) ON DELETE CASCADE,
    rol_id           INTEGER NOT NULL REFERENCES rbac.roles(id) ON DELETE CASCADE,
    asignado_por     INTEGER REFERENCES auth.usuarios(id),
    fecha_asignacion TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(usuario_id, rol_id)
);

-- ──────────────────────────────────────────
-- SCHEMA INVENTORY
-- Caso → Parte B: ABAC - Módulo de Productos
-- ──────────────────────────────────────────

-- Tabla productos
-- Caso → PARTE B: Reglas de Acceso por Atributos
CREATE TABLE IF NOT EXISTS inventory.productos (
    id                  SERIAL PRIMARY KEY,
    nombre              VARCHAR(150) NOT NULL,
    descripcion         TEXT,
    precio              NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
    stock               INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    categoria           VARCHAR(100),
    tienda_id           INTEGER NOT NULL REFERENCES public.tiendas(id) ON DELETE CASCADE,
    es_premium          BOOLEAN DEFAULT FALSE,
    creado_por          INTEGER REFERENCES auth.usuarios(id),
    fecha_creacion      TIMESTAMPTZ DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log de todas las acciones
-- Caso → Fase 3: Logging de acciones por usuario
CREATE TABLE IF NOT EXISTS inventory.audit_log (
    id         SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES auth.usuarios(id),
    accion     VARCHAR(20) NOT NULL,
    recurso    VARCHAR(50) NOT NULL,
    recurso_id INTEGER,
    detalle    JSONB,
    ip         VARCHAR(45),
    timestamp  TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- TRIGGER: auto-actualizar fecha_actualizacion
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION inventory.update_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_productos_updated
    BEFORE UPDATE ON inventory.productos
    FOR EACH ROW
    EXECUTE FUNCTION inventory.update_fecha_actualizacion();

-- ──────────────────────────────────────────
-- DATOS INICIALES (seed)
-- ──────────────────────────────────────────

-- Tiendas
INSERT INTO public.tiendas (nombre, ciudad) VALUES
    ('TechStore Lima Centro', 'Lima'),
    ('TechStore Miraflores',  'Lima'),
    ('TechStore Arequipa',    'Arequipa')
ON CONFLICT DO NOTHING;

-- Roles del sistema
-- Caso → Perfiles de Usuario del caso de estudio
INSERT INTO rbac.roles (nombre, descripcion) VALUES
    ('Admin',    'Gestiona usuarios y roles, acceso total al sistema'),
    ('Gerente',  'Gestiona productos de su tienda, visualiza reportes'),
    ('Empleado', 'Consulta productos y actualiza stock en tiempo real'),
    ('Auditor',  'Solo lectura de todos los datos, genera reportes')
ON CONFLICT (nombre) DO NOTHING;

-- ──────────────────────────────────────────
-- SEED: Usuarios de prueba
-- Casos de prueba del caso de estudio
-- Contraseñas cumplen: 8+ chars, mayúscula, número, carácter especial
--
-- Admin    → Admin2024A1!
-- Gerente  → Gerente2024G1!
-- Empleado → Empleado2024E1!
-- Auditor  → Auditor2024Au1!
-- ──────────────────────────────────────────
INSERT INTO auth.usuarios
    (email, password_hash, nombre_completo, tienda_id, mfa_habilitado, activo)
VALUES
    (
        'admin@techstore.com',
        '$2a$12$M9VnGZAYqKY3jt7B2hMRX.Lh6vTbAUsVNU.iydyv5fTYLM278QdIS',
        'Administrador del Sistema',
        NULL,
        FALSE,
        TRUE
    ),
    (
        'gerente@techstore.com',
        '$2a$12$kwnX/9UoaQs8/3iBHMH/.eImlIl5KOGRW1AsLEw6.I0fRgv.SVkRS',
        'Gerente Lima Centro',
        1,
        FALSE,
        TRUE
    ),
    (
        'gerente_lima@techstore.com',
        '$2a$12$kwnX/9UoaQs8/3iBHMH/.eImlIl5KOGRW1AsLEw6.I0fRgv.SVkRS',
        'Gerente Miraflores',
        2,
        FALSE,
        TRUE
    ),
    (
        'empleado@techstore.com',
        '$2a$12$af/Vnajm2u2sRoKqM45MT.DG//9wI8rPE3DwrA3C1iarLAziXdXGa',
        'Empleado de Ventas',
        1,
        FALSE,
        TRUE
    ),
    (
        'auditor@techstore.com',
        '$2a$12$XQ2ypSpzAQ1udAbvBAV5k.Iq4FNomlP2ajQF6/J1KH4LYqoMsvfLO',
        'Auditor del Sistema',
        NULL,
        FALSE,
        TRUE
    )
ON CONFLICT (email) DO NOTHING;

-- ──────────────────────────────────────────
-- SEED: Asignación de roles
-- ──────────────────────────────────────────
INSERT INTO rbac.usuario_roles (usuario_id, rol_id)
SELECT u.id, r.id FROM auth.usuarios u, rbac.roles r
WHERE u.email = 'admin@techstore.com'    AND r.nombre = 'Admin'
ON CONFLICT DO NOTHING;

INSERT INTO rbac.usuario_roles (usuario_id, rol_id)
SELECT u.id, r.id FROM auth.usuarios u, rbac.roles r
WHERE u.email = 'gerente@techstore.com'  AND r.nombre = 'Gerente'
ON CONFLICT DO NOTHING;

INSERT INTO rbac.usuario_roles (usuario_id, rol_id)
SELECT u.id, r.id FROM auth.usuarios u, rbac.roles r
WHERE u.email = 'gerente_lima@techstore.com' AND r.nombre = 'Gerente'
ON CONFLICT DO NOTHING;

INSERT INTO rbac.usuario_roles (usuario_id, rol_id)
SELECT u.id, r.id FROM auth.usuarios u, rbac.roles r
WHERE u.email = 'empleado@techstore.com' AND r.nombre = 'Empleado'
ON CONFLICT DO NOTHING;

INSERT INTO rbac.usuario_roles (usuario_id, rol_id)
SELECT u.id, r.id FROM auth.usuarios u, rbac.roles r
WHERE u.email = 'auditor@techstore.com'  AND r.nombre = 'Auditor'
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────
-- SEED: Productos de prueba
-- Para demostrar reglas ABAC del caso
-- ──────────────────────────────────────────
INSERT INTO inventory.productos
    (nombre, descripcion, precio, stock, categoria, tienda_id, es_premium)
VALUES
    ('Laptop HP ProBook',    'Laptop empresarial 14"',     3500.00, 15, 'Laptops',    1, TRUE),
    ('Mouse Logitech MX',    'Mouse inalámbrico ergonómico', 180.00, 50, 'Periféricos', 1, FALSE),
    ('Monitor Samsung 27"',  'Monitor IPS 4K',             1200.00, 10, 'Monitores',  1, FALSE),
    ('Laptop Dell XPS',      'Ultrabook premium 15"',      5200.00,  8, 'Laptops',    2, TRUE),
    ('Teclado Mecánico',     'Teclado RGB switches blue',   350.00, 30, 'Periféricos', 2, FALSE),
    ('iPad Pro 12.9"',       'Tablet Apple M2',            4800.00,  5, 'Tablets',    2, TRUE),
    ('Impresora Epson L3150','Multifuncional sistema tinta', 650.00, 20, 'Impresoras', 3, FALSE),
    ('Disco SSD 1TB',        'SSD NVMe Samsung 970 EVO',    420.00, 40, 'Almacenamiento', 3, FALSE)
ON CONFLICT DO NOTHING;