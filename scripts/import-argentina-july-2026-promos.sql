with incoming(title, start_date, end_date, country, channel, branches, link_url, notes) as (
  values
    ('40% en plumones (acolchados pluma sintetica)', '2026-07-01'::date, '2026-07-02'::date, 'Argentina', 'Locales + Online', 'Argentina', '', 'Accion principal.' || chr(10) || 'Fuente: Plan comercial Argentina julio/agosto 2026.'),
    ('Promo unico dia partido ARG: 30% sabanas / 40% plumones', '2026-07-03'::date, '2026-07-03'::date, 'Argentina', 'Locales + Online', 'Argentina', '', 'Accion principal. Sabanas: juegos y ajustables. Plumones: acolchados pluma sintetica.' || chr(10) || 'Fuente: Plan comercial Argentina julio/agosto 2026.'),
    ('40% en plumones (acolchados pluma sintetica)', '2026-07-04'::date, '2026-07-05'::date, 'Argentina', 'Locales + Online', 'Argentina', '', 'Accion principal.' || chr(10) || 'Fuente: Plan comercial Argentina julio/agosto 2026.'),
    ('30% en acolchados seleccionados (nivel 4)', '2026-07-06'::date, '2026-07-06'::date, 'Argentina', 'Locales + Online', 'Argentina', '', 'Accion principal.' || chr(10) || 'Fuente: Plan comercial Argentina julio/agosto 2026.'),
    ('Promo unico dia partido ARG: 30% sabanas / 30% acolchados nivel 4', '2026-07-07'::date, '2026-07-07'::date, 'Argentina', 'Locales + Online', 'Argentina', '', 'Accion principal. Sabanas: juegos y ajustables.' || chr(10) || 'Fuente: Plan comercial Argentina julio/agosto 2026.'),
    ('30% en acolchados seleccionados (nivel 4)', '2026-07-08'::date, '2026-07-08'::date, 'Argentina', 'Locales + Online', 'Argentina', '', 'Accion principal.' || chr(10) || 'Fuente: Plan comercial Argentina julio/agosto 2026.'),
    ('Promo Hacker - 2x1 almohadas / 30% acolchados nivel 4', '2026-07-09'::date, '2026-07-12'::date, 'Argentina', 'Locales + Online', 'Argentina', '', 'Accion principal.' || chr(10) || 'Fuente: Plan comercial Argentina julio/agosto 2026.'),
    ('REBAJAS hasta 40% Etapa 2', '2026-07-13'::date, '2026-07-15'::date, 'Argentina', 'Locales + Online', 'Argentina', '', 'Accion principal.' || chr(10) || 'Fuente: Plan comercial Argentina julio/agosto 2026.'),
    ('Promo Hacker - 40% en seleccionados invierno', '2026-07-16'::date, '2026-07-26'::date, 'Argentina', 'Locales + Online', 'Argentina', '', 'Accion principal.' || chr(10) || 'Fuente: Plan comercial Argentina julio/agosto 2026.'),
    ('Promo Hacker - 35% en juegos de sabanas estampadas', '2026-07-27'::date, '2026-08-02'::date, 'Argentina', 'Locales + Online', 'Argentina', '', 'Accion principal.' || chr(10) || 'Fuente: Plan comercial Argentina julio/agosto 2026.'),
    ('REBAJAS hasta X% Etapa 3', '2026-08-03'::date, '2026-08-03'::date, 'Argentina', 'Locales + Online', 'Argentina', '', 'Accion principal.' || chr(10) || 'Fuente: Plan comercial Argentina julio/agosto 2026.'),
    ('Secundaria: REBAJAS hasta 40% / sabanas Blend / acolchados queen', '2026-07-01'::date, '2026-07-05'::date, 'Argentina', 'Locales + Online', 'Argentina', '', 'Accion secundaria: REBAJAS hasta 40% / Sabanas Blend queen 79990 / Acolchados queen 89990.' || chr(10) || 'Fuente: Plan comercial Argentina julio/agosto 2026.'),
    ('Secundaria: REBAJAS hasta 40% / sabanas Blend queen 79990', '2026-07-06'::date, '2026-07-06'::date, 'Argentina', 'Locales + Online', 'Argentina', '', 'Accion secundaria.' || chr(10) || 'Fuente: Plan comercial Argentina julio/agosto 2026.'),
    ('Secundaria: REBAJAS hasta 40%', '2026-07-07'::date, '2026-07-07'::date, 'Argentina', 'Locales + Online', 'Argentina', '', 'Accion secundaria.' || chr(10) || 'Fuente: Plan comercial Argentina julio/agosto 2026.'),
    ('Secundaria: REBAJAS hasta 40% / sabanas Blend queen 79990', '2026-07-08'::date, '2026-07-08'::date, 'Argentina', 'Locales + Online', 'Argentina', '', 'Accion secundaria.' || chr(10) || 'Fuente: Plan comercial Argentina julio/agosto 2026.'),
    ('Secundaria: REBAJAS hasta 40% / sabanas Blend / acolchados queen', '2026-07-09'::date, '2026-07-12'::date, 'Argentina', 'Locales + Online', 'Argentina', '', 'Accion secundaria: REBAJAS hasta 40% / Sabanas Blend queen 79990 / Acolchados queen 89990.' || chr(10) || 'Fuente: Plan comercial Argentina julio/agosto 2026.'),
    ('MODO 20% con tope de reintegro $30.000', '2026-07-13'::date, '2026-07-15'::date, 'Argentina', 'Locales + Online', 'Argentina', '', 'Accion secundaria.' || chr(10) || 'Fuente: Plan comercial Argentina julio/agosto 2026.'),
    ('REBAJAS hasta 40% Etapa 2 / MODO 20% reintegro $30.000', '2026-07-16'::date, '2026-07-19'::date, 'Argentina', 'Locales + Online', 'Argentina', '', 'Accion secundaria.' || chr(10) || 'Fuente: Plan comercial Argentina julio/agosto 2026.'),
    ('Secundaria: REBAJAS hasta 40% Etapa 2', '2026-07-20'::date, '2026-08-02'::date, 'Argentina', 'Locales + Online', 'Argentina', '', 'Accion secundaria.' || chr(10) || 'Fuente: Plan comercial Argentina julio/agosto 2026.'),
    ('Dia del nino', '2026-08-03'::date, '2026-08-03'::date, 'Argentina', 'Locales + Online', 'Argentina', '', 'Accion secundaria.' || chr(10) || 'Fuente: Plan comercial Argentina julio/agosto 2026.'),
    ('Financiacion: hasta 12 cuotas sin interes', '2026-07-01'::date, '2026-07-31'::date, 'Argentina', 'Locales + Online', 'Argentina', '', 'Hasta 12 cuotas sin interes. 3 cuotas sin minimo (Visa y Master), 6 con minimo $119.990 y 12 con minimo $199.990.' || chr(10) || 'Fuente: Plan comercial Argentina julio/agosto 2026.')
)
insert into public.promos (title, start_date, end_date, country, channel, branches, link_url, notes)
select title, start_date, end_date, country, channel, branches, link_url, notes
from incoming
where not exists (
  select 1
  from public.promos existing
  where existing.title = incoming.title
    and existing.start_date = incoming.start_date
    and existing.end_date = incoming.end_date
    and existing.country = incoming.country
    and existing.channel = incoming.channel
);
