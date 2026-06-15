import process from 'node:process';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido. Use POST.' });
  }

  const baseUrl = process.env.API_BASE_URL || 'https://app.interfuerza.com/api/v4/';
  const token = process.env.API_TOKEN || process.env.INTERFUERZA_TOKEN;
  const tokenHeader = process.env.API_TOKEN_HEADER || 'X-IFX-Token';

  if (!token) {
    return res.status(500).json({
      error: 'Falta API_TOKEN en variables de entorno del servidor.',
    });
  }

  try {
    const cuerpo =
      typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body || {});

    const respuestaInterfuerza = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [tokenHeader]: token,
      },
      body: cuerpo,
    });

    const texto = await respuestaInterfuerza.text();
    const textoLimpio = texto.trim();

    if (/not permitted/i.test(textoLimpio)) {
      return res.status(403).json({
        error: 'InterFuerza rechazó la IP de salida de Vercel.',
        detalle: textoLimpio,
      });
    }

    if (textoLimpio.startsWith('{') || textoLimpio.startsWith('[')) {
      res.status(respuestaInterfuerza.status);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.send(textoLimpio);
    }

    const tipoContenido = respuestaInterfuerza.headers.get('content-type') || 'text/plain; charset=utf-8';

    res.status(respuestaInterfuerza.status);
    res.setHeader('Content-Type', tipoContenido);
    return res.send(texto);
  } catch (error) {
    return res.status(502).json({
      error: 'No se pudo conectar con InterFuerza.',
      detalle: error instanceof Error ? error.message : String(error),
    });
  }
}
