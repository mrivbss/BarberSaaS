# Despliegue seguro del panel superadmin

Este cambio reemplaza el login heredado por Supabase Auth, cierra el acceso anónimo a
las tablas privadas y agrega la Edge Function `platform-admin`. La migración, la
función y el frontend deben publicarse como un único cambio coordinado.

## 1. Preflight obligatorio

1. Crea un respaldo y prueba primero en un proyecto de staging.
2. Confirma que cada perfil existente corresponde al mismo UUID en Supabase Auth:

```sql
select u.id, u.email
from public.usuarios as u
left join auth.users as a on a.id = u.id
where a.id is null;
```

La consulta debe devolver cero filas. La migración valida esta relación y se detendrá
sin aplicar cambios si encuentra perfiles huérfanos. No cambies UUIDs ni borres
perfiles con historial para forzar el despliegue; primero reconcilia esas cuentas en
un plan de migración específico.

3. Confirma que no haya más de un administrador activo por barbería y que todos los
servicios tengan `barberia_id`. La migración conserva las citas generales con
`barbero_id = null` y valida las relaciones multi-tenant existentes.

## 2. Aplicar base de datos y Edge Function

Con Supabase CLI autenticado y enlazado al proyecto correcto:

```bash
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push
npx supabase secrets set ALLOWED_ORIGINS=https://tu-dominio.cl,http://localhost:5173,http://127.0.0.1:5173
npx supabase functions deploy platform-admin
```

`ALLOWED_ORIGINS` acepta una lista separada por comas. Conserva el dominio de
producción y agrega sólo los orígenes locales que realmente uses; no configures `*`
en esta función administrativa.

`SUPABASE_SERVICE_ROLE_KEY` es un secreto reservado del entorno de Edge Functions.
No lo copies a Vercel, al frontend ni a una variable con prefijo `VITE_`.

La creación administrativa usa `auth.admin.createUser` con `email_confirm: true`, por
lo que no envía correos ni requiere confirmación. Conserva temporalmente estas rutas
de Supabase Auth sólo mientras puedan existir invitaciones emitidas por una versión
anterior:

- Site URL: `https://tu-dominio.cl`
- Redirect heredado: `https://tu-dominio.cl/auth/accept-invite`
- Alias heredados: `https://tu-dominio.cl/establecer-contrasena` y
  `https://tu-dominio.cl/set-password`

No se necesita SMTP ni configurar la plantilla **Invite user** para las cuentas
creadas por el panel actual.

## 3. Crear el único superadmin inicial

El panel no permite crear superadmins. Crea una cuenta dedicada desde Supabase Auth y
copia su UUID. No promociones un administrador de tenant que tenga citas o ganancias
históricas, porque debe conservar su relación con la barbería.

Después crea su perfil una sola vez desde el SQL Editor:

```sql
insert into public.usuarios (
  id,
  nombre,
  email,
  rol,
  barberia_id,
  slug,
  activo
)
select
  id,
  'Nombre del operador',
  email,
  'superadmin',
  null,
  null,
  true
from auth.users
where id = 'UUID_AUTH_DEL_SUPERADMIN';
```

Un índice único impide tener más de un perfil con rol `superadmin`.

## 4. Variables y despliegue de Vercel

Configura únicamente variables públicas en el build del frontend:

```env
VITE_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_publicable_o_anon
VITE_PUBLIC_APP_URL=https://tu-dominio.cl
```

`vercel.json` ya reescribe todas las rutas a `index.html`, por lo que `/platform`,
`/auth/accept-invite` (compatibilidad heredada) y las rutas públicas anidadas
funcionan al recargar.

Orden de corte recomendado durante una ventana de mantenimiento:

1. Aplicar la migración.
2. Desplegar y verificar `platform-admin`.
3. Crear el perfil superadmin inicial.
4. Publicar el frontend nuevo en Vercel.
5. Ejecutar las comprobaciones de la sección siguiente.

## 5. Smoke tests después del despliegue

- Sin sesión, `/platform` redirige a `/login`.
- Una cuenta `admin` o `barbero` no puede abrir `/platform` ni invocar la Edge
  Function.
- El superadmin puede crear una barbería, editarla y desactivarla.
- Un slug de barbería duplicado es rechazado.
- La creación de un `admin` genera una cuenta confirmada y un perfil con el tenant actual.
- La creación de un `barbero` genera una cuenta confirmada, conserva el mismo UUID
  en Auth y `public.usuarios`, crea un slug único dentro del tenant y abre
  `/b/:barberiaSlug/:barberoSlug`.
- Ambos roles pueden iniciar sesión inmediatamente con la contraseña inicial y no
  se genera ningún correo de invitación o confirmación.
- Un correo o slug duplicado se rechaza con un mensaje seguro.
- Una contraseña de menos de ocho caracteres se rechaza en frontend y Edge Function.
- Si falla `public.usuarios`, la Edge Function elimina la cuenta Auth recién creada;
  si esa limpieza falla, solicita revisión administrativa.
- Un tenant inactivo no permite login normal ni reservas públicas.
- `/b/:barberiaSlug` conserva las reservas generales sin asignar barbero.
- Las tablas `usuarios`, `citas` y `ganancias` no son legibles con la clave anónima.
- El bundle de Vercel no contiene claves service-role.

## 6. Transición de la columna `usuarios.password`

Las cuentas heredadas se migraron a Supabase Auth conservando sus UUID y credenciales,
y se verificó el inicio de sesión antes del corte. La migración incremental
`202607200002_fix_general_portal_and_remove_legacy_password.sql` elimina la columna
`usuarios.password`; la aplicación ya no almacena ni compara contraseñas en tablas
públicas.

## 7. Límites conocidos

- `barbero_servicios` existe en el entorno auditado, pero está vacío y la aplicación
  no lo consume; por eso el onboarding no asigna servicios automáticamente.
- La RPC pública valida tenant, barbero, servicio y colisión de horario, pero no
  incorpora CAPTCHA ni rate limiting. Añádelos antes de una exposición de alto
  tráfico o si aparece abuso.
- El repositorio no tenía infraestructura de tests automatizados, lint ni CI. La
  matriz de RLS debe probarse también contra staging con cuentas reales de cada rol.

## 8. Compatibilidad heredada y cambio de contraseña

Las rutas `/auth/accept-invite`, `/establecer-contrasena` y `/set-password` y el
componente `SetPassword` ya no participan en la creación de cuentas nuevas. Se
conservan temporalmente para no invalidar invitaciones emitidas antes de este cambio.
Su eliminación debe hacerse en una limpieza separada, después de confirmar que no
queden enlaces pendientes.

La aplicación no incluye todavía una página general de ajustes de contraseña. Cuando
se implemente, el usuario autenticado puede cambiar su propia credencial sin exponerla
al administrador mediante:

```ts
await supabase.auth.updateUser({ password: newPassword });
```
