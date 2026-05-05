
# TechStore — Sistema de Gestión de Inventario

> **Curso:** Desarrollo de Soluciones en la Nube  
> **Institución:** Instituto Tecsup  
> **Arquitectura:** Microservicios containerizados con Docker  
> **Stack:** Node.js · Express · PostgreSQL · React · Vite  

---

## Tabla de Contenidos

1. [Descripción del Proyecto](#descripción-del-proyecto)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Tecnologías Utilizadas](#tecnologías-utilizadas)
4. [Requisitos Previos](#requisitos-previos)
5. [Estructura del Proyecto](#estructura-del-proyecto)
6. [Instalación y Levantamiento](#instalación-y-levantamiento)
7. [Credenciales de Acceso](#credenciales-de-acceso)
8. [Flujo de Autenticación MFA](#flujo-de-autenticación-mfa)
9. [Módulos del Sistema](#módulos-del-sistema)
10. [API Reference](#api-reference)
11. [Casos de Prueba](#casos-de-prueba)
12. [Variables de Entorno](#variables-de-entorno)
13. [Base de Datos](#base-de-datos)

---

## Descripción del Proyecto

TechStore es una plataforma web enterprise para la **gestión centralizada de inventario** de una cadena de tiendas de tecnología. El sistema implementa controles de seguridad de nivel bancario mediante:

- **Autenticación TOTP** con Google Authenticator (RFC 6238)
- **RBAC** — Control de acceso basado en roles
- **ABAC** — Control de acceso basado en atributos del recurso
- **Audit logging** completo de todas las operaciones
- **Arquitectura de microservicios** containerizada con Docker

### Perfiles de Usuario

| Perfil | Responsabilidades |
|--------|-------------------|
| **Admin** | Gestión completa del sistema, usuarios y roles |
| **Gerente** | Gestión de productos de su tienda asignada |
| **Empleado** | Consulta de productos y actualización de stock |
| **Auditor** | Solo lectura, acceso al audit log completo |

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                 CLIENTE (React + Vite)                   │
│                    localhost:5173                        │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / REST
┌──────────────────────▼──────────────────────────────────┐
│                   API GATEWAY                            │
│                   localhost:3000                         │
│  • Enrutamiento centralizado                             │
│  • Validación JWT global                                 │
│  • Rate limiting                                         │
│  • CORS centralizado                                     │
└───────┬──────────────┬──────────────┬───────────────────┘
        │              │              │   Red interna Docker
┌───────▼────┐  ┌──────▼─────┐  ┌───▼────────────┐
│    AUTH    │  │    RBAC    │  │   PRODUCTS     │
│  SERVICE  │  │  SERVICE  │  │   SERVICE     │
│  :3001    │  │  :3002    │  │   :3003       │
│            │  │            │  │               │
│ • Registro │  │ • Roles    │  │ • Productos   │
│ • Login    │  │ • Usuarios │  │ • Motor ABAC  │
│ • TOTP/MFA │  │ • Asign.  │  │ • Audit Log   │
│ • JWT      │  │   Roles   │  │               │
└───────┬────┘  └──────┬─────┘  └───┬───────────┘
        │              │             │
┌───────▼──────────────▼─────────────▼────────────┐
│              PostgreSQL 15  :5432                │
│                                                  │
│  schema: auth      → usuarios, mfa_temp_tokens   │
│  schema: rbac      → roles, usuario_roles        │
│  schema: inventory → productos, audit_log        │
│  schema: public    → tiendas (compartido)        │
└──────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│              pgAdmin 4  :5050                    │
└─────────────────────────────────────────────────┘
```

### Decisiones de Diseño

**¿Por qué una sola base de datos con schemas separados?**  
En microservicios puristas cada servicio tiene su propia DB. Para este sistema, separar la DB implicaría replicar datos de usuarios en los 3 servicios y gestionar sincronización compleja. La solución enterprise correcta para este tamaño es una PostgreSQL con **schemas separados por dominio**, garantizando aislamiento lógico sin complejidad operacional innecesaria.

**¿Cómo se comunican los servicios?**  
Solo el API Gateway habla con los 3 microservicios vía HTTP interno en la red Docker privada (`techstore-network`). Los servicios no se llaman entre sí — el Gateway orquesta todo. El JWT es validado **una sola vez** en el Gateway, que luego inyecta los datos del usuario como headers internos (`x-user-id`, `x-user-rol`, `x-user-tienda`) hacia los servicios downstream.

---

## Tecnologías Utilizadas

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| Runtime | Node.js | 18/20 LTS | Backend de todos los servicios |
| Framework | Express | 4.19 | API REST por servicio |
| Base de datos | PostgreSQL | 15 | Almacenamiento persistente |
| ORM/Driver | node-postgres (pg) | 8.12 | Conexión a PostgreSQL |
| Autenticación | jsonwebtoken | 9.0 | Tokens JWT (access + temp) |
| MFA | otplib | 12.0 | TOTP RFC 6238 (Google Authenticator) |
| QR Code | qrcode | 1.5 | Generación de QR para MFA setup |
| Encriptación | bcryptjs | 2.4 | Hash de contraseñas (saltRounds=12) |
| Validación | express-validator | 7.1 | Validación de inputs |
| Seguridad | helmet | 7.1 | Headers HTTP seguros |
| Rate limiting | express-rate-limit | 7.3 | Protección contra fuerza bruta |
| Proxy | express-http-proxy | 2.0 | Gateway hacia microservicios |
| Frontend | React | 18.3 | Interfaz de usuario |
| Build tool | Vite | 5.3 | Bundler y dev server |
| Routing | React Router | 6.24 | Navegación SPA |
| HTTP Client | Axios | 1.7 | Llamadas al API Gateway |
| Notificaciones | react-hot-toast | 2.4 | Feedback visual al usuario |
| Iconos | lucide-react | 0.395 | Iconografía del sistema |
| Servidor web | Nginx | Alpine | Serve del frontend en producción |
| Contenedores | Docker | 28+ | Containerización de servicios |
| Orquestación | Docker Compose | v3.9 | Orquestación multi-contenedor |
| Admin DB | pgAdmin 4 | Latest | Administración visual de PostgreSQL |

---

## Requisitos Previos

Antes de levantar el proyecto asegúrate de tener instalado:

- **Docker Desktop** v24+ — [Descargar](https://www.docker.com/products/docker-desktop/)
- **Git** — [Descargar](https://git-scm.com/)
- **Node.js** v18/20 LTS (solo para desarrollo del frontend) — [Descargar](https://nodejs.org/)
- **Google Authenticator** en tu smartphone — [Android](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2) / [iOS](https://apps.apple.com/app/google-authenticator/id388497605)

### Verificar instalaciones

```bash
docker --version       # Docker version 28.5.2
docker compose version # Docker Compose version v2.40.3
node --version         # v18.20.4
git --version          # Git version 2.46.0
```

---

## Estructura del Proyecto

```
techstore/
├── docker-compose.yml              # Orquestación de los 7 contenedores
├── .env                            # Variables de entorno globales (Docker)
├── .gitignore
│
├── database/
│   └── init.sql                    # Schema completo + datos seed
│
├── gateway/                        # API Gateway — puerto 3000
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.js
│       ├── proxy.js                # Reglas de enrutamiento
│       └── middlewares/
│           ├── auth.middleware.js  # Validación JWT global
│           └── rateLimit.middleware.js
│
├── auth-service/                   # Autenticación — puerto 3001
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.js
│       ├── config/db.js
│       ├── controllers/auth.controller.js
│       ├── routes/auth.routes.js
│       ├── middlewares/auth.middleware.js
│       └── utils/
│           ├── totp.utils.js       # TOTP con otplib
│           ├── jwt.utils.js        # Generación y verificación JWT
│           └── password.utils.js  # bcrypt hash y validación
│
├── rbac-service/                   # Roles y Usuarios — puerto 3002
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.js
│       ├── config/db.js
│       ├── controllers/
│       │   ├── roles.controller.js
│       │   └── users.controller.js
│       ├── routes/
│       │   ├── roles.routes.js
│       │   └── users.routes.js
│       └── middlewares/
│           └── rbac.middleware.js  # Verificación de roles
│
├── product-service/                # Productos y ABAC — puerto 3003
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.js
│       ├── config/db.js
│       ├── controllers/products.controller.js
│       ├── routes/products.routes.js
│       ├── middlewares/
│       │   ├── abac.middleware.js  # Verificación de políticas ABAC
│       │   └── role.middleware.js
│       └── utils/
│           ├── policy-engine.js   # Motor de políticas ABAC
│           └── logger.utils.js    # Audit logging
│
└── frontend/                       # React + Vite — puerto 5173/80
    ├── Dockerfile                  # Multi-stage: build + Nginx
    ├── nginx.conf
    ├── vite.config.js
    └── src/
        ├── api/                    # Clientes HTTP por servicio
        ├── components/layout/      # Sidebar, Topbar, AppLayout
        ├── context/AuthContext.jsx # Estado global de autenticación
        ├── hooks/
        └── pages/                  # Login, Dashboard, Products, Users, Roles, Audit
```

---

## Instalación y Levantamiento

### Opción 1 — Solo Docker (Recomendado)

Este es el método principal. No requiere instalar Node.js localmente.

```bash
# 1. Clonar el repositorio
git clone https://github.com/Josue-Zapata-v/techstore.git
cd techstore

# 2. Levantar todos los servicios
docker compose up --build -d

# 3. Verificar que todos los contenedores están corriendo
docker compose ps
```

Deberías ver los 7 contenedores en estado `running`:

```
NAME                 STATUS          PORTS
techstore-postgres   Up (healthy)    0.0.0.0:5432->5432/tcp
techstore-pgadmin    Up              0.0.0.0:5050->80/tcp
techstore-auth       Up              0.0.0.0:3001->3001/tcp
techstore-rbac       Up              0.0.0.0:3002->3002/tcp
techstore-products   Up              0.0.0.0:3003->3003/tcp
techstore-gateway    Up              0.0.0.0:3000->3000/tcp
techstore-frontend   Up              0.0.0.0:5173->80/tcp
```

```bash
# 4. Verificar que el Gateway responde
curl http://localhost:3000/health
```

**Acceder a la aplicación:** http://localhost:5173

---

### Opción 2 — Docker backend + Vite dev server (Desarrollo)

Ideal para desarrollar el frontend con hot reload.

```bash
# 1. Levantar backend en background
docker compose up --build -d

# 2. En otra terminal, instalar dependencias del frontend
cd frontend
npm install

# 3. Levantar Vite en modo desarrollo
npm run dev
```

**Acceder:** http://localhost:5174 (Vite auto-selecciona puerto libre)

---

### Comandos útiles

```bash
# Detener todos los contenedores
docker compose down

# Detener y eliminar volúmenes (reinicia la DB)
docker compose down -v

# Ver logs en tiempo real
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f auth-service

# Reconstruir un servicio específico
docker compose up --build auth-service -d

# Acceder a la DB desde terminal
winpty docker exec -it techstore-postgres psql -U techstore_user -d techstore_db
```

---

## Credenciales de Acceso

### Usuarios del Sistema

Todos los usuarios deben configurar Google Authenticator la **primera vez** que inician sesión. El sistema mostrará el QR automáticamente.

| Usuario | Email | Contraseña | Rol | Tienda |
|---------|-------|------------|-----|--------|
| Administrador | `admin@techstore.com` | `Admin2024A1!` | Admin | — |
| Gerente Lima Centro | `gerente@techstore.com` | `Gerente2024G1!` | Gerente | TechStore Lima Centro |
| Gerente Miraflores | `gerente_lima@techstore.com` | `Gerente2024G1!` | Gerente | TechStore Miraflores |
| Empleado de Ventas | `empleado@techstore.com` | `Empleado2024E1!` | Empleado | TechStore Lima Centro |
| Auditor | `auditor@techstore.com` | `Auditor2024Au1!` | Auditor | — |

> **Nota de seguridad:** Todas las contraseñas cumplen los requisitos mínimos: 8+ caracteres, mayúscula, número y carácter especial. Los hashes están generados con bcrypt saltRounds=12.

### pgAdmin (Administración de Base de Datos)

| Campo | Valor |
|-------|-------|
| URL | http://localhost:5050 |
| Email | `admin@techstore.com` |
| Password | `Admin2024!` |

**Configuración del servidor PostgreSQL en pgAdmin:**

| Campo | Valor |
|-------|-------|
| Host | `postgres` |
| Port | `5432` |
| Database | `techstore_db` |
| Username | `techstore_user` |
| Password | `TechStore2024!Secure` |

---

## Flujo de Autenticación MFA

### Primera vez (configuración de MFA)

```
1. Ir a http://localhost:5173/login
2. Ingresar email y contraseña
3. El sistema detecta MFA no configurado
4. Se muestra código QR automáticamente
5. Abrir Google Authenticator en el smartphone
6. Tocar "+" → "Escanear código QR"
7. Apuntar la cámara al QR en pantalla
8. Ingresar el código de 6 dígitos que aparece en la app
9. Click en "Activar MFA y entrar"
10. Acceso al Dashboard según el rol asignado
```

### Logins posteriores

```
1. Ingresar email y contraseña
2. El sistema solicita código MFA
3. Abrir Google Authenticator → buscar TechStore
4. Ingresar el código de 6 dígitos vigente
5. Acceso concedido → Dashboard
```

> **Importante:** El código TOTP cambia cada 30 segundos. Si el código es rechazado, espera al siguiente ciclo.

---

## Módulos del Sistema

### Autenticación (Auth Service)

| Endpoint | Método | Descripción | Autenticación |
|----------|--------|-------------|---------------|
| `/api/auth/register` | POST | Registro de nuevo usuario | Pública |
| `/api/auth/login` | POST | Login con credenciales | Pública |
| `/api/auth/mfa/verify` | POST | Verificar código TOTP | Pública (tempToken) |
| `/api/auth/mfa/setup/:userId` | GET | Obtener QR para configurar MFA | Pública |
| `/api/auth/mfa/setup/confirm` | POST | Confirmar primer código TOTP | Pública |
| `/api/auth/me` | GET | Datos del usuario autenticado | JWT requerido |
| `/api/auth/tiendas` | GET | Listar tiendas activas | Pública |

### RBAC — Roles (RBAC Service)

| Endpoint | Método | Descripción | Rol requerido |
|----------|--------|-------------|---------------|
| `/api/roles` | GET | Listar todos los roles | Todos |
| `/api/roles/:id` | GET | Obtener rol por ID | Todos |
| `/api/roles` | POST | Crear nuevo rol | **Admin** |
| `/api/roles/:id` | PUT | Modificar rol | **Admin** |
| `/api/roles/:id` | DELETE | Eliminar rol | **Admin** |

### RBAC — Usuarios (RBAC Service)

| Endpoint | Método | Descripción | Rol requerido |
|----------|--------|-------------|---------------|
| `/api/users` | GET | Listar usuarios | **Admin** |
| `/api/users/:id` | GET | Obtener usuario | **Admin** |
| `/api/users` | POST | Crear usuario | **Admin** |
| `/api/users/:id` | PUT | Modificar usuario | **Admin** |
| `/api/users/:id` | DELETE | Desactivar usuario | **Admin** |
| `/api/users/:id/roles` | POST | Asignar rol a usuario | **Admin** |
| `/api/users/:id/roles/:rolId` | DELETE | Remover rol de usuario | **Admin** |

### ABAC — Productos (Product Service)

| Endpoint | Método | Descripción | Política ABAC |
|----------|--------|-------------|---------------|
| `/api/products` | GET | Listar productos | Admin/Auditor: todos · Gerente/Empleado: su tienda |
| `/api/products/:id` | GET | Obtener producto | Mismo filtro que GET |
| `/api/products` | POST | Crear producto | Admin: cualquier tienda · Gerente: su tienda · Empleado: no premium |
| `/api/products/:id` | PUT | Actualizar producto | Admin: todos los campos · Gerente: sin categoría · Empleado: solo stock |
| `/api/products/:id` | DELETE | Eliminar producto | Admin: cualquiera · Gerente: no premium de su tienda · Empleado/Auditor: sin acceso |
| `/api/products/audit` | GET | Ver audit log | **Admin** y **Auditor** |

---

## Casos de Prueba

### Escenario 1: Login con MFA
```
Usuario:  gerente@techstore.com
Acción:   Ingresar credenciales correctas → Sistema solicita código MFA
          Ingresar código de Google Authenticator
Resultado: Acceso concedido → Dashboard de Gerente (solo su tienda)
```

### Escenario 2: Bloqueo por intentos fallidos
```
Usuario:  cualquier usuario
Acción:   Ingresar contraseña incorrecta 5 veces consecutivas
Resultado: "Cuenta bloqueada por 15 minutos tras 5 intentos fallidos"
```

### Escenario 3: RBAC — Empleado intenta crear rol
```
Usuario:  empleado@techstore.com (Rol: Empleado)
Acción:   Intentar acceder a /roles vía URL directa
Resultado: Redirigido al Dashboard — sin acceso al módulo de roles
```

### Escenario 4: ABAC — Empleado intenta eliminar producto
```
Usuario:  empleado@techstore.com (Rol: Empleado)
Producto: Mouse Logitech MX (Tienda: Lima Centro)
Acción:   DELETE
Resultado: Denegado — "Empleados no pueden eliminar productos"
```

### Escenario 5: ABAC — Empleado solo puede modificar stock
```
Usuario:  empleado@techstore.com (Rol: Empleado)
Producto: Mouse Logitech MX (Tienda: Lima Centro)
Acción:   UPDATE precio → Modal solo muestra campo "Stock"
          UPDATE stock a 45 → Permitido
Resultado: Solo campo stock editable según política ABAC
```

### Escenario 6: ABAC — Gerente modifica producto premium de su tienda
```
Usuario:  gerente@techstore.com (Tienda: Lima Centro)
Producto: Laptop HP ProBook (Tienda: Lima Centro, Premium: true)
Acción:   UPDATE precio → Permitido
          UPDATE categoría → Denegado — "Gerentes no pueden modificar la categoría"
Resultado: Precio actualizado, modificación de categoría rechazada
```

### Escenario 7: ABAC — Gerente intenta eliminar producto premium
```
Usuario:  gerente@techstore.com (Tienda: Lima Centro)
Producto: Laptop HP ProBook (Premium: true)
Acción:   DELETE
Resultado: Botón eliminar no visible — política ABAC bloquea productos premium
```

### Escenario 8: ABAC — Auditor solo lectura
```
Usuario:  auditor@techstore.com (Rol: Auditor)
Acción:   Navegar a Productos
Resultado: Ve todos los productos de todas las tiendas
           Sin botones de crear, editar ni eliminar
           Acceso al Audit Log completo
```

### Escenario 9: RBAC — Admin no puede eliminar rol con usuarios
```
Usuario:  admin@techstore.com (Rol: Admin)
Acción:   Intentar eliminar rol "Empleado"
Resultado: Denegado — "No se puede eliminar: tiene X usuarios asignados"
```

### Escenario 10: Seguridad — Acceso sin autenticación
```
Sin sesión activa
Acción:   Acceder a /dashboard, /users, /roles directamente
Resultado: Redirigido a /login en todos los casos
```

---

## Variables de Entorno

El archivo `.env` en la raíz del proyecto contiene todas las variables necesarias para Docker Compose:

```env
# ── PostgreSQL ──────────────────────────────
POSTGRES_DB=techstore_db
POSTGRES_USER=techstore_user
POSTGRES_PASSWORD=TechStore2024!Secure

# ── pgAdmin ─────────────────────────────────
PGADMIN_EMAIL=admin@techstore.com
PGADMIN_PASSWORD=Admin2024!

# ── JWT ─────────────────────────────────────
JWT_SECRET=techstore_jwt_ultra_secret_2024_!@#$%
JWT_EXPIRES_IN=8h
JWT_MFA_TEMP_EXPIRES_IN=5m

# ── URLs internas Docker ─────────────────────
AUTH_SERVICE_URL=http://auth-service:3001
RBAC_SERVICE_URL=http://rbac-service:3002
PRODUCT_SERVICE_URL=http://product-service:3003

# ── Puertos expuestos ────────────────────────
GATEWAY_PORT=3000
AUTH_PORT=3001
RBAC_PORT=3002
PRODUCT_PORT=3003
PGADMIN_PORT=5050
```

> **Seguridad:** El archivo `.env` está incluido en `.gitignore` y nunca debe subirse al repositorio. En producción, usar secrets managers como AWS Secrets Manager o Docker Secrets.

---

## Base de Datos

### Schemas

```sql
schema: auth      → usuarios, mfa_temp_tokens
schema: rbac      → roles, usuario_roles
schema: inventory → productos, audit_log
schema: public    → tiendas (compartido entre servicios)
```

### Diagrama de tablas

```
public.tiendas
├── id, nombre, ciudad, activo, fecha_creacion

auth.usuarios
├── id, email, password_hash, nombre_completo
├── tienda_id (FK → tiendas)
├── mfa_habilitado, mfa_secret
├── intentos_fallidos, bloqueado_hasta
└── activo, fecha_creacion

auth.mfa_temp_tokens
├── id, usuario_id (FK → usuarios)
├── token_hash, usado, expira_en, creado_en

rbac.roles
├── id, nombre, descripcion, fecha_creacion

rbac.usuario_roles
├── id, usuario_id (FK → usuarios), rol_id (FK → roles)
├── asignado_por (FK → usuarios), fecha_asignacion

inventory.productos
├── id, nombre, descripcion, precio, stock
├── categoria, tienda_id (FK → tiendas)
├── es_premium, creado_por (FK → usuarios)
└── fecha_creacion, fecha_actualizacion (auto-trigger)

inventory.audit_log
├── id, usuario_id (FK → usuarios)
├── accion (CREATE/READ/UPDATE/DELETE)
├── recurso, recurso_id, detalle (JSONB)
└── ip, timestamp
```

### Datos seed incluidos

El archivo `database/init.sql` inicializa automáticamente:

**Tiendas:**
- TechStore Lima Centro (Lima)
- TechStore Miraflores (Lima)  
- TechStore Arequipa (Arequipa)

**Roles:** Admin, Gerente, Empleado, Auditor

**Usuarios de prueba:** 5 usuarios pre-configurados (ver sección Credenciales)

**Productos de prueba:** 8 productos distribuidos entre las 3 tiendas (mix de premium y estándar)

---

## Seguridad Implementada

| Medida | Implementación |
|--------|----------------|
| Hash de contraseñas | bcrypt con saltRounds=12 |
| Autenticación multifactor | TOTP RFC 6238 (otplib) |
| Tokens de sesión | JWT firmados (HS256), expiran en 8h |
| Token temporal MFA | JWT separado, expira en 5 minutos |
| Bloqueo de cuenta | Tras 5 intentos fallidos, 15 minutos |
| Rate limiting | 200 req/15min global, 30 req/15min en auth |
| Headers seguros | helmet.js en todos los servicios |
| Validación de inputs | express-validator en todos los endpoints |
| Aislamiento de red | Red Docker privada entre servicios |
| CORS | Configurado solo para el origen del frontend |

---

*Desarrollado para el curso Desarrollo de Soluciones en la Nube — Instituto Tecsup*
