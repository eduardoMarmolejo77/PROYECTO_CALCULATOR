import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

const ai = apiKey
  ? new GoogleGenAI({ apiKey })
  : null;

const MODELO_GEMINI_CALCULADORA = 'gemini-3.1-flash-lite';
const LONGITUD_MINIMA_SOLICITUD = 20;
const PALABRAS_MINIMAS_SOLICITUD = 4;

function crearErrorValidacion(mensaje, codigo) {
  const error = new Error(mensaje);
  error.code = codigo;
  error.esValidacionPrompt = true;
  return error;
}

function normalizarSolicitud(solicitud) {
  return String(solicitud || '').replace(/\s+/g, ' ').trim();
}

function validarSolicitudCalculadora(solicitud) {
  const texto = normalizarSolicitud(solicitud);

  if (!texto) {
    throw crearErrorValidacion(
      'Escribe una descripción para analizar y autollenar la calculadora.',
      'PROMPT_EMPTY'
    );
  }

  const palabras = texto.split(' ').filter(Boolean);
  if (texto.length < LONGITUD_MINIMA_SOLICITUD || palabras.length < PALABRAS_MINIMAS_SOLICITUD) {
    throw crearErrorValidacion(
      'Describe un poco más la solicitud antes de usar IA. Incluye consumo, instalación, estructura y distancia si los tienes.',
      'PROMPT_TOO_SHORT'
    );
  }

  return texto;
}

function extraerJsonDesdeTexto(texto = '') {
  const limpio = String(texto || '').trim();
  if (!limpio) return null;

  try {
    return JSON.parse(limpio);
  } catch {
    const inicio = limpio.indexOf('{');
    const fin = limpio.lastIndexOf('}');
    if (inicio < 0 || fin <= inicio) return null;
    try {
      return JSON.parse(limpio.slice(inicio, fin + 1));
    } catch {
      return null;
    }
  }
}

function normalizarCampoEnumerado(valor, permitidos = []) {
  const texto = String(valor || '').trim();
  return permitidos.includes(texto) ? texto : null;
}

function normalizarNumero(valor, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {}) {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number.parseFloat(valor);
  if (!Number.isFinite(numero) || numero < min || numero > max) return null;
  return Math.round(numero * 100) / 100;
}

function formatearListaCampos(campos = []) {
  if (campos.length <= 1) return campos[0] || '';
  if (campos.length === 2) return `${campos[0]} y ${campos[1]}`;
  return `${campos.slice(0, -1).join(', ')} y ${campos.at(-1)}`;
}

function construirPreguntaCamposFaltantes(camposFaltantes = []) {
  if (camposFaltantes.length === 0) return null;
  const lista = formatearListaCampos(camposFaltantes);
  return camposFaltantes.length === 1
    ? `Falta este dato: ${lista}. ¿Me lo puedes indicar?`
    : `Faltan estos datos: ${lista}. ¿Me los puedes indicar?`;
}

function obtenerCamposFaltantesCalculadora(respuesta) {
  const camposFaltantes = [];
  const tieneConsumo = (
    Number.isFinite(Number.parseFloat(respuesta.consumoMensual)) && Number.parseFloat(respuesta.consumoMensual) > 0
  ) || (
    Number.isFinite(Number.parseFloat(respuesta.consumoAnual)) && Number.parseFloat(respuesta.consumoAnual) > 0
  );

  if (!tieneConsumo) camposFaltantes.push('consumo anual o mensual');
  if (!respuesta.tipoInstalacion) camposFaltantes.push('tipo de instalación');
  if (!respuesta.tipoMontaje) camposFaltantes.push('tipo de estructura');
  if (!Number.isFinite(Number.parseFloat(respuesta.distanciaInversor))) camposFaltantes.push('distancia de cable');
  if (respuesta.tipoMontaje === 'TPO' && !respuesta.tipoTPO) camposFaltantes.push('orientación TPO');
  if (respuesta.tipoMontaje === 'Piso' && !respuesta.configuracionPiso) camposFaltantes.push('configuración de piso');
  if (respuesta.conexionElectrica === 'Trifasico' && !respuesta.tensionConexionTrifasica) {
    camposFaltantes.push('tensión trifásica');
  }

  return camposFaltantes;
}

function validarRespuestaCalculadora(json) {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new Error('Gemini devolvió un formato inválido para la calculadora.');
  }

  const respuesta = {
    tipoInstalacion: normalizarCampoEnumerado(json.tipoInstalacion, ['Residencial', 'Comercial', 'Industrial']),
    tipoMontaje: normalizarCampoEnumerado(json.tipoMontaje, ['Losa', 'Piso', 'S-5', 'TPO', 'Teja']),
    consumoMensual: normalizarNumero(json.consumoMensual, { min: 0.01 }),
    consumoAnual: normalizarNumero(json.consumoAnual, { min: 0.01 }),
    distanciaInversor: normalizarNumero(json.distanciaInversor, { min: 0 }),
    horasSolPico: normalizarNumero(json.horasSolPico, { min: 0.01 }),
    performanceRatio: normalizarNumero(json.performanceRatio, { min: 0.01, max: 100 }),
    margenSeguridad: normalizarNumero(json.margenSeguridad, { min: 0 }),
    coberturaObjetivo: normalizarNumero(json.coberturaObjetivo, { min: 0.01, max: 150 }),
    capacidadBateriaObjetivo: normalizarNumero(json.capacidadBateriaObjetivo, { min: 0.01 }),
    opcionInversor: normalizarCampoEnumerado(json.opcionInversor, ['ConBateria', 'SinBateria', 'Hibrido', 'microInversor']),
    conexionElectrica: normalizarCampoEnumerado(json.conexionElectrica, ['Monofasico', 'Trifasico']),
    tensionConexionTrifasica: normalizarCampoEnumerado(json.tensionConexionTrifasica, ['208-220', '240', '480']),
    tipoTPO: normalizarCampoEnumerado(json.tipoTPO, ['HORIZONTAL', 'VERTICAL']),
    configuracionPiso: normalizarCampoEnumerado(json.configuracionPiso, ['MIRANDO_AL_SUR', 'ESTE_OESTE']),
    recommendationProfile: normalizarCampoEnumerado(json.recommendationProfile, ['balanced', 'stock', 'premium']),
  };

  if (respuesta.conexionElectrica !== 'Trifasico') {
    respuesta.tensionConexionTrifasica = null;
  }

  respuesta.camposFaltantes = obtenerCamposFaltantesCalculadora(respuesta);
  respuesta.preguntaCamposFaltantes = construirPreguntaCamposFaltantes(respuesta.camposFaltantes);

  return respuesta;
}

export async function analizarPromptCalculadora(solicitud) {
  if (!ai) {
    throw new Error('Falta configurar VITE_GEMINI_API_KEY para usar Gemini.');
  }

  const solicitudNormalizada = validarSolicitudCalculadora(solicitud);

  const prompt = `
Eres un extractor de datos para una calculadora solar.

SOLICITUD DEL CLIENTE:
${solicitudNormalizada}

Devuelve SOLO JSON válido con este esquema:
{
  "tipoInstalacion": "Residencial|Comercial|Industrial|null",
  "tipoMontaje": "Losa|Piso|S-5|TPO|Teja|null",
  "consumoMensual": number|null,
  "consumoAnual": number|null,
  "distanciaInversor": number|null,
  "horasSolPico": number|null,
  "performanceRatio": number|null,
  "margenSeguridad": number|null,
  "coberturaObjetivo": number|null,
  "capacidadBateriaObjetivo": number|null,
  "opcionInversor": "ConBateria|SinBateria|Hibrido|microInversor|null",
  "conexionElectrica": "Monofasico|Trifasico|null",
  "tensionConexionTrifasica": "208-220|240|480|null",
  "tipoTPO": "HORIZONTAL|VERTICAL|null",
  "configuracionPiso": "MIRANDO_AL_SUR|ESTE_OESTE|null",
  "recommendationProfile": "balanced|stock|premium|null",
  "camposFaltantes": ["campo faltante"],
  "preguntaCamposFaltantes": "pregunta corta para pedir solo los campos faltantes|null"
}

Reglas:
- Si un dato no está claro, usa null.
- No inventes valores.
- Considera obligatorios: consumo mensual o anual, tipo de instalación, tipo de estructura y distancia de cable.
- Si tipoMontaje es TPO, tipoTPO también es obligatorio.
- Si tipoMontaje es Piso, configuracionPiso también es obligatorio.
- Si conexionElectrica es Trifasico, tensionConexionTrifasica también es obligatorio.
- camposFaltantes debe incluir solo datos obligatorios que no estén claros.
- preguntaCamposFaltantes debe pedir solo esos campos faltantes en una sola pregunta corta.
- No incluyas texto fuera del JSON.
`;

  try {
    const response = await ai.models.generateContent({
      model: MODELO_GEMINI_CALCULADORA,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const json = extraerJsonDesdeTexto(response?.text || '');
    return validarRespuestaCalculadora(json);
  } catch (error) {
    const status = Number(error?.status || error?.code || 0);

    if (status === 429) {
      throw new Error('Gemini alcanzó el límite de cuota/rate limit temporalmente.', { cause: error });
    }
    if (status === 503) {
      throw new Error('Gemini está con alta demanda en este momento.', { cause: error });
    }

    throw new Error(String(error?.message || 'No se pudo obtener respuesta de Gemini.'), { cause: error });
  }
}

// Compatibilidad temporal con llamadas antiguas.
export async function analizarInventario(_productos, solicitud) {
  return analizarPromptCalculadora(solicitud);
}
