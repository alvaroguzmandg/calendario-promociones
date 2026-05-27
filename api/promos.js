const KEY = 'calendario-promos';

const demoPromos = [];

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

function providerStatus() {
  const supabase = supabaseConfig();
  const redis = redisConfig();
  return {
    hasRedis: Boolean(redis.url && redis.token),
    hasSupabase: Boolean(supabase.url && supabase.key),
    provider: supabase.url && supabase.key ? 'supabase' : redis.url && redis.token ? 'redis' : 'demo'
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

async function updateSupabasePromo(promo) {
  if (!promo.id) {
    return { error: 'Falta el id de la promocion.' };
  }

  const rows = await supabaseRequest(`promos?id=eq.${encodeURIComponent(promo.id)}&select=id,title,start_date,end_date,country,channel,branches,link_url,notes`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=representation'
    },
    body: JSON.stringify(toSupabaseRow(promo))
  });

  if (!rows[0]) {
    return { error: 'No se encontro la promocion para actualizar.' };
  }

  return { promo: toClientPromo(rows[0]) };
}

async function deleteSupabasePromo(id) {
  if (!id) {
    return { error: 'Falta el id de la promocion.' };
  }

  await supabaseRequest(`promos?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      Prefer: 'return=minimal'
    }
  });

  return { ok: true };
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

async function updatePromo(promo) {
  const supabase = supabaseConfig();
  if (supabase.url && supabase.key) {
    return updateSupabasePromo(promo);
  }

  const { token, url } = redisConfig();
  if (!url || !token) {
    return {
      error: 'La API esta en modo demo. Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY, o KV_REST_API_URL y KV_REST_API_TOKEN, para guardar promos compartidas.'
    };
  }

  if (!promo.id) {
    return { error: 'Falta el id de la promocion.' };
  }

  const current = await readPromos();
  let found = false;
  const nextPromos = current.promos.map((item) => {
    if (String(item.id) !== String(promo.id)) return item;
    found = true;
    return { ...item, ...promo };
  });

  if (!found) {
    return { error: 'No se encontro la promocion para actualizar.' };
  }

  await redisCommand(['SET', KEY, JSON.stringify(nextPromos)]);
  return { promo: nextPromos.find((item) => String(item.id) === String(promo.id)) };
}

async function deletePromo(id) {
  const supabase = supabaseConfig();
  if (supabase.url && supabase.key) {
    return deleteSupabasePromo(id);
  }

  const { token, url } = redisConfig();
  if (!url || !token) {
    return {
      error: 'La API esta en modo demo. Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY, o KV_REST_API_URL y KV_REST_API_TOKEN, para guardar promos compartidas.'
    };
  }

  if (!id) {
    return { error: 'Falta el id de la promocion.' };
  }

  const current = await readPromos();
  const nextPromos = current.promos.filter((item) => String(item.id) !== String(id));
  await redisCommand(['SET', KEY, JSON.stringify(nextPromos)]);
  return { ok: true };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      if (req.query?.health === '1') {
        res.status(200).json(providerStatus());
        return;
      }
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

    if (req.method === 'PUT') {
      const result = await updatePromo(req.body || {});
      if (result.error) {
        res.status(400).json(result);
        return;
      }
      res.status(200).json(result);
      return;
    }

    if (req.method === 'DELETE') {
      const result = await deletePromo(req.query?.id);
      if (result.error) {
        res.status(400).json(result);
        return;
      }
      res.status(200).json(result);
      return;
    }

    res.status(405).json({ error: 'Metodo no permitido.' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error inesperado.' });
  }
};
