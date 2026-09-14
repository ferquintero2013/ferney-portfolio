# Log de consultas del asistente — configuración

El endpoint registra cada consulta en Supabase. **Mientras no existan las
variables de entorno no registra nada y el asistente funciona igual**, así
que se puede desplegar antes de configurarlo.

## 1. Crear la tabla en Supabase

En el SQL Editor del proyecto:

```sql
create table public.consultas_asistente (
  id          uuid primary key default gen_random_uuid(),
  creado_en   timestamptz not null default now(),
  pregunta    text not null,
  query_usada text,
  respuesta   text,
  mood        text,
  fuentes     jsonb,
  ms          integer
);

-- Consultas habituales: las más recientes primero, y los huecos del corpus.
create index on public.consultas_asistente (creado_en desc);
create index on public.consultas_asistente (mood);

alter table public.consultas_asistente enable row level security;

-- La clave anónima SOLO puede insertar. Si algún día se filtra, quien la
-- tenga puede escribir basura pero no puede leer qué ha preguntado la
-- gente. Leer se hace desde el panel de Supabase o con la service_role,
-- que nunca sale del navegador.
create policy "insertar desde el asistente"
  on public.consultas_asistente
  for insert
  to anon
  with check (true);
```

## 2. Poner las variables en Vercel

En **Settings → Environment Variables** del proyecto `ferney-portfolio`:

| Variable | De dónde sale |
|---|---|
| `SUPABASE_URL` | Supabase → Settings → API → *Project URL* |
| `SUPABASE_KEY` | Supabase → Settings → API → *Project API keys* → **anon public** |

Usa la clave **anon**, no la `service_role`. Con la política de arriba, la
anon solo puede insertar; la `service_role` puede leerlo y borrarlo todo, y
no hay razón para que viva en una función pública.

Después de guardarlas hay que **redesplegar** para que la función las vea.

## 3. Comprobar que entra

Haz una pregunta en el sitio y luego, en el SQL Editor:

```sql
select creado_en, mood, pregunta, ms
from consultas_asistente
order by creado_en desc
limit 10;
```

Si no aparece nada, el motivo estará en los logs de la función en Vercel:
el módulo escribe ahí por qué falló (tabla inexistente, RLS mal puesto,
clave incorrecta).

## Para qué sirve el log

La consulta que más valor tiene es la de los huecos del corpus — preguntas
que el asistente no supo responder:

```sql
select creado_en, pregunta, respuesta
from consultas_asistente
where mood in ('declined', 'unsure')
order by creado_en desc;
```

`declined` es el bot diciendo honestamente que no lo sabe: si la pregunta
se repite, es contenido que falta en el perfil. `unsure` es una respuesta
larga sin citar ninguna fuente, que es la señal de que el modelo habló sin
respaldo — eso hay que mirarlo siempre.

Y lo que la gente pregunta de verdad:

```sql
select date_trunc('day', creado_en) as dia, count(*) as consultas
from consultas_asistente
group by 1 order by 1 desc;
```

## Qué NO se guarda

Ni IP, ni navegador, ni cookie, ni identificador de sesión. Solo el
contenido de la conversación. Por eso el log no recoge datos personales y
no hace falta aviso de privacidad en el sitio.
