import { useState, useEffect, useMemo } from 'react';
import CampoEntrada from '../../../compartido/componentes/CampoEntrada';
import { calcularSistemaCorigy } from '../servicios/servicioCalculoPiezas';
import { analizarPromptCalculadora } from '../../../integraciones/proveedores/gemini/gemini.adapter';
import '../estilos/propuesta.css';

const PROFILE_CONFIG = {
  balanced: {
    label: 'Balanceado',
    icon: '⚖️',
    factor: 1,
    description: 'Costo / calidad / precio',
    summary: 'Esta configuración busca el mejor equilibrio entre rendimiento, inversión y retorno.'
  },
  stock: {
    label: 'Disponible',
    icon: '📦',
    factor: 0.95,
    description: 'Prioriza stock actual',
    summary: 'Esta configuración prioriza equipos con disponibilidad inmediata y rápida entrega.'
  },
  premium: {
    label: 'Premium',
    icon: '👑',
    factor: 1.15,
    description: 'Lo mejor de lo mejor',
    summary: 'Esta configuración prioriza máxima eficiencia, mayor producción y componentes premium.'
  }
};

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const CONSUMPTION_MODES = {
  monthly: 'monthly',
  annual: 'annual',
  prompt: 'prompt',
};
const CLAVE_BORRADOR_CALCULADORA = 'calculadora_solar_borrador_v1';
const MONTH_ALIASES = [
  ['ene', 'enero'],
  ['feb', 'febrero'],
  ['mar', 'marzo'],
  ['abr', 'abril'],
  ['may', 'mayo'],
  ['jun', 'junio'],
  ['jul', 'julio'],
  ['ago', 'agosto'],
  ['sep', 'sept', 'septiembre', 'set', 'setiembre'],
  ['oct', 'octubre'],
  ['nov', 'noviembre'],
  ['dic', 'diciembre'],
];
const INSTALLATION_KEYWORDS = {
  Residencial: [['residencial'], ['casa'], ['hogar'], ['vivienda'], ['apartamento']],
  Comercial: [['comercial'], ['negocio'], ['oficina'], ['local']],
  Industrial: [['industrial'], ['fabrica'], ['planta'], ['bodega']],
};
const MOUNT_KEYWORDS = {
  Losa: [['losa'], ['azotea'], ['techo', 'plano']],
  Piso: [['piso'], ['suelo'], ['ground']],
  'S-5': [['s-5'], ['engargolado'], ['standing', 'seam']],
  TPO: [['tpo']],
  Teja: [['teja'], ['roof', 'tile']],
};
const PROFILE_KEYWORDS = {
  premium: [['premium'], ['alto', 'rendimiento'], ['maxima', 'eficiencia'], ['tope', 'gama']],
  stock: [['stock'], ['disponible'], ['entrega', 'inmediata'], ['urgente']],
  balanced: [['balanceado'], ['equilibrado'], ['costo', 'beneficio']],
};
const INVERTER_KEYWORDS = {
  ConBateria: [['offgrid'], ['off-grid'], ['con', 'bateria'], ['aislado']],
  SinBateria: [['microinversor'], ['on-grid', 'microinversor']],
  Hibrido: [['hibrido'], ['hybrid']],
  microInversor: [['inversor', 'de', 'cadena'], ['string', 'inverter']],
};
const CONNECTION_KEYWORDS = {
  Monofasico: [['monofasico'], ['monofasica'], ['single', 'phase']],
  Trifasico: [['trifasico'], ['trifasica'], ['three', 'phase']],
};
const TPO_ORIENTATION_KEYWORDS = {
  HORIZONTAL: [['tpo', 'horizontal'], ['horizontal']],
  VERTICAL: [['tpo', 'vertical'], ['vertical']],
};
const FLOOR_CONFIGURATION_KEYWORDS = {
  MIRANDO_AL_SUR: [['mirando', 'al', 'sur'], ['hacia', 'el', 'sur'], ['sur']],
  ESTE_OESTE: [['este', 'oeste'], ['east', 'west']],
};

function crearDatosInicialesCalculadora(datosGuardados = null) {
  const valoresBase = {
    modoConsumo: CONSUMPTION_MODES.monthly,
    consumosMensuales: MONTH_LABELS.map(() => ''),
    consumoAnualManual: '',
    textoConsumoPrompt: '',
    tipoInstalacion: '',
    tipoMontaje: '',
    distanciaInversor: '',
    capacidadBateriaObjetivo: '',
    opcionInversor: '',
    conexionElectrica: '',
    tensionConexionTrifasica: '',
    tipoTPO: 'HORIZONTAL',
    configuracionPiso: 'MIRANDO_AL_SUR',
    coberturaObjetivo: 100,
    horasSolPico: 4.5,
    performanceRatio: 80,
    margenSeguridad: 10,
    recommendationProfile: 'balanced'
  };

  const datosPersistidos = leerBorradorCalculadora();
  const datosInicialesValidos = (datosGuardados && typeof datosGuardados === 'object') ? datosGuardados : {};
  const datosPersistidosValidos = (datosPersistidos && typeof datosPersistidos === 'object') ? datosPersistidos : {};
  const fuenteDatos = {
    ...datosPersistidosValidos,
    ...datosInicialesValidos,
  };

  if (Object.keys(fuenteDatos).length === 0) return valoresBase;

  if ((!datosInicialesValidos.textoConsumoPrompt || String(datosInicialesValidos.textoConsumoPrompt).trim() === '') && datosPersistidosValidos.textoConsumoPrompt) {
    fuenteDatos.textoConsumoPrompt = datosPersistidosValidos.textoConsumoPrompt;
  }

  return {
    ...valoresBase,
    ...fuenteDatos,
    consumosMensuales: Array.isArray(fuenteDatos.consumosMensuales)
      ? MONTH_LABELS.map((_, index) => fuenteDatos.consumosMensuales[index] ?? '')
      : valoresBase.consumosMensuales,
  };
}

function leerBorradorCalculadora() {
  if (typeof window === 'undefined') return null;
  try {
    const crudo = window.sessionStorage.getItem(CLAVE_BORRADOR_CALCULADORA);
    if (!crudo) return null;
    const parseado = JSON.parse(crudo);
    return parseado && typeof parseado === 'object' ? parseado : null;
  } catch {
    return null;
  }
}

function guardarBorradorCalculadora(datos) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(CLAVE_BORRADOR_CALCULADORA, JSON.stringify(datos));
  } catch {
    // Ignorar error de persistencia en almacenamiento del navegador.
  }
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseFlexibleNumber(value) {
  const rawValue = String(value || '')
    .replace(/\s+/g, '')
    .replace(/[^\d,.-]/g, '');

  if (!rawValue) return '';

  const withoutSign = rawValue.replace(/^-/, '');
  const hasComma = withoutSign.includes(',');
  const hasDot = withoutSign.includes('.');
  let normalized = rawValue;

  if (hasComma && hasDot) {
    const lastComma = withoutSign.lastIndexOf(',');
    const lastDot = withoutSign.lastIndexOf('.');
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    normalized = rawValue
      .replace(new RegExp(`\\${thousandsSeparator}`, 'g'), '')
      .replace(decimalSeparator, '.');
  } else if (hasComma) {
    const [, decimals = ''] = withoutSign.split(',');
    normalized = decimals.length === 3
      ? rawValue.replace(/,/g, '')
      : rawValue.replace(',', '.');
  } else if (hasDot) {
    const parts = withoutSign.split('.');
    const decimals = parts.at(-1) || '';
    normalized = parts.length > 2 || decimals.length === 3
      ? rawValue.replace(/\./g, '')
      : rawValue;
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return '';

  return Number.isInteger(parsed) ? String(parsed) : String(parsed);
}

function extractNumbersFromText(text) {
  return (String(text || '').match(/-?\d[\d\s.,]*/g) || [])
    .map(parseFlexibleNumber)
    .filter((value) => value !== '');
}

function parseMonthlyConsumptionsFromText(text, currentValues = MONTH_LABELS.map(() => '')) {
  const nextValues = MONTH_LABELS.map((_, index) => currentValues[index] ?? '');
  const normalizedText = normalizeText(text);
  let filledCount = 0;

  MONTH_ALIASES.forEach((aliases, monthIndex) => {
    const monthPattern = aliases.join('|');
    const pattern = new RegExp(
      `\\b(?:${monthPattern})\\b\\s*(?:=|:|-|–|—)?\\s*([\\d][\\d\\s.,]*)`,
      'i'
    );
    const match = normalizedText.match(pattern);
    const parsed = parseFlexibleNumber(match?.[1]);

    if (parsed !== '') {
      nextValues[monthIndex] = parsed;
      filledCount += 1;
    }
  });

  if (filledCount > 0) {
    return { values: nextValues, filledCount, usedSequentialFallback: false };
  }

  const numbers = extractNumbersFromText(text).slice(0, MONTH_LABELS.length);
  if (numbers.length === MONTH_LABELS.length) {
    return {
      values: MONTH_LABELS.map((_, index) => numbers[index] ?? ''),
      filledCount: numbers.length,
      usedSequentialFallback: true,
    };
  }

  return { values: nextValues, filledCount: 0, usedSequentialFallback: false };
}

function hasKeywordGroup(text, group) {
  return group.every((token) => text.includes(token));
}

function detectValueByKeywords(text, map) {
  return Object.entries(map).find(([, groups]) =>
    groups.some((group) => hasKeywordGroup(text, group))
  )?.[0] || '';
}

function detectTensionTrifasica(text) {
  const normalizedText = normalizeText(text);
  if (/(208|220)\s*(?:-|\/|a)?\s*(220|208)?\s*v?/.test(normalizedText) || normalizedText.includes('208-220')) {
    return '208-220';
  }
  if (/480\s*v?/.test(normalizedText)) return '480';
  if (/240\s*v?/.test(normalizedText)) return '240';
  return '';
}

function extractNumberFromPattern(text, patterns = []) {
  const normalizedText = normalizeText(text);

  for (const pattern of patterns) {
    const match = normalizedText.match(pattern);
    const parsed = parseFlexibleNumber(match?.[1]);
    if (parsed !== '') {
      const number = Number.parseFloat(parsed);
      if (Number.isFinite(number)) return number;
    }
  }

  return Number.NaN;
}

function hasValidPromptConsumption(nextData) {
  const consumoAnualManual = Number.parseFloat(nextData.consumoAnualManual);
  if (Number.isFinite(consumoAnualManual) && consumoAnualManual > 0) return true;

  const valoresMensuales = MONTH_LABELS.map((_, index) => Number.parseFloat(nextData.consumosMensuales?.[index]));
  const serieValida = valoresMensuales.every((valor) => Number.isFinite(valor) && valor >= 0);
  return serieValida && valoresMensuales.some((valor) => valor > 0);
}

function getPromptMissingCriticalFields(nextData) {
  const missing = [];
  const distanciaInversor = Number.parseFloat(nextData.distanciaInversor);

  if (!hasValidPromptConsumption(nextData)) missing.push('consumo (anual o 12 meses)');
  if (!nextData.tipoInstalacion) missing.push('tipo de instalación');
  if (!nextData.tipoMontaje) missing.push('tipo de estructura');
  if (nextData.tipoMontaje === 'TPO' && !nextData.tipoTPO) missing.push('orientación TPO');
  if (nextData.tipoMontaje === 'Piso' && !nextData.configuracionPiso) missing.push('configuración de piso');
  if (nextData.distanciaInversor === '' || !Number.isFinite(distanciaInversor) || distanciaInversor < 0) {
    missing.push('distancia de cable');
  }
  if (nextData.conexionElectrica === 'Trifasico' && !nextData.tensionConexionTrifasica) {
    missing.push('tensión trifásica');
  }

  return missing;
}

function formatearListaCampos(campos = []) {
  if (campos.length <= 1) return campos[0] || '';
  if (campos.length === 2) return `${campos[0]} y ${campos[1]}`;
  return `${campos.slice(0, -1).join(', ')} y ${campos.at(-1)}`;
}

function construirPreguntaCamposFaltantes(camposFaltantes = []) {
  if (camposFaltantes.length === 0) return '';
  const lista = formatearListaCampos(camposFaltantes);
  return camposFaltantes.length === 1
    ? `Falta este dato: ${lista}. ¿Me lo puedes indicar?`
    : `Faltan estos datos: ${lista}. ¿Me los puedes indicar?`;
}

function parsePromptToCalculatorPatch(text, currentData) {
  const normalizedText = normalizeText(text);
  const patch = {};
  const detected = [];
  const assumed = [];
  const parsedMonthly = parseMonthlyConsumptionsFromText(text, currentData.consumosMensuales);

  if (parsedMonthly.filledCount > 0) {
    patch.consumosMensuales = parsedMonthly.values;
    detected.push(parsedMonthly.filledCount === 12 ? 'consumo de 12 meses' : `consumo de ${parsedMonthly.filledCount} meses`);
  }

  if (parsedMonthly.filledCount !== 12) {
    const annualConsumption = extractNumberFromPattern(text, [
      /(?:consumo\s+)?anual[^\d]{0,12}(\d[\d.,]*)\s*(?:kwh)?/i,
      /(\d[\d.,]*)\s*kwh\s*(?:\/|por)?\s*(?:ano|año|anual)/i,
    ]);
    const monthlyConsumption = extractNumberFromPattern(text, [
      /(?:consumo\s+)?mensual[^\d]{0,12}(\d[\d.,]*)\s*(?:kwh)?/i,
      /(\d[\d.,]*)\s*kwh\s*(?:\/|por)?\s*mes/i,
    ]);

    if (Number.isFinite(annualConsumption) && annualConsumption > 0) {
      patch.consumoAnualManual = Math.round(annualConsumption * 100) / 100;
      detected.push('consumo anual');
    } else if (Number.isFinite(monthlyConsumption) && monthlyConsumption > 0) {
      patch.consumoAnualManual = Math.round((monthlyConsumption * 12) * 100) / 100;
      detected.push('consumo mensual promedio');
    }
  }

  const tipoInstalacion = detectValueByKeywords(normalizedText, INSTALLATION_KEYWORDS);
  if (tipoInstalacion) {
    patch.tipoInstalacion = tipoInstalacion;
    detected.push('tipo de instalación');
  }

  const tipoMontaje = detectValueByKeywords(normalizedText, MOUNT_KEYWORDS);
  if (tipoMontaje) {
    patch.tipoMontaje = tipoMontaje;
    detected.push('tipo de estructura');
  }

  const tipoTPO = detectValueByKeywords(normalizedText, TPO_ORIENTATION_KEYWORDS);
  if (tipoTPO) {
    patch.tipoTPO = tipoTPO;
    detected.push('orientación TPO');
  }

  const configuracionPiso = detectValueByKeywords(normalizedText, FLOOR_CONFIGURATION_KEYWORDS);
  if (configuracionPiso) {
    patch.configuracionPiso = configuracionPiso;
    detected.push('configuración de piso');
  }

  const recommendationProfile = detectValueByKeywords(normalizedText, PROFILE_KEYWORDS);
  if (recommendationProfile) {
    patch.recommendationProfile = recommendationProfile;
    detected.push('tipo de solución');
  } else if (!currentData.recommendationProfile) {
    patch.recommendationProfile = 'balanced';
    assumed.push('tipo de solución Balanceado');
  }

  const opcionInversor = detectValueByKeywords(normalizedText, INVERTER_KEYWORDS);
  if (opcionInversor) {
    patch.opcionInversor = opcionInversor;
    detected.push('opción de inversor');
  }

  const conexionElectrica = detectValueByKeywords(normalizedText, CONNECTION_KEYWORDS);
  if (conexionElectrica) {
    patch.conexionElectrica = conexionElectrica;
    detected.push('conexión eléctrica');
    if (conexionElectrica !== 'Trifasico') {
      patch.tensionConexionTrifasica = '';
    }
  }

  const tensionTrifasica = detectTensionTrifasica(text);
  if (tensionTrifasica) {
    patch.tensionConexionTrifasica = tensionTrifasica;
    patch.conexionElectrica = 'Trifasico';
    detected.push('tensión trifásica');
  }
  if (patch.conexionElectrica === 'Trifasico' && !patch.tensionConexionTrifasica) {
    patch.tensionConexionTrifasica = currentData.tensionConexionTrifasica || '208-220';
  }

  const distanciaInversor = extractNumberFromPattern(text, [
    /(?:distancia|cable|inversor)[^\d]{0,24}(\d[\d.,]*)\s*(?:m|metros?)/i,
    /(\d[\d.,]*)\s*(?:m|metros?)\s*(?:de\s+)?(?:cable|inversor)/i,
  ]);
  if (Number.isFinite(distanciaInversor) && distanciaInversor >= 0) {
    patch.distanciaInversor = Math.round(distanciaInversor * 100) / 100;
    detected.push('distancia de cable');
  }

  const horasSolPico = extractNumberFromPattern(text, [
    /(?:hsp|horas?\s+sol(?:\s+pico)?)[^\d]{0,12}(\d[\d.,]*)/i,
    /(\d[\d.,]*)\s*(?:hsp|horas?\s+sol(?:\s+pico)?)/i,
  ]);
  if (Number.isFinite(horasSolPico) && horasSolPico > 0) {
    patch.horasSolPico = Math.round(horasSolPico * 100) / 100;
    detected.push('horas sol pico');
  }

  const performanceRatio = extractNumberFromPattern(text, [
    /(?:pr|performance(?:\s+ratio)?|rendimiento)[^\d]{0,12}(\d[\d.,]*)\s*%?/i,
    /(\d[\d.,]*)\s*%\s*(?:pr|performance|rendimiento)/i,
  ]);
  if (Number.isFinite(performanceRatio) && performanceRatio > 0 && performanceRatio <= 100) {
    patch.performanceRatio = Math.round(performanceRatio * 100) / 100;
    detected.push('performance ratio');
  }

  const margenSeguridad = extractNumberFromPattern(text, [
    /(?:margen(?:\s+de)?\s+seguridad|margen)[^\d]{0,12}(\d[\d.,]*)\s*%?/i,
  ]);
  if (Number.isFinite(margenSeguridad) && margenSeguridad >= 0) {
    patch.margenSeguridad = Math.round(margenSeguridad * 100) / 100;
    detected.push('margen de seguridad');
  }

  const coberturaObjetivo = extractNumberFromPattern(text, [
    /(?:cobertura|offset)[^\d]{0,12}(\d[\d.,]*)\s*%?/i,
  ]);
  if (Number.isFinite(coberturaObjetivo) && coberturaObjetivo > 0 && coberturaObjetivo <= 150) {
    patch.coberturaObjetivo = Math.round(coberturaObjetivo * 100) / 100;
    detected.push('cobertura objetivo');
  }

  const capacidadBateria = extractNumberFromPattern(text, [
    /(?:bateria|batería)[^\d]{0,14}(\d[\d.,]*)\s*kwh/i,
    /(\d[\d.,]*)\s*kwh[^\n]{0,16}(?:bateria|batería)/i,
  ]);
  if (Number.isFinite(capacidadBateria) && capacidadBateria > 0) {
    patch.capacidadBateriaObjetivo = Math.round(capacidadBateria * 100) / 100;
    detected.push('capacidad de batería');
  }

  if (patch.tipoMontaje === 'TPO' && !patch.tipoTPO) {
    patch.tipoTPO = currentData.tipoTPO || 'HORIZONTAL';
  }
  if (patch.tipoMontaje === 'Piso' && !patch.configuracionPiso) {
    patch.configuracionPiso = currentData.configuracionPiso || 'MIRANDO_AL_SUR';
  }

  const nextData = { ...currentData, ...patch };
  const missingCritical = getPromptMissingCriticalFields(nextData);

  return { patch, detected, assumed, missingCritical };
}

function normalizarCampoEnumerado(valor, permitidos = []) {
  const texto = String(valor || '').trim();
  if (!texto) return '';
  return permitidos.includes(texto) ? texto : '';
}

function construirPatchDesdeGemini(dataActual, camposGemini = {}) {
  const patch = {};
  const detectados = [];

  const tipoInstalacion = normalizarCampoEnumerado(camposGemini.tipoInstalacion, ['Residencial', 'Comercial', 'Industrial']);
  if (tipoInstalacion) {
    patch.tipoInstalacion = tipoInstalacion;
    detectados.push('tipo de instalación');
  }

  const tipoMontaje = normalizarCampoEnumerado(camposGemini.tipoMontaje, ['Losa', 'Piso', 'S-5', 'TPO', 'Teja']);
  if (tipoMontaje) {
    patch.tipoMontaje = tipoMontaje;
    detectados.push('tipo de estructura');
  }

  const tipoTPO = normalizarCampoEnumerado(camposGemini.tipoTPO, ['HORIZONTAL', 'VERTICAL']);
  if (tipoTPO) {
    patch.tipoTPO = tipoTPO;
    detectados.push('orientación TPO');
  }

  const configuracionPiso = normalizarCampoEnumerado(camposGemini.configuracionPiso, ['MIRANDO_AL_SUR', 'ESTE_OESTE']);
  if (configuracionPiso) {
    patch.configuracionPiso = configuracionPiso;
    detectados.push('configuración piso');
  }

  const recommendationProfile = normalizarCampoEnumerado(camposGemini.recommendationProfile, ['balanced', 'stock', 'premium']);
  if (recommendationProfile) {
    patch.recommendationProfile = recommendationProfile;
    detectados.push('tipo de solución');
  }

  const opcionInversor = normalizarCampoEnumerado(camposGemini.opcionInversor, ['ConBateria', 'SinBateria', 'Hibrido', 'microInversor']);
  if (opcionInversor) {
    patch.opcionInversor = opcionInversor;
    detectados.push('opción de inversor');
  }

  const conexionElectrica = normalizarCampoEnumerado(camposGemini.conexionElectrica, ['Monofasico', 'Trifasico']);
  if (conexionElectrica) {
    patch.conexionElectrica = conexionElectrica;
    detectados.push('conexión eléctrica');
    if (conexionElectrica !== 'Trifasico') {
      patch.tensionConexionTrifasica = '';
    }
  }

  const tensionConexionTrifasica = normalizarCampoEnumerado(camposGemini.tensionConexionTrifasica, ['208-220', '480', '240']);
  if (tensionConexionTrifasica) {
    patch.conexionElectrica = 'Trifasico';
    patch.tensionConexionTrifasica = tensionConexionTrifasica;
    detectados.push('tensión trifásica');
  } else if (patch.conexionElectrica === 'Trifasico') {
    patch.tensionConexionTrifasica = dataActual.tensionConexionTrifasica || '208-220';
  }

  const camposNumericos = [
    { key: 'distanciaInversor', label: 'distancia de cable', min: 0 },
    { key: 'horasSolPico', label: 'HSP', min: 0.01 },
    { key: 'performanceRatio', label: 'performance ratio', min: 0.01, max: 100 },
    { key: 'margenSeguridad', label: 'margen de seguridad', min: 0 },
    { key: 'coberturaObjetivo', label: 'cobertura objetivo', min: 0.01, max: 150 },
    { key: 'capacidadBateriaObjetivo', label: 'batería', min: 0.01 },
  ];

  camposNumericos.forEach(({ key, label, min, max }) => {
    const valor = Number.parseFloat(camposGemini?.[key]);
    if (!Number.isFinite(valor)) return;
    if (valor < min) return;
    if (Number.isFinite(max) && valor > max) return;
    patch[key] = Math.round(valor * 100) / 100;
    detectados.push(label);
  });

  const consumoAnual = Number.parseFloat(camposGemini?.consumoAnual);
  const consumoMensual = Number.parseFloat(camposGemini?.consumoMensual);
  if (Number.isFinite(consumoAnual) && consumoAnual > 0) {
    patch.consumoAnualManual = Math.round(consumoAnual * 100) / 100;
    detectados.push('consumo anual');
  } else if (Number.isFinite(consumoMensual) && consumoMensual > 0) {
    patch.consumoAnualManual = Math.round((consumoMensual * 12) * 100) / 100;
    detectados.push('consumo mensual');
  } else if (Number.isFinite(Number.parseFloat(dataActual.consumoAnualManual)) && Number.parseFloat(dataActual.consumoAnualManual) > 0) {
    // Mantener el valor actual si ya existía.
    patch.consumoAnualManual = dataActual.consumoAnualManual;
  }

  const tipoMontajeFinal = patch.tipoMontaje || dataActual.tipoMontaje;
  if (tipoMontajeFinal === 'TPO' && !patch.tipoTPO) {
    patch.tipoTPO = dataActual.tipoTPO || 'HORIZONTAL';
  }
  if (tipoMontajeFinal === 'Piso' && !patch.configuracionPiso) {
    patch.configuracionPiso = dataActual.configuracionPiso || 'MIRANDO_AL_SUR';
  }

  return { patch, detectados };
}

function getPanelPower(product) {
  const text = `${product.name || ''} ${product.description || ''}`;
  const explicitPower = text.match(/(\d{3,4})\s*(?:w|wp|watt|watts)\b/i);

  if (explicitPower) return Number.parseInt(explicitPower[1], 10);

  const likelyPowers = (product.name || '')
    .match(/\d{3,4}/g)
    ?.map((value) => Number.parseInt(value, 10))
    .filter((value) => value >= 250 && value <= 800);

  return likelyPowers?.[0] || 0;
}

function getStockQuantity(product) {
  const normalizedStock = Number.parseFloat(product.stock);
  if (Number.isFinite(normalizedStock)) return normalizedStock;

  const seen = new Set();
  const stockKeys = /stock|existencia|disponible|inventario|cantidad/i;

  function walk(value, depth = 0) {
    if (!value || depth > 3 || typeof value !== 'object' || seen.has(value)) return null;
    seen.add(value);

    for (const [key, nestedValue] of Object.entries(value)) {
      if (stockKeys.test(key)) {
        const parsed = Number.parseFloat(nestedValue);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
      }
    }

    for (const nestedValue of Object.values(value)) {
      const found = walk(nestedValue, depth + 1);
      if (found !== null) return found;
    }

    return null;
  }

  return walk(product.raw) || 0;
}

function getRequiredWp(consumoMensual, profile, sizingInputs) {
  const {
    coberturaObjetivo,
    horasSolPico,
    performanceRatio,
    margenSeguridad
  } = sizingInputs;

  const consumoAnual = consumoMensual * 12;
  const annualTargetKwh = consumoAnual * (coberturaObjetivo / 100);
  const annualYieldPerKwp = 365 * horasSolPico * (performanceRatio / 100);
  const baseWp = (annualTargetKwh / annualYieldPerKwp) * 1000;

  return baseWp * (1 + (margenSeguridad / 100)) * PROFILE_CONFIG[profile].factor;
}

function sortByNumber(a, b) {
  return a - b;
}

function recommendPanel(profile, consumoMensual, panels, sizingInputs) {
  const requiredWp = getRequiredWp(consumoMensual, profile, sizingInputs);
  const options = panels.map((panel) => {
    const numPaneles = Math.ceil(requiredWp / panel.power);
    return {
      ...panel,
      numPaneles,
      totalWp: numPaneles * panel.power,
      totalPanelCost: numPaneles * panel.price,
      hasEnoughStock: panel.stock >= numPaneles,
      requiredWp
    };
  });

  if (profile === 'premium') {
    return options.sort((a, b) =>
      sortByNumber(b.power, a.power) ||
      sortByNumber(b.price, a.price) ||
      sortByNumber(a.numPaneles, b.numPaneles)
    )[0];
  }

  if (profile === 'stock') {
    return options.sort((a, b) =>
      Number(b.hasEnoughStock) - Number(a.hasEnoughStock) ||
      sortByNumber(b.stock, a.stock) ||
      sortByNumber(a.numPaneles, b.numPaneles) ||
      sortByNumber(a.totalPanelCost, b.totalPanelCost)
    )[0];
  }

  return options.sort((a, b) =>
    sortByNumber(a.pricePerWatt, b.pricePerWatt) ||
    sortByNumber(a.totalPanelCost, b.totalPanelCost) ||
    sortByNumber(a.numPaneles, b.numPaneles)
  )[0];
}

/**
 * Calculadora Solar Simplificada.
 * Permite ingresar 12 meses de consumo y tipo de estructura para dimensionamiento automático.
 */
export default function CalculadoraInteligente({
  productos = [],
  alCambiarResultados,
  datosIniciales,
  alCambiarDatos,
}) {
  const [data, setData] = useState(() => crearDatosInicialesCalculadora(datosIniciales));
  const [textoConsumoRapido, setTextoConsumoRapido] = useState('');
  const [estadoConsumoRapido, setEstadoConsumoRapido] = useState('');
  const [estadoPrompt, setEstadoPrompt] = useState({ tipo: '', mensaje: '' });
  const [procesandoPromptIa, setProcesandoPromptIa] = useState(false);

  const esConsumoAnual = data.modoConsumo === CONSUMPTION_MODES.annual;
  const esConsumoPrompt = data.modoConsumo === CONSUMPTION_MODES.prompt;
  const consumosMensuales = useMemo(() => data.consumosMensuales.map((value) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }), [data.consumosMensuales]);
  const hasValidMonthlySeries = consumosMensuales.every((value) => Number.isFinite(value) && value >= 0);
  const consumoAnualManual = Number.parseFloat(data.consumoAnualManual);
  const hasValidAnnualConsumption = Number.isFinite(consumoAnualManual) && consumoAnualManual >= 0;
  const consumoAnualCalculado = hasValidMonthlySeries
    ? consumosMensuales.reduce((total, value) => total + value, 0)
    : Number.NaN;
  const consumoAnualPrompt = hasValidAnnualConsumption ? consumoAnualManual : consumoAnualCalculado;
  const consumoAnual = esConsumoAnual
    ? consumoAnualManual
    : esConsumoPrompt
      ? consumoAnualPrompt
      : consumoAnualCalculado;
  const consumoMensual = Number.isFinite(consumoAnual)
    ? consumoAnual / MONTH_LABELS.length
    : Number.NaN;
  const distanciaInversor = parseFloat(data.distanciaInversor);
  const coberturaObjetivo = parseFloat(data.coberturaObjetivo);
  const horasSolPico = parseFloat(data.horasSolPico);
  const performanceRatio = parseFloat(data.performanceRatio);
  const margenSeguridad = parseFloat(data.margenSeguridad);
  const sizingInputs = useMemo(() => ({
    coberturaObjetivo,
    horasSolPico,
    performanceRatio,
    margenSeguridad
  }), [coberturaObjetivo, horasSolPico, margenSeguridad, performanceRatio]);

  // Obtener paneles del catálogo para recomendarlos automáticamente
  const availablePanels = useMemo(() => productos.filter((p) => {
    const text = `${p.id} ${p.name} ${p.description}`.toLowerCase();
    return text.includes('panel') || text.includes('solar') || text.includes('fotovolta');
  }), [productos]);

  const panelOptions = useMemo(() => availablePanels
    .map((panel) => {
      const power = getPanelPower(panel);
      const pricePerWatt = panel.price > 0 && power > 0 ? panel.price / power : Number.MAX_SAFE_INTEGER;

      return {
        ...panel,
        power,
        stock: getStockQuantity(panel),
        pricePerWatt
      };
    })
    .filter((panel) => panel.power > 0), [availablePanels]);

  const panelRecommendations = useMemo(() => {
    if (!Number.isFinite(consumoMensual) || consumoMensual <= 0 || panelOptions.length === 0) return {};
    if (
      !Number.isFinite(coberturaObjetivo) || coberturaObjetivo <= 0 ||
      !Number.isFinite(horasSolPico) || horasSolPico <= 0 ||
      !Number.isFinite(performanceRatio) || performanceRatio <= 0 ||
      !Number.isFinite(margenSeguridad) || margenSeguridad < 0
    ) return {};

    return Object.keys(PROFILE_CONFIG).reduce((acc, profile) => {
      acc[profile] = recommendPanel(profile, consumoMensual, panelOptions, sizingInputs);
      return acc;
    }, {});
  }, [consumoMensual, coberturaObjetivo, horasSolPico, margenSeguridad, panelOptions, performanceRatio, sizingInputs]);

  const selectedRecommendation = panelRecommendations[data.recommendationProfile];

  const missingFields = useMemo(() => {
    const fields = [];

    if (esConsumoPrompt) {
      if (!hasValidPromptConsumption(data)) fields.push('consumo (anual o 12 meses)');
      else if (!Number.isFinite(consumoMensual) || consumoMensual <= 0) fields.push('consumo mensual promedio');
    } else if (esConsumoAnual) {
      if (!hasValidAnnualConsumption) fields.push('consumo anual');
      else if (!Number.isFinite(consumoMensual) || consumoMensual <= 0) fields.push('consumo mensual promedio');
    } else {
      if (!hasValidMonthlySeries) fields.push('consumo de los 12 meses');
      else if (!Number.isFinite(consumoMensual) || consumoMensual <= 0) fields.push('consumo mensual promedio');
    }
    if (!Number.isFinite(coberturaObjetivo) || coberturaObjetivo <= 0 || coberturaObjetivo > 150) fields.push('cobertura objetivo válida');
    if (!Number.isFinite(horasSolPico) || horasSolPico <= 0) fields.push('horas sol pico');
    if (!Number.isFinite(performanceRatio) || performanceRatio <= 0 || performanceRatio > 100) fields.push('performance ratio válido');
    if (!Number.isFinite(margenSeguridad) || margenSeguridad < 0) fields.push('margen de seguridad');
    if (!data.tipoInstalacion) fields.push('tipo de instalación');
    if (!data.tipoMontaje) fields.push('tipo de estructura');
    if (data.distanciaInversor === '' || !Number.isFinite(distanciaInversor) || distanciaInversor < 0) fields.push('distancia al inversor');
    if (!data.recommendationProfile) fields.push('tipo de solución');
    if (availablePanels.length === 0) fields.push('paneles solares en catálogo');
    if (availablePanels.length > 0 && panelOptions.length === 0) fields.push('paneles con potencia identificable');
    if (hasValidMonthlySeries && Number.isFinite(consumoMensual) && consumoMensual > 0 && panelOptions.length > 0 && !selectedRecommendation) fields.push('panel recomendado');

    return fields;
  }, [availablePanels.length, consumoMensual, coberturaObjetivo, data, distanciaInversor, esConsumoAnual, esConsumoPrompt, hasValidAnnualConsumption, hasValidMonthlySeries, horasSolPico, margenSeguridad, panelOptions.length, performanceRatio, selectedRecommendation]);

  const isRecommendationReady = missingFields.length === 0;

  useEffect(() => {
    if (alCambiarDatos) {
      alCambiarDatos(data);
    }
  }, [alCambiarDatos, data]);

  useEffect(() => {
    guardarBorradorCalculadora(data);
  }, [data]);

  useEffect(() => {
    if (!isRecommendationReady) {
      alCambiarResultados(null);
      return;
    }

    const numPaneles = selectedRecommendation.numPaneles;

    const sistemaCalculado = calcularSistemaCorigy({
      cantidadPaneles: numPaneles,
      tipoMontaje: data.tipoMontaje,
      distanciaInversor,
      tipoTPO: data.tipoTPO,
      configuracionPiso: data.configuracionPiso,
    });
    const piezas = sistemaCalculado.materiales;

    const opcionInversor = data.opcionInversor || '';
    const incluyeBateria = opcionInversor
      ? opcionInversor === 'ConBateria' || opcionInversor === 'Hibrido'
      : (parseFloat(data.capacidadBateriaObjetivo) || 0) > 0;

    const produccionAnualEstimada = (selectedRecommendation.totalWp / 1000) * 365 * horasSolPico * (performanceRatio / 100);

    alCambiarResultados({
      cantidadPaneles: numPaneles,
      idPanel: selectedRecommendation.id,
      nombrePanel: selectedRecommendation.name,
      potenciaPanel: selectedRecommendation.power,
      numPaneles,
      panelId: selectedRecommendation.id,
      panelName: selectedRecommendation.name,
      panelPower: selectedRecommendation.power,
      piezas,
      potenciaTotalWp: selectedRecommendation.totalWp,
      potenciaRequeridaWp: selectedRecommendation.requiredWp,
      totalWp: selectedRecommendation.totalWp,
      requiredWp: selectedRecommendation.requiredWp,
      produccionAnualEstimada,
      estimatedAnnualProduction: produccionAnualEstimada,
      modoConsumo: data.modoConsumo,
      consumoAnualManual: hasValidAnnualConsumption ? consumoAnualManual : null,
      consumosMensuales,
      consumoMensual,
      consumoAnual,
      incluyeBateria,
      capacidadBateriaObjetivo: parseFloat(data.capacidadBateriaObjetivo) || 0,
      opcionInversor,
      conexionElectrica: data.conexionElectrica || '',
      tensionConexionTrifasica: data.conexionElectrica === 'Trifasico' ? (data.tensionConexionTrifasica || '208-220') : '',
      tipoTPO: data.tipoTPO || 'HORIZONTAL',
      configuracionPiso: data.configuracionPiso || 'MIRANDO_AL_SUR',
      coberturaObjetivo,
      horasSolPico,
      performanceRatio,
      margenSeguridad,
      distanciaInversor,
      tipoInstalacion: data.tipoInstalacion,
      tipoMontaje: data.tipoMontaje,
      perfilRecomendacion: data.recommendationProfile,
      etiquetaRecomendacion: PROFILE_CONFIG[data.recommendationProfile].label,
      recommendationProfile: data.recommendationProfile,
      recommendationLabel: PROFILE_CONFIG[data.recommendationProfile].label,
      cable: sistemaCalculado.cable,
      advertenciasMateriales: sistemaCalculado.advertencias,
    });
  }, [consumoAnual, consumoAnualManual, consumoMensual, consumosMensuales, coberturaObjetivo, data.capacidadBateriaObjetivo, data.configuracionPiso, data.conexionElectrica, data.modoConsumo, data.opcionInversor, data.recommendationProfile, data.tensionConexionTrifasica, data.tipoInstalacion, data.tipoMontaje, data.tipoTPO, distanciaInversor, hasValidAnnualConsumption, horasSolPico, isRecommendationReady, margenSeguridad, alCambiarResultados, performanceRatio, selectedRecommendation]);

  const handleNumberChange = (field, value) => {
    if (value === '') {
      setData(prev => ({ ...prev, [field]: '' }));
    } else {
      setData(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    }
  };

  const handleMonthlyChange = (index, value) => {
    setData((prev) => {
      const nextMonthly = [...prev.consumosMensuales];
      nextMonthly[index] = value;
      return { ...prev, consumosMensuales: nextMonthly };
    });
  };

  const handleBlur = () => {
    // Intencionalmente vacío: no rellenar valores por defecto al perder foco
  };

  const handleConexionElectricaChange = (conexion) => {
    setData((prev) => ({
      ...prev,
      conexionElectrica: conexion,
      tensionConexionTrifasica: conexion === 'Trifasico' ? (prev.tensionConexionTrifasica || '208-220') : '',
    }));
  };

  const aplicarTextoConsumoRapido = (text) => {
    const resultado = parseMonthlyConsumptionsFromText(text, data.consumosMensuales);

    if (resultado.filledCount === 0) {
      setEstadoConsumoRapido('No se detectaron consumos mensuales.');
      return false;
    }

    setData((prev) => ({
      ...prev,
      consumosMensuales: resultado.values,
    }));
    setEstadoConsumoRapido(`${resultado.filledCount} mes${resultado.filledCount === 1 ? '' : 'es'} cargado${resultado.filledCount === 1 ? '' : 's'}.`);
    return true;
  };

  const handleQuickConsumptionPaste = (event) => {
    const text = event.clipboardData.getData('text');
    const applied = aplicarTextoConsumoRapido(text);

    if (applied) {
      event.preventDefault();
      setTextoConsumoRapido(text);
    }
  };

  const handleApplyQuickConsumption = () => {
    const text = textoConsumoRapido.trim();
    if (!text) {
      setEstadoConsumoRapido('Escribe o pega un texto para cargar consumos.');
      return;
    }

    aplicarTextoConsumoRapido(text);
  };

  const cambiarModoConsumo = (modoConsumo) => {
    setData((prev) => ({ ...prev, modoConsumo }));
    if (modoConsumo !== CONSUMPTION_MODES.prompt && estadoPrompt.mensaje) {
      setEstadoPrompt({ tipo: '', mensaje: '' });
    }
  };

  const handleMonthlyPaste = (event) => {
    const text = event.clipboardData.getData('text');
    const resultado = parseMonthlyConsumptionsFromText(text, data.consumosMensuales);

    if (resultado.filledCount < 2) return;

    event.preventDefault();
    setData((prev) => ({
      ...prev,
      consumosMensuales: resultado.values,
    }));
    setTextoConsumoRapido(text);
    setEstadoConsumoRapido(`${resultado.filledCount} meses cargados.`);
  };

  const handleApplyPrompt = async () => {
    const text = String(data.textoConsumoPrompt || '').trim();
    if (!text) {
      setEstadoPrompt({
        tipo: 'error',
        mensaje: 'Escribe una descripción para analizar y autollenar la calculadora.',
      });
      return;
    }

    setProcesandoPromptIa(true);
    try {
      let textoAnalizado = text;
      let usoGemini = false;
      let motivoGeminiNoDisponible = '';
      let detectadosGemini = [];
      let preguntaGeminiCamposFaltantes = '';

      try {
        const respuestaGemini = await analizarPromptCalculadora(text);
        preguntaGeminiCamposFaltantes = respuestaGemini.preguntaCamposFaltantes || '';
        const { patch: patchGemini, detectados } = construirPatchDesdeGemini(data, respuestaGemini);
        if (Object.keys(patchGemini).length > 0) {
          setData((prev) => ({ ...prev, ...patchGemini }));
          textoAnalizado = `${text}\n${JSON.stringify(respuestaGemini)}`;
          usoGemini = true;
          detectadosGemini = detectados;
        }
      } catch (error) {
        if (error?.esValidacionPrompt || ['PROMPT_EMPTY', 'PROMPT_TOO_SHORT'].includes(error?.code)) {
          setEstadoPrompt({
            tipo: 'warning',
            mensaje: String(error?.message || 'Completa un poco más la descripción antes de analizarla.'),
          });
          return;
        }

        // Si falla Gemini, continuamos con parser local.
        usoGemini = false;
        motivoGeminiNoDisponible = String(error?.message || 'Gemini no disponible.');
      }

      const { patch, detected, assumed, missingCritical } = parsePromptToCalculatorPatch(textoAnalizado, data);
      if (Object.keys(patch).length > 0) {
        setData((prev) => ({ ...prev, ...patch }));
      }

      if (detected.length === 0) {
        setEstadoPrompt({
          tipo: 'error',
          mensaje: preguntaGeminiCamposFaltantes
            ? preguntaGeminiCamposFaltantes
            : usoGemini
            ? 'Gemini no devolvió datos utilizables para autollenar. Intenta describir mejor consumo, instalación, estructura y distancia.'
            : `No detecté valores útiles en el texto.${motivoGeminiNoDisponible ? ` (${motivoGeminiNoDisponible})` : ''} Intenta incluir consumo, instalación, estructura y distancia.`,
        });
        return;
      }

      const todosDetectados = usoGemini
        ? [...new Set([...detectadosGemini, ...detected])]
        : detected;
      const detectedMessage = `Datos reconocidos: ${todosDetectados.join(', ')}.`;
      const iaMessage = usoGemini
        ? ' Asistencia IA aplicada.'
        : ` Análisis local aplicado.${motivoGeminiNoDisponible ? ` (${motivoGeminiNoDisponible})` : ''}`;
      const assumedMessage = assumed.length > 0 ? ` Asumido: ${assumed.join(', ')}.` : '';

      if (missingCritical.length > 0) {
        const preguntaCamposFaltantes = construirPreguntaCamposFaltantes(missingCritical);
        setEstadoPrompt({
          tipo: 'warning',
          mensaje: `${detectedMessage}${iaMessage}${assumedMessage} ${preguntaCamposFaltantes}`,
        });
        return;
      }

      setEstadoPrompt({
        tipo: 'success',
        mensaje: `${detectedMessage}${iaMessage}${assumedMessage} Calculadora lista para continuar.`,
      });
    } finally {
      setProcesandoPromptIa(false);
    }
  };

  return (
    <div className="tarjeta-propuesta calculadora-inteligente animate-fade-in-up">
      <h3 className="tarjeta-propuesta__titulo">
        <span className="tarjeta-propuesta__icono">🗒️</span>
        Calculadora Solar
      </h3>

      <div className="bloque-consumo-mensual">
        <div className="modo-consumo-mensual">
          <button
            type="button"
            className={`modo-consumo-mensual__boton ${!esConsumoAnual && !esConsumoPrompt ? 'modo-consumo-mensual__boton--activo' : ''}`}
            onClick={() => cambiarModoConsumo(CONSUMPTION_MODES.monthly)}
          >
            Por mes
          </button>
          <button
            type="button"
            className={`modo-consumo-mensual__boton ${esConsumoAnual ? 'modo-consumo-mensual__boton--activo' : ''}`}
            onClick={() => cambiarModoConsumo(CONSUMPTION_MODES.annual)}
          >
            Por año
          </button>
          <button
            type="button"
            className={`modo-consumo-mensual__boton ${esConsumoPrompt ? 'modo-consumo-mensual__boton--activo' : ''}`}
            onClick={() => cambiarModoConsumo(CONSUMPTION_MODES.prompt)}
          >
            Por prompt
          </button>
        </div>
        <label className="bloque-consumo-mensual__titulo">
          {esConsumoPrompt
            ? 'Describe tu consumo'
            : esConsumoAnual
              ? 'Consumo anual (kWh/año)'
              : 'Consumo mensual (kWh) - Últimos 12 meses'}
        </label>

        {esConsumoPrompt ? (
          <div className="entrada-consumo-prompt">
            <textarea
              className="form-input area-texto-prompt"
              placeholder="Ej: Casa habitación con 2 climas, 3 refrigeradores, 5 personas, consumo promedio 1200 kWh/mes..."
              value={data.textoConsumoPrompt || ''}
              onChange={(event) => setData((prev) => ({ ...prev, textoConsumoPrompt: event.target.value }))}
              rows={4}
            />
            <div className="pegar-consumo-mensual__acciones">
                <button
                  type="button"
                  className="pegar-consumo-mensual__aplicar"
                  onClick={handleApplyPrompt}
                  disabled={procesandoPromptIa}
                >
                  {procesandoPromptIa ? 'Analizando...' : 'Autollenar'}
                </button>
              </div>
          </div>
        ) : esConsumoAnual ? (
          <div className="entrada-consumo-anual">
            <CampoEntrada
              label="Consumo anual (kWh/año)"
              type="number"
              min="0"
              step="0.01"
              value={data.consumoAnualManual}
              onChange={(e) => handleNumberChange('consumoAnualManual', e.target.value)}
              onBlur={handleBlur}
            />
          </div>
        ) : (
          <>
            <div className="cuadricula-consumo-mensual">
              {MONTH_LABELS.map((monthLabel, index) => (
                <CampoEntrada
                  key={monthLabel}
                  label={monthLabel}
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.consumosMensuales[index]}
                  onChange={e => handleMonthlyChange(index, e.target.value)}
                  onPaste={handleMonthlyPaste}
                  onBlur={handleBlur}
                />
              ))}
            </div>

            <div className="pegar-consumo-mensual">
              <textarea
                className="pegar-consumo-mensual__entrada"
                value={textoConsumoRapido}
                onChange={(event) => setTextoConsumoRapido(event.target.value)}
                onPaste={handleQuickConsumptionPaste}
                placeholder={'favor colocar texto en lista en el siguiente formato: Enero = xxxx'}
                rows={3}
              />
              <div className="pegar-consumo-mensual__acciones">
                <button
                  type="button"
                  className="pegar-consumo-mensual__aplicar"
                  onClick={handleApplyQuickConsumption}
                >
                  Añadir
                </button>
              </div>
            </div>
          </>
        )}

        {!esConsumoAnual && !esConsumoPrompt && estadoConsumoRapido && (
          <div className="pegar-consumo-mensual__estado" role="status">
            {estadoConsumoRapido}
          </div>
        )}
        {esConsumoPrompt && estadoPrompt.mensaje && (
          <div
            className={`estado-prompt estado-prompt--${estadoPrompt.tipo || 'info'}`}
            role="status"
          >
            {estadoPrompt.mensaje}
          </div>
        )}

        <div className="resumen-consumo-mensual">
          <div>
            Promedio mensual:{' '}
            <strong>
              {Number.isFinite(consumoMensual)
                ? `${Math.round(consumoMensual).toLocaleString()} kWh`
                : esConsumoAnual
                  ? 'Ingresa consumo anual'
                  : esConsumoPrompt
                    ? 'Analiza el prompt'
                    : 'Completa los 12 meses'}
            </strong>
          </div>
          <div>
            Consumo anual:{' '}
            <strong>
              {Number.isFinite(consumoAnual)
                ? `${Math.round(consumoAnual).toLocaleString()} kWh`
                : esConsumoAnual
                  ? 'Ingresa consumo anual'
                  : esConsumoPrompt
                    ? 'Analiza el prompt'
                    : 'Completa los 12 meses'}
            </strong>
          </div>
        </div>
      </div>

      {!esConsumoPrompt && (
        <div className="cuadricula-calculo">
          <div className="grupo-entrada-calculo">
            <label>Tipo de Instalación</label>
            <select value={data.tipoInstalacion} onChange={e => setData({ ...data, tipoInstalacion: e.target.value })}>
              <option value="">-- Seleccione tipo --</option>
              <option value="Residencial">Residencial</option>
              <option value="Comercial">Comercial</option>
              <option value="Industrial">Industrial</option>
            </select>
          </div>

          <div className="grupo-entrada-calculo">
            <label>Tipo de Estructura</label>
            <select value={data.tipoMontaje} onChange={e => setData({ ...data, tipoMontaje: e.target.value })}>
              <option value="">-- Seleccione tipo --</option>
              <option value="Losa">Losa</option>
              <option value="Piso">Piso</option>
              <option value="S-5">S-5 (Engargolado)</option>
              <option value="TPO">TPO-Horizontal</option>
              <option value="Teja">Teja</option>
            </select>
          </div>

          {data.tipoMontaje === 'TPO' && (
            <div className="grupo-entrada-calculo">
              <label>Orientación TPO</label>
              <select
                value={data.tipoTPO || 'HORIZONTAL'}
                onChange={(e) => setData({ ...data, tipoTPO: e.target.value })}
              >
                <option value="HORIZONTAL">Horizontal (B Rail 1370)</option>
                <option value="VERTICAL">Vertical (B Rail 1800)</option>
              </select>
            </div>
          )}

          {data.tipoMontaje === 'Piso' && (
            <div className="grupo-entrada-calculo">
              <label>Configuración Piso</label>
              <select
                value={data.configuracionPiso || 'MIRANDO_AL_SUR'}
                onChange={(e) => setData({ ...data, configuracionPiso: e.target.value })}
              >
                <option value="MIRANDO_AL_SUR">Mirando al Sur</option>
                <option value="ESTE_OESTE">Este - Oeste</option>
              </select>
            </div>
          )}

          <CampoEntrada
            label="Distancia de cable (m)"
            type="number"
            min="0"
            value={data.distanciaInversor}
            onChange={e => handleNumberChange('distanciaInversor', e.target.value)}
            onBlur={() => handleBlur('distanciaInversor')}
          />

          <CampoEntrada
            label="HSP (Horas Sol Pico)"
            type="number"
            min="0"
            step="0.1"
            value={data.horasSolPico}
            onChange={e => handleNumberChange('horasSolPico', e.target.value)}
            onBlur={() => handleBlur('horasSolPico')}
          />
          <CampoEntrada
            label="batería(kWh)(opcional)"
            type="number"
            min="0"
            step="0.1"
            value={data.capacidadBateriaObjetivo}
            onChange={e => handleNumberChange('capacidadBateriaObjetivo', e.target.value)}
            onBlur={() => handleBlur('capacidadBateriaObjetivo')}
          />
            <div className="grupo-entrada-calculo">
            <label>Opciones de inversores</label>
            <select value={data.opcionInversor} onChange={e => setData({ ...data, opcionInversor: e.target.value })}>
              <option value="">-- Seleccione tipo --</option>
              <option value="ConBateria">OffGrid</option>
              <option value="SinBateria">OnGrid [microinversor]</option>
              <option value="Hibrido">Hibrido</option>
              <option value="microInversor">OnGrid-Inversor de cadena</option>
            </select>
          </div>
          <div className="grupo-entrada-calculo">
            <label>Conexion electrica</label>
            <div className="conexion-electrica-opciones">
              <button
                type="button"
                className={`conexion-electrica-opciones__boton ${data.conexionElectrica === 'Monofasico' ? 'conexion-electrica-opciones__boton--activo' : ''}`}
                onClick={() => handleConexionElectricaChange('Monofasico')}
              >
                Monofásico
              </button>
              <button
                type="button"
                className={`conexion-electrica-opciones__boton ${data.conexionElectrica === 'Trifasico' ? 'conexion-electrica-opciones__boton--activo' : ''}`}
                onClick={() => handleConexionElectricaChange('Trifasico')}
              >
                Trifásico
              </button>
              {data.conexionElectrica === 'Trifasico' && (
                <select
                  className="conexion-electrica-opciones__select"
                  value={data.tensionConexionTrifasica || '208-220'}
                  onChange={(e) => setData((prev) => ({ ...prev, tensionConexionTrifasica: e.target.value }))}
                >
                  <option value="208-220">208 - 220</option>
                  <option value="480">480</option>
                  <option value="240">240</option>
                </select>
              )}
            </div>
          </div>
        </div>
      )}


      <div className="solucion-solar">
        <label className="solucion-solar__titulo">
          Tipo de Solución Inteligente
        </label>

        <div className="cuadricula-recomendacion">
          {Object.entries(PROFILE_CONFIG).map(([profile, config]) => {
            const recommendation = panelRecommendations[profile];

            return (
              <button
                type="button"
                key={profile}
                onClick={() => setData({ ...data, recommendationProfile: profile })}
                className={`boton-recomendacion ${data.recommendationProfile === profile ? 'active' : ''}`}
              >
                <div className="boton-recomendacion__titulo">{config.icon} {config.label}</div>
                <div className="boton-recomendacion__descripcion">{config.description}</div>
                {recommendation && (
                  <div className="boton-recomendacion__panel">
                    {recommendation.numPaneles} x {recommendation.power}W
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
