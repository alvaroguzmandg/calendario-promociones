const KEY = 'calendario-promos';

const demoPromos = [
  {
    id: 'demo-1',
    title: '10% extra Apple Childs',
    startDate: '2026-05-26',
    endDate: '2026-05-30',
    country: 'Argentina',
    channel: 'Locales',
    branches: 'Todas las sucursales',
    linkUrl: '',
    notes: 'Ejemplo de carga para validar la vista mensual.'
  },
  {
    id: 'demo-2',
    title: 'Hot Sale accesorios',
    startDate: '2026-05-25',
    endDate: '2026-06-02',
    country: 'Uruguay',
    channel: 'Online',
    branches: 'Ecommerce Uruguay',
    linkUrl: '',
    notes: 'Promo visible cruzando meses.'
  }
];

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return { token, url };
}

async function redisCommand(command) {
  const { token, url } = redisConfig();
  if (!url || !token) {
    throw new Error('Missing Redis REST environment variables.');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });

  if (!response.ok) {
    throw new Error(`Redis command failed: ${response.status}`);
  }

  return response.json();
}

async function readPromos() {
  const { token, url } = redisConfig();
  if (!url || !token) {
    return { mode: 'demo', promos: demoPromos };
  }

  const data = await redisCommand(['GET', KEY]);
  if (!data.result) {
    await redisCommand(['SET', KEY, JSON.stringify(demoPromos)]);
    return { mode: 'shared', promos: demoPromos };
  }

  return { mode: 'shared', promos: JSON.parse(data.result) };
}

async function writePromo(promo) {
  const { token, url } = redisConfig();
  if (!url || !token) {
    return {
      error: 'La API esta en modo demo. Configura KV_REST_API_URL y KV_REST_API_TOKEN en Vercel para guardar promos compartidas.'
    };
  }

  const current = await readPromos();
  const savedPromo = {
    ...promo,
    id: promo.id || `promo-${Date.now()}`
  };
  const nextPromos = [...current.promos, savedPromo];
  await redisCommand(['SET', KEY, JSON.stringify(nextPromos)]);
  return { promo: savedPromo };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const data = await readPromos();
      res.status(200).json(data);
      return;
    }

    if (req.method === 'POST') {
      const result = await writePromo(req.body || {});
      if (result.error) {
        res.status(503).json(result);
        return;
      }
      res.status(201).json(result);
      return;
    }

    res.status(405).json({ error: 'Metodo no permitido.' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error inesperado.' });
  }
};
