import process from 'node:process';

function construirBaseYRuta(baseUrl, requestPath = '') {
  const url = new URL(baseUrl);
  const base = `${url.protocol}//${url.host}`;
  const pathBase = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
  const rutaRelativa = String(requestPath || '').replace(/^\/api\/proxy/, '').replace(/^\//, '');
  return `${base}${pathBase}${rutaRelativa}`;
}

export default async function handler(req, res) {
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method || '')) {
    res.setHeader('Allow', 'GET,POST,PUT,PATCH,DELETE');
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  const baseUrl = process.env.API_BASE_URL;
  const token = process.env.API_TOKEN;
  const tokenHeader = process.env.API_TOKEN_HEADER || 'Authorization';

  if (!baseUrl) {
    return res.status(500).json({ error: 'Falta API_BASE_URL en variables de entorno.' });
  }

  try {
    const targetUrl = construirBaseYRuta(baseUrl, req.url);
    const body = req.method === 'GET'
      ? undefined
      : typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body || {});

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { [tokenHeader]: token } : {}),
    };

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    return res.send(text);
  } catch (error) {
    return res.status(502).json({
      error: 'No se pudo conectar con la API.',
      detalle: error instanceof Error ? error.message : String(error),
    });
  }
}
