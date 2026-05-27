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

function supabaseConfig() {
  return {
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    url: process.env.SUPABASE_URL
  };
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

function toClientPromo(row) {
  return {
    id: String(row.id),
    title: row.title || '',
    startDate: row.start_date || '',
    endDate: row.end_date || '',
    country: row.country || '',
    channel: row.channel || '',
    branches: row.branches || '',
    linkUrl: row.link_url || '',
    notes: row.notes || ''
  };
}

function toSupabaseRow(promo) {
  return {
    title: promo.title || '',
    start_date: promo.startDate || '',
    end_date: promo.endDate || '',
    country: promo.country || '',
    channel: promo.channel || '',
    branches: promo.branches || '',
    link_url: promo.linkUrl || '',
    notes: promo.notes || ''
  };
}

async function supabaseRequest(path, options = {}) {
  const { key, url } = supabaseConfig();
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables.');
  }

  const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase request failed: ${response.status} ${errorText}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function readSupabasePromos() {
  const rows = await supabaseRequest('promos?select=id,title,start_date,end_date,country,channel,branches,link_url,notes&order=start_date.asc');
  return { mode: 'shared', promos: rows.map(toClientPromo) };
}

async function writeSupabasePromo(promo) {
  const rows = await supabaseRequest('promos?select=id,title,start_date,end_date,country,channel,branches,link_url,notes', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation'
    },
    body: JSON.stringify(toSupabaseRow(promo))
  });

  return { promo: toClientPromo(rows[0]) };
}

async function readPromos() {
  const supabase = supabaseConfig();
  if (supabase.url && supabase.key) {
    return readSupabasePromos();
  }

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
  const supabase = supabaseConfig();
  if (supabase.url && supabase.key) {
    return writeSupabasePromo(promo);
  }

  const { token, url } = redisConfig();
  if (!url || !token) {
    return {
      error: 'La API esta en modo demo. Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY, o KV_REST_API_URL y KV_REST_API_TOKEN, para guardar promos compartidas.'
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
