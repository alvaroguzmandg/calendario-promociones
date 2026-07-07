const baseUrl = process.env.TEST_BASE_URL || process.env.BASE_URL || process.argv[2];
const force = process.argv.includes('--force');

if (!baseUrl) {
  console.error('Uso: BASE_URL=https://tu-app.vercel.app node scripts/import-argentina-july-2026-promos.mjs [--force]');
  process.exit(1);
}

const apiUrl = new URL('/api/promos', baseUrl).toString();
const source = 'Plan comercial Argentina julio/agosto 2026';

const promos = [
  promo('40% en plumones (acolchados pluma sintetica)', '2026-07-01', '2026-07-02', 'Accion principal.'),
  promo('Promo unico dia partido ARG: 30% sabanas / 40% plumones', '2026-07-03', '2026-07-03', 'Accion principal. Sabanas: juegos y ajustables. Plumones: acolchados pluma sintetica.'),
  promo('40% en plumones (acolchados pluma sintetica)', '2026-07-04', '2026-07-05', 'Accion principal.'),
  promo('30% en acolchados seleccionados (nivel 4)', '2026-07-06', '2026-07-06', 'Accion principal.'),
  promo('Promo unico dia partido ARG: 30% sabanas / 30% acolchados nivel 4', '2026-07-07', '2026-07-07', 'Accion principal. Sabanas: juegos y ajustables.'),
  promo('30% en acolchados seleccionados (nivel 4)', '2026-07-08', '2026-07-08', 'Accion principal.'),
  promo('Promo Hacker - 2x1 almohadas / 30% acolchados nivel 4', '2026-07-09', '2026-07-12', 'Accion principal.'),
  promo('REBAJAS hasta 40% Etapa 2', '2026-07-13', '2026-07-15', 'Accion principal.'),
  promo('Promo Hacker - 40% en seleccionados invierno', '2026-07-16', '2026-07-26', 'Accion principal.'),
  promo('Promo Hacker - 35% en juegos de sabanas estampadas', '2026-07-27', '2026-08-02', 'Accion principal.'),
  promo('REBAJAS hasta X% Etapa 3', '2026-08-03', '2026-08-03', 'Accion principal.'),

  promo('Secundaria: REBAJAS hasta 40% / sabanas Blend / acolchados queen', '2026-07-01', '2026-07-05', 'Accion secundaria: REBAJAS hasta 40% / Sabanas Blend queen 79990 / Acolchados queen 89990.'),
  promo('Secundaria: REBAJAS hasta 40% / sabanas Blend queen 79990', '2026-07-06', '2026-07-06', 'Accion secundaria.'),
  promo('Secundaria: REBAJAS hasta 40%', '2026-07-07', '2026-07-07', 'Accion secundaria.'),
  promo('Secundaria: REBAJAS hasta 40% / sabanas Blend queen 79990', '2026-07-08', '2026-07-08', 'Accion secundaria.'),
  promo('Secundaria: REBAJAS hasta 40% / sabanas Blend / acolchados queen', '2026-07-09', '2026-07-12', 'Accion secundaria: REBAJAS hasta 40% / Sabanas Blend queen 79990 / Acolchados queen 89990.'),
  promo('MODO 20% con tope de reintegro $30.000', '2026-07-13', '2026-07-15', 'Accion secundaria.'),
  promo('REBAJAS hasta 40% Etapa 2 / MODO 20% reintegro $30.000', '2026-07-16', '2026-07-19', 'Accion secundaria.'),
  promo('Secundaria: REBAJAS hasta 40% Etapa 2', '2026-07-20', '2026-08-02', 'Accion secundaria.'),
  promo('Dia del nino', '2026-08-03', '2026-08-03', 'Accion secundaria.'),

  promo(
    'Financiacion: hasta 12 cuotas sin interes',
    '2026-07-01',
    '2026-07-31',
    'Hasta 12 cuotas sin interes. 3 cuotas sin minimo (Visa y Master), 6 con minimo $119.990 y 12 con minimo $199.990.'
  )
];

function promo(title, startDate, endDate, notes) {
  return {
    title,
    startDate,
    endDate,
    country: 'Argentina',
    channel: 'Locales + Online',
    branches: 'Argentina',
    linkUrl: '',
    notes: `${notes}\nFuente: ${source}.`
  };
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const body = text ? parseBody(text) : {};
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

function parseBody(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 500) };
  }
}

function samePromo(a, b) {
  return a.title === b.title
    && a.startDate === b.startDate
    && a.endDate === b.endDate
    && a.country === b.country
    && a.channel === b.channel;
}

console.log(`Importando ${promos.length} promociones en ${apiUrl}`);

const current = force ? { promos: [] } : await request(apiUrl);
const existing = Array.isArray(current.promos) ? current.promos : [];
let created = 0;
let skipped = 0;

for (const item of promos) {
  if (existing.some((existingPromo) => samePromo(existingPromo, item))) {
    skipped += 1;
    console.log(`Saltada: ${item.startDate} a ${item.endDate} - ${item.title}`);
    continue;
  }

  const result = await request(apiUrl, {
    method: 'POST',
    body: JSON.stringify(item)
  });
  created += 1;
  console.log(`Creada: ${result.promo?.id || 'sin-id'} - ${item.startDate} a ${item.endDate} - ${item.title}`);
}

console.log(`Import completo. Creadas: ${created}. Saltadas por duplicado: ${skipped}.`);
