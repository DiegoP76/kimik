# 🗺️ MAPA TÉCNICO - KimiK v1.1.0

## Resumen del Proyecto

**KimiK** es una PWA full-stack para resolución de conflictos de parejas. Los usuarios publican conflictos con dos opciones, la comunidad vota, y profesionales verificados (psicólogos/terapeutas) pueden dar su opinión experta.

- **Stack**: Next.js 16.2.12, React 19.2.4, Supabase (auth + DB + storage + realtime), Tailwind CSS v4, TypeScript 5
- **Versión**: 1.1.0
- **Idioma**: Español (es-AR)
- **PWA**: Standalone, service worker stale-while-revalidate, push notifications

---

## 1. Estructura de Archivos

```
kimik/
├── middleware.ts                    # Auth + block checks en cada request
├── package.json                    # v1.1.0
├── next.config.ts
├── .env.local
│
├── public/
│   ├── manifest.json               # PWA manifest
│   ├── sw.js                       # Service worker (cache + push)
│   ├── logo.svg                    # Logo principal
│   ├── logo-icon.svg               # Icono app
│   └── icons/
│       ├── icon-192x192.svg
│       └── icon-512x512.svg
│
├── supabase/
│   ├── schema.sql                  # Schema base (5 tablas)
│   └── migrations/
│       ├── 002_add_professional_photo.sql
│       ├── 003_add_categories_and_social.sql
│       ├── 005_add_location_to_conflicts.sql
│       ├── 006_remove_category_check_constraint.sql
│       ├── 007_add_user_blocking_and_admin_policies.sql
│       ├── 008_add_block_reason.sql
│       ├── 009_add_notifications.sql
│       └── 010_fix_rls_policies_and_admin_access.sql
│
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (html + SW registrar)
│   │   ├── page.tsx                # Landing page (/)
│   │   ├── globals.css
│   │   │
│   │   ├── api/
│   │   │   └── notify/route.ts     # POST /api/notify (push notifications)
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx              # /login
│   │   │   ├── register/page.tsx           # /register
│   │   │   ├── forgot-password/page.tsx    # /forgot-password
│   │   │   ├── reset-password/page.tsx     # /reset-password
│   │   │   └── blocked/page.tsx            # /blocked
│   │   │
│   │   └── (protected)/
│   │       ├── feed/page.tsx               # /feed (principal)
│   │       ├── create/page.tsx             # /create
│   │       ├── profile/page.tsx            # /profile
│   │       ├── conflict/[id]/page.tsx      # /conflict/:id
│   │       ├── professional/
│   │       │   ├── page.tsx                # /professional (listado)
│   │       │   ├── register/page.tsx       # /professional/register
│   │       │   └── [id]/page.tsx           # /professional/:id
│   │       └── admin/
│   │           ├── page.tsx                # /admin (dashboard)
│   │           ├── users/page.tsx          # /admin/users
│   │           ├── conflicts/page.tsx      # /admin/conflicts
│   │           ├── categories/page.tsx     # /admin/categories
│   │           └── professionals/
│   │               ├── page.tsx            # /admin/professionals
│   │               └── [id]/page.tsx       # /admin/professionals/:id
│   │
│   ├── components/
│   │   ├── AudioPlayer.tsx          # Reproductor de audio
│   │   ├── AudioRecorder.tsx        # Grabador de audio
│   │   ├── ConflictCard.tsx         # Tarjeta de conflicto (feed)
│   │   ├── Navbar.tsx               # Navegación inferior
│   │   ├── NotificationBell.tsx     # Campana de notificaciones
│   │   └── ServiceWorkerRegistrar.tsx # Registra SW
│   │
│   └── lib/
│       ├── utils.ts                 # cn(), formatTimeAgo()
│       ├── supabase/
│       │   ├── client.ts            # Cliente browser
│       │   ├── server.ts            # Cliente server (no usado actualmente)
│       │   └── middleware.ts        # Cliente middleware
│       └── types/
│           └── database.types.ts    # Tipos TypeScript de DB
```

---

## 2. Esquema de Base de Datos

### Tabla: `profiles`
Extiende `auth.users`. Se crea automáticamente al registrarse via trigger.

| Columna | Tipo SQL | Constraints |
|---------|----------|-------------|
| `id` | UUID | **PK**, FK → auth.users(id) ON DELETE CASCADE |
| `username` | VARCHAR(50) | UNIQUE NOT NULL |
| `avatar_url` | TEXT | nullable |
| `role` | VARCHAR(20) | CHECK IN ('user','professional','admin'), DEFAULT 'user' |
| `is_blocked` | BOOLEAN | DEFAULT FALSE |
| `blocked_until` | TIMESTAMPTZ | nullable |
| `blocked_permanently` | BOOLEAN | DEFAULT FALSE |
| `block_reason` | TEXT | nullable |
| `last_seen_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `push_notifications_enabled` | BOOLEAN | DEFAULT FALSE |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

**Políticas RLS:**
- SELECT: público (true)
- INSERT: auth.uid() = id
- UPDATE: auth.uid() = id
- UPDATE (admin): EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
- DELETE (admin): mismo check admin

---

### Tabla: `conflicts`
Entidad principal — un conflicto de pareja con dos opciones de voto.

| Columna | Tipo SQL | Constraints |
|---------|----------|-------------|
| `id` | UUID | **PK**, DEFAULT gen_random_uuid() |
| `user_id` | UUID | FK → profiles(id) ON DELETE CASCADE |
| `title` | VARCHAR(150) | NOT NULL |
| `description` | TEXT | nullable |
| `audio_url` | TEXT | nullable |
| `option_a` | VARCHAR(100) | NOT NULL |
| `option_b` | VARCHAR(100) | NOT NULL |
| `category` | VARCHAR(50) | nullable (CHECK eliminado en migración 006) |
| `location` | VARCHAR(100) | nullable |
| `is_premium_analysis` | BOOLEAN | DEFAULT FALSE |
| `status` | VARCHAR(20) | CHECK IN ('active','resolved','flagged'), DEFAULT 'active' |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

**Políticas RLS:**
- SELECT: status = 'active' OR auth.uid() = user_id
- INSERT: auth.uid() = user_id
- UPDATE: auth.uid() = user_id
- UPDATE (admin): EXISTS (...)
- DELETE (admin): EXISTS (...)

---

### Tabla: `votes`
Votos de la comunidad sobre conflictos (un voto por usuario por conflicto).

| Columna | Tipo SQL | Constraints |
|---------|----------|-------------|
| `id` | UUID | **PK**, DEFAULT gen_random_uuid() |
| `conflict_id` | UUID | FK → conflicts(id) ON DELETE CASCADE |
| `user_id` | UUID | FK → profiles(id) ON DELETE CASCADE |
| `selected_option` | CHAR(1) | CHECK IN ('A','B') |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

**Constraints únicos:** `UNIQUE(conflict_id, user_id)`

**Políticas RLS:**
- SELECT: público
- INSERT: auth.uid() = user_id
- UPDATE: auth.uid() = user_id
- DELETE (propietario): auth.uid() = user_id
- DELETE (admin): EXISTS (...)

---

### Tabla: `professional_profiles`
Perfiles de profesionales (psicólogos/terapeutas) vinculados 1:1 a profiles.

| Columna | Tipo SQL | Constraints |
|---------|----------|-------------|
| `id` | UUID | **PK**, DEFAULT gen_random_uuid() |
| `user_id` | UUID | FK → profiles(id) ON DELETE CASCADE, UNIQUE |
| `license_number` | VARCHAR(100) | NOT NULL |
| `specialty` | VARCHAR(100) | nullable |
| `bio` | TEXT | nullable |
| `photo_url` | TEXT | nullable |
| `instagram` | VARCHAR(100) | nullable |
| `whatsapp` | VARCHAR(20) | nullable |
| `is_verified` | BOOLEAN | DEFAULT FALSE |
| `rating` | DECIMAL(3,2) | DEFAULT 0.0 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

**Políticas RLS:**
- SELECT: público
- INSERT: auth.uid() = user_id
- UPDATE: auth.uid() = user_id
- DELETE (admin): EXISTS (...)

---

### Tabla: `professional_opinions`
Opiniones expertas sobre conflictos.

| Columna | Tipo SQL | Constraints |
|---------|----------|-------------|
| `id` | UUID | **PK**, DEFAULT gen_random_uuid() |
| `conflict_id` | UUID | FK → conflicts(id) ON DELETE CASCADE |
| `professional_id` | UUID | FK → professional_profiles(id) ON DELETE CASCADE |
| `selected_option` | CHAR(1) | CHECK IN ('A','B') |
| `feedback_text` | TEXT | nullable |
| `audio_url` | TEXT | nullable |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

**Constraints únicos:** `UNIQUE(conflict_id, professional_id)`

**Políticas RLS:**
- SELECT: público
- INSERT: auth.uid() = (SELECT user_id FROM professional_profiles WHERE id = professional_id)
- DELETE (admin): EXISTS (...)

---

### Tabla: `categories`
Categorías configurables de conflictos.

| Columna | Tipo SQL | Constraints |
|---------|----------|-------------|
| `id` | UUID | **PK**, DEFAULT gen_random_uuid() |
| `name` | VARCHAR(50) | NOT NULL, UNIQUE |
| `slug` | VARCHAR(50) | NOT NULL, UNIQUE |
| `is_active` | BOOLEAN | DEFAULT TRUE |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

**Datos iniciales (seed):** convivencia, celos, dinero, familia, otros

**Políticas RLS:**
- SELECT: is_active = true
- ALL (admin): EXISTS (...)

---

### Tabla: `push_subscriptions`
Suscripciones a notificaciones push web.

| Columna | Tipo SQL | Constraints |
|---------|----------|-------------|
| `id` | UUID | **PK**, DEFAULT gen_random_uuid() |
| `user_id` | UUID | FK → profiles(id) ON DELETE CASCADE |
| `endpoint` | TEXT | NOT NULL |
| `p256dh` | TEXT | NOT NULL |
| `auth` | TEXT | NOT NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

**Constraints únicos:** `UNIQUE(user_id, endpoint)`

**Políticas RLS:**
- SELECT/INSERT/DELETE: auth.uid() = user_id

---

### Funciones de Base de Datos

| Función | Descripción |
|---------|-------------|
| `handle_new_user()` | Trigger en auth.users INSERT: auto-crea fila en profiles con username del metadata o email |
| `get_vote_counts(conflict_uuid UUID)` | Retorna `{ option_a_count, option_b_count }` para un conflicto. SECURITY DEFINER |
| `auto_unblock_users()` | Define pero no adjunta como trigger (migración 007) |
| `handle_user_login()` | Define pero no adjunta como trigger (migración 007) |

### Storage Buckets

| Bucket | Acceso | Uso |
|--------|--------|-----|
| `conflict-audios` | Público (lectura), autenticado (escritura) | Grabaciones de audio de conflictos |
| `professional-photos` | Público (lectura), autenticado (escritura/borrado) | Fotos de perfil profesional |

---

## 3. Tipos TypeScript (database.types.ts)

### profiles
```typescript
Row: {
  id: string;
  username: string;
  avatar_url: string | null;
  role: "user" | "professional" | "admin";
  is_blocked: boolean;
  blocked_until: string | null;
  blocked_permanently: boolean;
  block_reason: string | null;
  last_seen_at: string;
  push_notifications_enabled: boolean;
  created_at: string;
}
Insert: { id, username requeridos; resto opcional }
Update: { todos opcionales }
```

### conflicts
```typescript
Row: {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  audio_url: string | null;
  option_a: string;
  option_b: string;
  category: string;
  location: string | null;
  is_premium_analysis: boolean;
  status: "active" | "resolved" | "flagged";
  created_at: string;
}
Insert: { user_id, title, option_a, option_b, category requeridos; id opcional }
Update: { todos opcionales }
```

### votes
```typescript
Row: {
  id: string;
  conflict_id: string;
  user_id: string;
  selected_option: "A" | "B";
  created_at: string;
}
Insert: { conflict_id, user_id, selected_option requeridos; id opcional }
Update: { todos opcionales }
```

### professional_profiles
```typescript
Row: {
  id: string;
  user_id: string;
  license_number: string;
  specialty: string | null;
  bio: string | null;
  photo_url: string | null;
  instagram: string | null;
  whatsapp: string | null;
  is_verified: boolean;
  rating: number;
  created_at: string;
}
Insert: { user_id, license_number requeridos; id opcional }
Update: { todos opcionales }
```

### professional_opinions
```typescript
Row: {
  id: string;
  conflict_id: string;
  professional_id: string;
  selected_option: "A" | "B";
  feedback_text: string | null;
  audio_url: string | null;
  created_at: string;
}
Insert: { conflict_id, professional_id, selected_option requeridos; id opcional }
Update: { todos opcionales }
```

### categories
```typescript
Row: {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}
Insert: { name, slug requeridos; id opcional }
Update: { todos opcionales }
```

### push_subscriptions
```typescript
Row: {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}
Insert: { user_id, endpoint, p256dh, auth requeridos; id opcional }
Update: { todos opcionales }
```

### Functions
```typescript
Functions: {
  get_vote_counts: {
    Args: { conflict_uuid: string };
    Returns: { option_a_count: number; option_b_count: number }[];
  };
}
```

---

## 4. API Routes y Data Fetching

### Server Actions
**No hay.** Cero directivas `"use server"` en todo el código. Todas las mutaciones se hacen via llamadas client-side a Supabase.

### API Routes

| Ruta | Método | Archivo | Descripción |
|------|--------|---------|-------------|
| `/api/notify` | POST | `src/app/api/notify/route.ts` | Envía push notifications a suscriptores |

**POST /api/notify** - Body: `{ conflictId, title, author }`
- Consulta `push_subscriptions` excluyendo al autor
- Prepara payloads (stub — requiere VAPID keys para producción)
- Elimina suscripciones inválidas

### Patrón de Data Fetching (Client-Side)

Todas las páginas usan `"use client"` y fetchean datos así:

```
useEffect() al montar
    ↓
supabase.auth.getUser() → obtiene usuario
    ↓
supabase.from("...").select("...") → consulta DB
    ↓
setState() → renderiza
    ↓
Opcional: supabase.channel() → suscripción Realtime
```

### Conexiones a DB por Función

| Función | Página/Componente | Consulta Supabase |
|---------|-------------------|-------------------|
| **Feed de conflictos** | `feed/page.tsx` | `.from("conflicts").select("*, profiles(...), votes(...), professional_opinions(...)")` con filtros (hot/new/top/mine) |
| **Registrar voto** | `ConflictCard.tsx` + `conflict/[id]/page.tsx` | `.from("votes").insert({ conflict_id, user_id, selected_option })` |
| **Crear conflicto** | `create/page.tsx` | `.from("conflicts").insert({...})` + `fetch("/api/notify")` |
| **Contar votos** | `ConflictCard.tsx` + `conflict/[id]/page.tsx` | `.rpc("get_vote_counts", { conflict_uuid })` |
| **Listar profesionales** | `professional/page.tsx` | `.from("professional_profiles").select("*, profiles(...)").eq("is_verified", true)` |
| **Opiniones profesionales** | `conflict/[id]/page.tsx` | `.from("professional_opinions").select("*, professional_profiles(...)")` |

### Filtros del Feed

| Filtro | Condición | Orden | Límite |
|--------|-----------|-------|--------|
| **Popular** | created_at > now() - 7 días | created_at DESC | 20 |
| **Nuevo** | status = 'active' | created_at DESC | 20 |
| **Top** | status = 'active' | vote_count DESC | 50 |
| **Míos** | user_id = currentUser | created_at DESC | 100 |

---

## 5. Componentes

### `ConflictCard` (`src/components/ConflictCard.tsx`)
- **Props**: `{ conflict: ConflictWithVotes; onVote?: (conflictId, option) => void }`
- **Interfaz ConflictWithVotes**: id, title, description, audio_url, option_a, option_b, category, location, created_at, profiles{username, avatar_url}, votes[{selected_option}], professional_opinions[{id}]
- **Función**: Tarjeta completa con autor, título, descripción expandible, player de audio, dos botones de voto (A/B) con barras de porcentaje, conteo de votos, ubicación, cantidad de opiniones profesionales
- **Realtime**: Suscripción a cambios en votos via `get_vote_counts` RPC
- **Colores**: dinámicos — verde para opción ganadora, rojo para perdedora
- **Usado por**: `feed/page.tsx`

### `AudioRecorder` (`src/components/AudioRecorder.tsx`)
- **Props**: `{ onRecordingComplete: (blob: Blob) => void; maxDuration?: number }` (default 60s)
- **Función**: Graba audio via MediaRecorder API. Muestra botones start/stop/cancel con timer. Output: blobs `audio/webm`
- **Usado por**: `create/page.tsx`

### `AudioPlayer` (`src/components/AudioPlayer.tsx`)
- **Props**: `{ src: string }`
- **Función**: Elemento `<audio>` HTML5 con botón play/pause, barra de progreso y display de tiempo
- **Usado por**: `ConflictCard`, `conflict/[id]/page.tsx`, `professional/[id]/page.tsx`

### `Navbar` (`src/components/Navbar.tsx`)
- **Props**: ninguno
- **Función**: Barra de navegación inferior fija con 4 tabs: Inicio (/feed), Crear (/create), Expertos (/professional), Perfil (/profile). Resalta ruta activa. Safe-area-bottom para iOS
- **Usado por**: `feed`, `create`, `profile`, `conflict/[id]`, `professional`

### `NotificationBell` (`src/components/NotificationBell.tsx`)
- **Props**: ninguno
- **Función**: Campana con badge de conteo. Fetch conflictos creados después de `last_seen_at`. Suscripción Realtime a INSERT en conflicts. Modal con lista de conflictos nuevos. Al abrir, marca como vistos
- **Usado por**: `feed/page.tsx`

### `ServiceWorkerRegistrar` (`src/components/ServiceWorkerRegistrar.tsx`)
- **Props**: ninguno
- **Función**: Registra `/sw.js` al montar. No renderiza nada
- **Usado por**: `layout.tsx` (root layout — presente en todas las páginas)

---

## 6. Rutas y Páginas

### `/` — Landing Page
- **Archivo**: `src/app/page.tsx`
- **Tipo**: Server Component (sin `"use client"`)
- **Datos**: ninguno
- **Función**: Marketing page con logo, dos cards de features (Vota y decide, Dictamen profesional), CTAs a /register y /login

### `/login` — Login
- **Archivo**: `src/app/(auth)/login/page.tsx`
- **Datos**: `supabase.auth.signInWithPassword({ email, password })`
- **Links**: /register, /forgot-password

### `/register` — Registro
- **Archivo**: `src/app/(auth)/register/page.tsx`
- **Datos**: `supabase.auth.signUp({ email, password, options: { data: { username } } })`
- **Validación**: username >= 3 caracteres

### `/forgot-password` — Recuperar Contraseña
- **Archivo**: `src/app/(auth)/forgot-password/page.tsx`
- **Datos**: `supabase.auth.resetPasswordForEmail(email, { redirectTo })`

### `/reset-password` — Nueva Contraseña
- **Archivo**: `src/app/(auth)/reset-password/page.tsx`
- **Datos**: `supabase.auth.verifyOtp({ token_hash, type: "recovery" })` + `supabase.auth.updateUser({ password })`

### `/blocked` — Cuenta Bloqueada
- **Archivo**: `src/app/(auth)/blocked/page.tsx`
- **Datos**: Consulta profile para estado de bloqueo
- **Muestra**: bloqueo permanente vs temporal con fecha, razón, botón logout

### `/feed` — Feed Principal
- **Archivo**: `src/app/(protected)/feed/page.tsx`
- **Datos**: Conflictos con profiles, votes, professional_opinions. Filtros: hot/new/top/mine
- **Componentes**: ConflictCard, Navbar, NotificationBell
- **Realtime**: Suscripción a INSERT en conflicts

### `/create` — Crear Conflicto
- **Archivo**: `src/app/(protected)/create/page.tsx`
- **Datos**: Categories (select), upload audio a Storage, insert conflict, POST /api/notify
- **Componentes**: Navbar, AudioRecorder
- **Campos**: título (requerido, 150 max), descripción, audio, opción A (requerido), opción B (requerido), categoría (select), ubicación
- **Popup confirmación**: Revisar / Publicar

### `/profile` — Perfil de Usuario
- **Archivo**: `src/app/(protected)/profile/page.tsx`
- **Datos**: Profile, conteo de conflictos, conteo de votos
- **Funciones**: togglePushNotifications (subscribe/unsubscribe con VAPID key), handleLogout

### `/conflict/:id` — Detalle de Conflicto
- **Archivo**: `src/app/(protected)/conflict/[id]/page.tsx`
- **Datos**: Conflict con profiles, professional_opinions con professional_profiles. RPC get_vote_counts. Vote existente del usuario
- **Realtime**: Suscripción a votes filtrado por conflict_id
- **Funciones**: handleVote (insert + UI optimista)

### `/professional` — Listado de Profesionales
- **Archivo**: `src/app/(protected)/professional/page.tsx`
- **Datos**: professional_profiles verified, con profiles (username, avatar_url), ordenados por rating
- **WhatsApp**: Link a `wa.me/549{whatsapp}`

### `/professional/register` — Registrar como Profesional
- **Archivo**: `src/app/(protected)/professional/register/page.tsx`
- **Datos**: Upload foto a Storage, insert professional_profiles, update role a "professional"
- **Campos**: foto (opcional, max 2MB), license_number (requerido), specialty, bio, instagram, whatsapp

### `/professional/:id` — Detalle Profesional
- **Archivo**: `src/app/(protected)/professional/[id]/page.tsx`
- **Datos**: Professional profile con profiles. Opiniones del profesional con conflicts
- **Muestra**: foto, username, badge verificado, specialty, rating, bio, instagram, whatsapp, lista de opiniones

### `/admin` — Dashboard Admin
- **Archivo**: `src/app/(protected)/admin/page.tsx`
- **Datos**: Conteo de profiles, conflicts, votes, professional_profiles pendientes
- **Links**: /admin/users, /admin/professionals, /admin/conflicts, /admin/categories

### `/admin/users` — Gestión de Usuarios
- **Archivo**: `src/app/(protected)/admin/users/page.tsx`
- **Datos**: Todos los profiles
- **Funciones**: handleSaveEdit, handleBlockTemporary (3/7/15/30 días + razón), handleBlockPermanent, handleUnblock, handleDelete (cascade: votes → conflicts → professional_profiles → profile)

### `/admin/conflicts` — Gestión de Conflictos
- **Archivo**: `src/app/(protected)/admin/conflicts/page.tsx`
- **Datos**: Conflicts con profiles, votes, categories
- **Funciones**: handleSaveEdit (todos los campos), handleDelete (cascade: votes → professional_opinions → conflict), handleStatusChange

### `/admin/categories` — Gestión de Categorías
- **Archivo**: `src/app/(protected)/admin/categories/page.tsx`
- **Datos**: Categories
- **Funciones**: handleAdd (con slug auto-generado), handleUpdate, handleToggleActive, handleDelete

### `/admin/professionals` — Gestión de Profesionales
- **Archivo**: `src/app/(protected)/admin/professionals/page.tsx`
- **Datos**: professional_profiles con profiles
- **Funciones**: handleVerify (aprobar: is_verified=true + role="professional", rechazar: delete profile)

### `/admin/professionals/:id` — Editar Profesional
- **Archivo**: `src/app/(protected)/admin/professionals/[id]/page.tsx`
- **Datos**: professional_profile con profiles
- **Funciones**: handleSave (update todos los campos), handleDelete (delete + revert role a "user")

---

## 7. Middleware (Request Lifecycle)

```
Request llega
  → middleware.ts llama updateSession()
    → Crea Supabase server client con cookies del request
    → Llama supabase.auth.getUser() para refrescar sesión
    → Si la ruta es protegida (/feed, /create, /profile, /professional, /admin):
        → ¿Sin usuario? → Redirect a /login
    → Si hay usuario:
        → Consulta profiles: is_blocked, blocked_until, blocked_permanently
        → ¿Bloqueado permanente? → Redirect a /blocked
        → ¿Bloqueado temporal + no expiró? → Redirect a /blocked
        → ¿Bloqueado temporal + expiró? → Auto-desbloquear, continuar
    → Retorna response con cookies refrescadas
```

---

## 8. Realtime Subscriptions

| Ubicación | Tabla | Evento | Filtro |
|-----------|-------|--------|--------|
| `feed/page.tsx` | conflicts | INSERT | — |
| `ConflictCard.tsx` | votes | INSERT/UPDATE/DELETE | conflict_id |
| `conflict/[id]/page.tsx` | votes | INSERT/UPDATE/DELETE | conflict_id |
| `NotificationBell.tsx` | conflicts | INSERT | — |

---

## 9. Service Worker (`public/sw.js`)

- **Cache name**: `kimik-v1.1.0`
- **Estrategia**: Stale-while-revalidate para GET; network-only para `/auth/`, `/api/`, `/login`, `/register`
- **Push handler**: Parsea payload JSON con `title`, `body`, `url`; muestra notificación con acción "Ver conflicto"
- **Notification click**: Enfrena ventana existente o abre nueva en la URL del conflicto

---

## 10. Arquitectura de Clientes Supabase

| Archivo | Entorno | Función | Usado por |
|---------|---------|---------|-----------|
| `src/lib/supabase/client.ts` | Browser (`"use client"`) | `createBrowserClient(url, anonKey)` | Todas las páginas y componentes client |
| `src/lib/supabase/server.ts` | Server (async, lee cookies) | `createServerClient(url, anonKey, { cookies })` | **No usado actualmente** (sin data fetching server-side) |
| `src/lib/supabase/middleware.ts` | Middleware | `createServerClient` con cookies de request/response | `middleware.ts` (root) |

---

## 11. Utilidades (`src/lib/utils.ts`)

```typescript
cn(...inputs: ClassValue[]): string
// Fusiona clases Tailwind usando clsx + twMerge

formatTimeAgo(date: string | Date): string
// Retorna tiempo relativo en español: "ahora", "5m", "3h", "2d", o "15 ene"
```

---

## 12. Notas Arquitectónicas

1. **Sin Server Components para data fetching**: Todas las páginas usan `"use client"` con llamadas client-side a Supabase. El server client (`lib/supabase/server.ts`) existe pero no lo importa ninguna página.

2. **Sin Server Actions**: Todas las mutaciones se hacen via llamadas directas del Supabase client desde el browser.

3. **Sin API routes para datos**: La única API route (`/api/notify`) es para push notifications. Todas las operaciones CRUD van directo del cliente a Supabase.

4. **Autorización admin es client-side**: Las páginas de admin verifican `profile.role === "admin"` en useEffect. Las políticas RLS del server proveen el boundary de seguridad real.

5. **PWA lista**: manifest.json, service worker, y componente ServiceWorkerRegistrar configurados.

6. **Solo español**: Todo el UI está en español (locale es-AR para fechas).

7. **Mobile-first**: Layout `max-w-lg mx-auto`, navbar inferior, safe-area-inset-bottom para iOS.

---

## 13. Dependencias Principales

| Paquete | Versión | Uso |
|---------|---------|-----|
| next | 16.2.12 | Framework |
| react | 19.2.4 | UI |
| @supabase/ssr | — | Auth con cookies |
| @supabase/supabase-js | — | Cliente Supabase |
| lucide-react | — | Iconos |
| clsx + tailwind-merge | — | Utility classes |
| tailwindcss | v4 | CSS framework |
