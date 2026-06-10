# YourPick

YourPick es una aplicacion Next.js para generar pronosticos de futbol con IA, guardar el historial de analisis y evaluar los resultados reales para alimentar un sistema de aprendizaje.

## Stack

- Next.js 14 con App Router
- React 18
- TypeScript
- Tailwind CSS
- Supabase
- Auth propia con JWT en cookie HTTP-only
- OpenAI GPT-4o

## Requisitos

- Node.js compatible con Next.js 14
- Proyecto Supabase con las tablas esperadas
- Clave de OpenAI si se va a generar analisis reales

## Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
JWT_SECRET=
OPENAI_API_KEY=
```

## Ejecutar localmente

Instala dependencias:

```bash
npm install
```

Inicia el servidor de desarrollo:

```bash
npm run dev
```

En PowerShell, si la politica local bloquea `npm.ps1`, usa:

```powershell
npm.cmd run dev
```

La app queda disponible en:

```text
http://localhost:3000
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Rutas principales

- `/login`: inicio de sesion.
- `/dashboard`: resumen de usuario, cupo diario y analisis pendientes.
- `/analizar`: generacion de nuevos pronosticos.
- `/historial`: listado de analisis del usuario.
- `/historial/[id]`: detalle y evaluacion de un analisis.
- `/perfil`: informacion del usuario.
- `/admin`: dashboard global para administradores.
- `/admin/usuarios`: gestion de usuarios.
- `/admin/analisis`: administracion de analisis.
- `/admin/modelos`: estado de modelos y pesos.
- `/admin/sistema`: reset de pesos y exportaciones.
- `/admin/prompt-editor`: editor del prompt activo.
- `/admin/learning-dashboard`: patrones y reglas de aprendizaje.

## API principal

- `POST /api/auth/login`: valida credenciales y crea la cookie `yp_session`.
- `POST /api/auth/logout`: cierra sesion.
- `POST /api/analyze`: genera y guarda un analisis.
- `GET /api/analyses`: lista analisis con paginacion.
- `GET /api/analyses/[id]`: obtiene un analisis.
- `POST /api/analyses/[id]/evaluate`: evalua un analisis con marcador real.
- `GET /api/stats`: estadisticas del usuario o globales para admin.
- `GET|POST /api/admin/prompt`: obtiene o guarda el prompt activo.
- `GET|POST /api/admin/system/weights`: consulta o reinicia pesos adaptativos.

## Tablas Supabase esperadas

El codigo usa estas tablas:

- `users`
- `daily_usage`
- `analyses`
- `system_weights`
- `prompts`
- `prompt_adjustments`
- `learning_patterns`
- `learning_log`
- `ai_assignment_override` (legacy, ya no se usa para nuevos analisis)

## Flujo funcional

1. El usuario inicia sesion.
2. Solicita el analisis de un partido.
3. El backend valida el cupo diario.
4. El backend usa siempre GPT-4o como motor de analisis.
5. La IA responde un JSON con probabilidades, ganador, marcadores, apuesta recomendada y razonamiento.
6. El analisis se guarda en Supabase con estado `pending`.
7. Al capturar el marcador real, se calcula `win` o `loss`, se guardan aciertos por seccion y se registran patrones de aprendizaje.

## Notas de mantenimiento

- El build ignora errores de ESLint por configuracion de Next, pero `npm run lint` debe usarse antes de cambios importantes.
- El endpoint `/api/debug` debe revisarse antes de produccion.
- Los archivos en `scratch/` son utilidades de diagnostico y no forman parte del flujo principal.
