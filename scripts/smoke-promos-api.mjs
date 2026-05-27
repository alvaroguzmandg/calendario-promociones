const baseUrl = process.env.TEST_BASE_URL || process.argv[2];

if (!baseUrl) {
  console.error('Uso: TEST_BASE_URL=https://tu-app.vercel.app node scripts/smoke-promos-api.mjs');
  process.exit(1);
}

const apiUrl = new URL('/api/promos', baseUrl).toString();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const createdTitle = `SMOKE TEST ${stamp}`;
const editedTitle = `SMOKE TEST EDITADO ${stamp}`;

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log(`Probando ${apiUrl}`);

const createBody = {
  title: createdTitle,
  startDate: '2026-06-10',
  endDate: '2026-06-12',
  country: 'Argentina',
  channel: 'Online',
  branches: 'Smoke test',
  linkUrl: '',
  notes: 'Promo ficticia creada por smoke test.'
};

const created = await request(apiUrl, {
  method: 'POST',
  body: JSON.stringify(createBody)
});
const promo = created.promo;
assert(promo?.id, 'La promo creada no devolvio id.');
console.log(`Creada: ${promo.id}`);

const afterCreate = await request(apiUrl);
assert(afterCreate.promos.some((item) => item.id === promo.id && item.title === createdTitle), 'La promo creada no aparece en GET.');
console.log('GET despues de crear: OK');

const updated = await request(apiUrl, {
  method: 'PUT',
  body: JSON.stringify({
    ...promo,
    title: editedTitle,
    startDate: '2026-06-11',
    endDate: '2026-06-13',
    notes: 'Promo ficticia editada por smoke test.'
  })
});
assert(updated.promo?.title === editedTitle, 'La promo editada no devolvio el titulo esperado.');
console.log('Editada: OK');

const afterUpdate = await request(apiUrl);
assert(afterUpdate.promos.some((item) => item.id === promo.id && item.title === editedTitle && item.startDate === '2026-06-11'), 'La promo editada no aparece actualizada en GET.');
console.log('GET despues de editar: OK');

await request(`${apiUrl}?id=${encodeURIComponent(promo.id)}`, {
  method: 'DELETE'
});
console.log('Eliminada: OK');

const afterDelete = await request(apiUrl);
assert(!afterDelete.promos.some((item) => item.id === promo.id), 'La promo eliminada todavia aparece en GET.');
console.log('GET despues de eliminar: OK');

console.log('Smoke test completo: OK');
