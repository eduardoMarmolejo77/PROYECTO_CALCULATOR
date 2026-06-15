import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CalculadoraInteligente from './CalculadoraInteligente';
import SelectorProductos from '../../../compartido/componentes/SelectorProductos';
import Boton from '../../../compartido/componentes/Boton';
import {
  buildProductSearchIndex,
  compactSearchText,
  getSearchScore,
  normalizeSearchText,
} from '../../../compartido/utils/busquedaProductos';
import CargadorPdfCotizacion from '../../pdf/componentes/CargadorPdfCotizacion';
import GeneradorPdfFusionado from '../../pdf/componentes/GeneradorPdfFusionado';
import BarraNavegacion from '../../../core/navegacion/BarraNavegacion';
import PantallaConfirmacion from './PantallaConfirmacion';
import { calcularPiezasSistema, calcularSistemaCorigy } from '../servicios/servicioCalculoPiezas';
import { obtenerCotizacionPorId } from '../configuracion/catalogoProductos';
import { crearCotizacionEnInterfuerza } from '../servicios/servicioCrearCotizacion';
import { generarPdfCotizacionDesdeApi } from '../../pdf/servicios/servicioPdfCotizacion';
import {
  enriquecerLineasCotizacionConProductos,
  extraerReferenciasFichasDesdeLineasCotizacion,
  generarPdfFusionadoConFichas,
  verificarFichasDisponibles,
} from '../../pdf/servicios/servicioFichasPdf';
import '../estilos/propuesta.css';
import '../estilos/precotizacion.css';
import '../../pdf/estilos/fusion.css';
import '../estilos/confirmacion.css';

const OPCIONES_TIPO_ESTRUCTURA = [
  { value: 'Losa', label: 'Losa' },
  { value: 'Piso', label: 'Piso' },
  { value: 'S-5', label: 'S-5 (Engargolado)' },
  { value: 'TPO', label: 'TPO' },
  { value: 'Teja', label: 'Teja' },
];
const PANEL_LINE_KEY = 'panel-principal';
const MENUS_FLUJO = new Set(['calculadora', 'recomendaciones', 'fusion', 'confirmacion']);
const RUTAS_COTIZACION_SIN_CALCULADORA = new Set(['/cotizar-sin-calculadora']);
const PRODUCT_PROMPT_STOPWORDS = new Set([
  'agrega',
  'agregar',
  'agregame',
  'agreguen',
  'anade',
  'anadir',
  'añade',
  'añadir',
  'buscar',
  'busca',
  'cotiza',
  'cotizar',
  'de',
  'del',
  'el',
  'en',
  'favor',
  'la',
  'las',
  'los',
  'para',
  'por',
  'porfa',
  'porfavor',
  'producto',
  'productos',
  'quiero',
  'referencia',
  'referencias',
  'sumar',
  'un',
  'una',
  'unos',
  'unas',
]);
const PRODUCT_PROMPT_QUANTITY_HINTS = [
  'panel',
  'paneles',
  'modulo',
  'modulos',
  'moduloes',
  'inversor',
  'inversores',
  'microinversor',
  'microinversores',
  'bateria',
  'baterias',
  'rack',
  'racks',
  'cable',
  'cables',
  'rollo',
  'rollos',
  'kit',
  'kits',
  'estructura',
  'estructuras',
  'clamp',
  'clamps',
  'riel',
  'rieles',
  'rail',
  'rails',
];
const PRODUCT_PROMPT_MEASUREMENT_HINTS = [
  'w',
  'wp',
  'kw',
  'kwp',
  'kwh',
  'v',
  'vac',
  'vdc',
  'ah',
  'a',
  'amp',
  'amps',
];

const MATERIAL_MATCHERS = {
  'cor-base-lastre': [['lastre'], ['base', 'losa']],
  'cor-end-clamp': [['end', 'clamp'], ['grapa', 'final']],
  'cor-mid-clamp': [['mid', 'clamp'], ['grapa', 'intermedia']],
  'cor-front-leg': [['front', 'leg'], ['soporte', 'frontal']],
  'cor-rear-leg': [['rear', 'leg'], ['soporte', 'trasero']],
  'cor-rail-5850': [['riel', '5850'], ['rail', '5850']],
  'cor-rail-4700': [['riel', '4700'], ['rail', '4700']],
  'cor-rail-3700': [['riel', '3700'], ['rail', '3700']],
  'cor-rail-2400': [['riel', '2400'], ['rail', '2400']],
  'cor-rail-1250': [['riel', '1250'], ['rail', '1250']],
  'cor-rail-lastre': [['riel', 'lastre']],
  'cor-rail-transversal': [['riel', 'transversal']],
  'cor-rail-piso': [['riel', 'piso']],
  'cor-b-rail-1370': [['b', 'rail', '1370']],
  'cor-b-rail-1800': [['b', 'rail', '1800']],
  'cor-side-windshield': [['side', 'windshield'], ['deflector', 'lateral']],
  'cor-rear-windshield': [['rear', 'windshield'], ['deflector', 'trasero']],
  'cor-splice': [['splice'], ['conector', 'riel']],
  'cor-ground-lug': [['grounding', 'lug'], ['puesta', 'tierra']],
  'cor-feet-l': [['feet', 'l'], ['pie', 'l']],
  'cor-wd': [['wd']],
  'cor-s5-edge': [['s-5', 'edge'], ['s5', 'edge']],
  'cor-s5-mid': [['s-5', 'mid'], ['s5', 'mid']],
  'cor-s5-base': [['s-5', 'base'], ['s5', 'base']],
  'cor-s5-bonding-clip': [['bonding', 'clip'], ['s-5', 'bonding']],
  'cor-cable-clip': [['cable', 'clip']],
  'cor-tpo-base': [['tpo'], ['base']],
  'cor-fijacion-piso': [['fijacion', 'piso'], ['anclaje', 'piso']],
  'cor-fijacion-piso-2': [['fijacion', 'piso', '2']],
  'cor-soporte-piso': [['soporte', 'piso']],
  'cor-roof-hook': [['gancho', 'teja'], ['roof', 'hook']],
  'cab-solar-4-200': [['cable', 'solar', '4', '200'], ['cable', '200']],
  'cab-solar-4-500': [['cable', 'solar', '4', '500'], ['cable', '500']],
};

function normalizarCantidadPaneles(valor, respaldo = 1) {
  const cantidad = Number.parseInt(valor, 10);
  if (Number.isFinite(cantidad) && cantidad > 0) return cantidad;
  return Math.max(1, Number.parseInt(respaldo, 10) || 1);
}

function formatearNumeroTecnico(valor, decimales = 0) {
  const numero = Number.parseFloat(valor);
  if (!Number.isFinite(numero)) return '0';

  return numero.toLocaleString(undefined, {
    maximumFractionDigits: decimales,
    minimumFractionDigits: 0,
  });
}

function construirResumenRollosCable(cable) {
  if (!cable) return '';

  const partes = [];
  if (Number(cable.rollosDe500m) > 0) {
    partes.push(`${formatearNumeroTecnico(cable.rollosDe500m)} rollo(s) de 500m`);
  }
  if (Number(cable.rollosDe200m) > 0) {
    partes.push(`${formatearNumeroTecnico(cable.rollosDe200m)} rollo(s) de 200m`);
  }

  return partes.join(' + ');
}

function formatearMoneda(valor) {
  const numero = Number.parseFloat(valor);
  if (!Number.isFinite(numero)) return '$0.00';

  return numero.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function descargarBytes(bytes, nombreArchivo) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

function esperar(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function normalizarTextoBusqueda(valor) {
  return normalizeSearchText(valor);
}

function parseNumeroFlexible(valor) {
  const texto = String(valor || '').replace(',', '.');
  const numero = Number.parseFloat(texto);
  return Number.isFinite(numero) ? numero : Number.NaN;
}

function getStockProducto(producto) {
  const stock = Number.parseFloat(producto?.stock);
  return Number.isFinite(stock) ? stock : 0;
}

function getTextoProducto(producto) {
  if (!producto) return '';

  return normalizarTextoBusqueda([
    producto.id,
    producto.name,
    producto.description,
    producto.category,
    producto.raw?.Producto?.Category_L1,
    producto.raw?.Producto?.Category_L2,
    producto.raw?.Producto?.Category_L3,
    producto.raw?.Producto?.Type,
    producto.raw?.Producto?.Marca,
    producto.raw?.Producto?.Item_Number,
  ].filter(Boolean).join(' '));
}

function cumpleGrupoTerminos(textoProducto, terminosGrupo) {
  return terminosGrupo.every((termino) => textoProducto.includes(normalizarTextoBusqueda(termino)));
}

function limpiarLineaPromptProducto(valor) {
  return String(valor || '')
    .replace(/\r/g, '')
    .replace(/^\s*(?:[-*•]+|\d+[.)])\s*/, '')
    .trim();
}

function extraerCantidadPromptProducto(texto) {
  const textoLimpio = limpiarLineaPromptProducto(texto);
  const patronesInicio = [
    /^(?<cantidad>\d+(?:[.,]\d+)?)\s*(?:x|u|ud|uds|unidad(?:es)?|pieza(?:s)?|pza(?:s)?|rollo(?:s)?|panel(?:es)?|kit(?:s)?|bateria(?:s)?|inversor(?:es)?|microinversor(?:es)?|modulo(?:s)?|riel(?:es)?|rail(?:s)?|cable(?:s)?)\b[\s:.-]*/i,
    /^(?:x|qty|cantidad)\s*(?<cantidad>\d+(?:[.,]\d+)?)\b[\s:.-]*/i,
  ];
  const patronesFin = [
    /\b(?:x|qty|cantidad)\s*(?<cantidad>\d+(?:[.,]\d+)?)\s*$/i,
  ];

  for (const patron of patronesInicio) {
    const coincidencia = textoLimpio.match(patron);
    if (!coincidencia) continue;
    const cantidad = Math.max(1, Math.round(parseNumeroFlexible(coincidencia.groups?.cantidad)));
    const descripcion = textoLimpio.replace(patron, '').trim();
    return {
      cantidad: Number.isFinite(cantidad) ? cantidad : 1,
      descripcion: descripcion || textoLimpio,
    };
  }

  for (const patron of patronesFin) {
    const coincidencia = textoLimpio.match(patron);
    if (!coincidencia) continue;
    const cantidad = Math.max(1, Math.round(parseNumeroFlexible(coincidencia.groups?.cantidad)));
    const descripcion = textoLimpio.replace(patron, '').trim();
    return {
      cantidad: Number.isFinite(cantidad) ? cantidad : 1,
      descripcion: descripcion || textoLimpio,
    };
  }

  const cantidadInicial = textoLimpio.match(/^(?<cantidad>\d{1,3})(?:[.,]0+)?\s+(?<resto>.+)$/i);
  if (cantidadInicial?.groups) {
    const cantidad = Math.max(1, Math.round(parseNumeroFlexible(cantidadInicial.groups.cantidad)));
    const descripcion = String(cantidadInicial.groups.resto || '').trim();
    const primerToken = normalizarTextoBusqueda(descripcion).split(' ').filter(Boolean)[0] || '';
    const esPistaCantidad = PRODUCT_PROMPT_QUANTITY_HINTS.includes(primerToken);
    const esMedida = PRODUCT_PROMPT_MEASUREMENT_HINTS.includes(primerToken);

    if (Number.isFinite(cantidad) && !esMedida && (esPistaCantidad || /\D.*\d|\d.*\D/.test(descripcion) || descripcion.split(/\s+/).length >= 2)) {
      return {
        cantidad,
        descripcion: descripcion || textoLimpio,
      };
    }
  }

  return { cantidad: 1, descripcion: textoLimpio };
}

function extraerTokensReferenciaProducto(texto) {
  return [...new Set(
    (String(texto || '').match(/[A-Za-z0-9][A-Za-z0-9./-]{2,}/g) || [])
      .map((token) => token.trim())
      .filter(Boolean)
      .filter((token) => (/[a-z]/i.test(token) && /\d/.test(token)) || /[-/]/.test(token))
  )];
}

function extraerSenalesPromptProducto(texto) {
  const normalizado = normalizarTextoBusqueda(texto);
  const tokens = normalizado
    .split(' ')
    .filter(Boolean)
    .filter((token) => !PRODUCT_PROMPT_STOPWORDS.has(token))
    .filter((token) => token.length > 1 || /\d/.test(token));
  const watts = [...new Set(
    [...String(texto || '').matchAll(/(\d+(?:[.,]\d+)?)\s*(kwp|kva|kw|wp|watts?|w)\b/gi)]
      .map((coincidencia) => compactSearchText(`${coincidencia[1]}${coincidencia[2]}`))
  )];
  const voltajes = [...new Set(
    [...String(texto || '').matchAll(/(\d+(?:[.,]\d+)?)\s*v(?:dc|ac)?\b/gi)]
      .map((coincidencia) => compactSearchText(`${coincidencia[1]}v`))
  )];
  const referencias = extraerTokensReferenciaProducto(texto).map((token) => compactSearchText(token));
  const consulta = tokens.join(' ').trim();

  return {
    consulta,
    tokens,
    watts,
    voltajes,
    referencias,
  };
}

function desglosarPromptProductos(texto) {
  const bloquesBase = String(texto || '')
    .split(/[\n;]+/)
    .map(limpiarLineaPromptProducto)
    .filter(Boolean);
  const bloques = bloquesBase.length === 1
    ? bloquesBase[0]
      .split(/\s*,\s*/)
      .map(limpiarLineaPromptProducto)
      .filter(Boolean)
    : bloquesBase;

  return bloques.map((linea, indice) => {
    const { cantidad, descripcion } = extraerCantidadPromptProducto(linea);
    const senales = extraerSenalesPromptProducto(descripcion);

    return {
      id: `prompt-${indice + 1}`,
      lineaOriginal: linea,
      descripcion,
      cantidad,
      ...senales,
    };
  }).filter((item) => item.descripcion && (item.consulta || item.referencias.length > 0));
}

function puntuarProductoParaPrompt(indexado, solicitud) {
  const { haystack, compactHaystack, exactFields, product } = indexado;
  const tokensCoincidentes = solicitud.tokens.filter((token) => {
    const tokenCompacto = compactSearchText(token);
    return haystack.includes(token) || compactHaystack.includes(tokenCompacto);
  });
  const wattsCoincidentes = solicitud.watts.filter((token) => compactHaystack.includes(token));
  const voltajesCoincidentes = solicitud.voltajes.filter((token) => compactHaystack.includes(token));
  const referenciasCoincidentes = solicitud.referencias.filter((token) => compactHaystack.includes(token));
  const coincidenciasFuertes = referenciasCoincidentes.length + wattsCoincidentes.length + voltajesCoincidentes.length;
  const coincidenciasRequeridas = solicitud.tokens.length >= 4
    ? 2
    : solicitud.tokens.length >= 2
      ? 1
      : 0;

  if (tokensCoincidentes.length < coincidenciasRequeridas && coincidenciasFuertes === 0) {
    return null;
  }

  let puntaje = tokensCoincidentes.length * 12;
  const puntajeEstricto = solicitud.consulta ? getSearchScore(indexado, solicitud.consulta) : -1;

  if (puntajeEstricto >= 0) {
    puntaje += puntajeEstricto;
  } else {
    tokensCoincidentes.forEach((token) => {
      if (exactFields.id.includes(token)) puntaje += 18;
      if (exactFields.name.includes(token)) puntaje += 12;
      if (exactFields.description.includes(token)) puntaje += 8;
    });
  }

  puntaje += referenciasCoincidentes.length * 24;
  puntaje += wattsCoincidentes.length * 18;
  puntaje += voltajesCoincidentes.length * 16;
  puntaje += Math.min(15, getStockProducto(product));

  return {
    product,
    puntaje,
    stock: getStockProducto(product),
    precio: Number.parseFloat(product?.price) || 0,
    tokensCoincidentes,
    referenciasCoincidentes,
    wattsCoincidentes,
    voltajesCoincidentes,
    puntajeEstricto,
  };
}

function resolverProductoDesdePrompt(indexados, solicitud) {
  const candidatos = indexados
    .map((indexado) => puntuarProductoParaPrompt(indexado, solicitud))
    .filter(Boolean)
    .sort((a, b) => (
      b.puntaje - a.puntaje ||
      b.stock - a.stock ||
      a.precio - b.precio
    ));

  const mejor = candidatos[0];
  const segundo = candidatos[1];
  if (!mejor) {
    return { producto: null, confianza: 'ninguna', candidatos: [] };
  }

  const totalSenales = solicitud.tokens.length + solicitud.referencias.length + solicitud.watts.length + solicitud.voltajes.length;
  const coincidenciasLogradas = mejor.tokensCoincidentes.length +
    mejor.referenciasCoincidentes.length +
    mejor.wattsCoincidentes.length +
    mejor.voltajesCoincidentes.length;
  const cobertura = totalSenales > 0 ? (coincidenciasLogradas / totalSenales) : 0;
  const diferencia = segundo ? (mejor.puntaje - segundo.puntaje) : mejor.puntaje;
  const tieneReferenciaFuerte = mejor.referenciasCoincidentes.length > 0 || mejor.wattsCoincidentes.length > 0 || mejor.voltajesCoincidentes.length > 0;
  const aceptable = mejor.puntajeEstricto >= 0 || tieneReferenciaFuerte || (mejor.puntaje >= 30 && cobertura >= 0.55);

  if (!aceptable) {
    return { producto: null, confianza: 'baja', candidatos: candidatos.slice(0, 3) };
  }

  let confianza = 'media';
  if ((mejor.puntajeEstricto >= 0 || tieneReferenciaFuerte) && (cobertura >= 0.75 || diferencia >= 15)) {
    confianza = 'alta';
  } else if (cobertura < 0.45 && !tieneReferenciaFuerte) {
    confianza = 'baja';
  }

  if (confianza === 'baja') {
    return { producto: null, confianza, candidatos: candidatos.slice(0, 3) };
  }

  return { producto: mejor.product, confianza, candidatos: candidatos.slice(0, 3) };
}

function resolverProductoCatalogo(productos, opciones = {}) {
  const {
    gruposTerminos = [],
    terminosExcluidos = [],
    stockMinimo = 0,
  } = opciones;

  const candidatos = productos
    .map((producto) => {
      const texto = getTextoProducto(producto);
      const stock = getStockProducto(producto);
      const precio = Number.parseFloat(producto?.price) || 0;
      const coincideExclusion = terminosExcluidos.some((termino) =>
        texto.includes(normalizarTextoBusqueda(termino))
      );

      if (coincideExclusion) return null;
      if (stock < stockMinimo) return null;

      const puntaje = gruposTerminos.reduce((score, grupo) => (
        cumpleGrupoTerminos(texto, grupo) ? score + (grupo.length * 10) : score
      ), 0);

      if (puntaje <= 0) return null;

      return { producto, puntaje, stock, precio };
    })
    .filter(Boolean)
    .sort((a, b) => (
      b.puntaje - a.puntaje ||
      b.stock - a.stock ||
      a.precio - b.precio
    ));

  return candidatos[0]?.producto || null;
}

function resolverMaterialDesdeCatalogo(productos, pieza, cantidadRequerida = 1) {
  const gruposTerminos = MATERIAL_MATCHERS[pieza.id] || [[pieza.name]];
  const terminosExcluidos = ['inversor', 'inverter', 'bateria', 'battery'];
  const conStock = resolverProductoCatalogo(productos, {
    gruposTerminos,
    terminosExcluidos,
    stockMinimo: Math.max(0.01, Number(cantidadRequerida) || 0.01),
  });
  if (conStock) return conStock;
  return resolverProductoCatalogo(productos, { gruposTerminos, terminosExcluidos });
}

function extraerPotenciaInversorKw(producto) {
  const texto = `${producto?.name || ''} ${producto?.description || ''}`;
  const matchKw = texto.match(/(\d+(?:[.,]\d+)?)\s*(kw|kva)\b/i);
  if (matchKw) return parseNumeroFlexible(matchKw[1]);

  const matchW = texto.match(/(\d{3,5})\s*w\b/i);
  if (matchW) {
    const watts = Number.parseFloat(matchW[1]);
    if (Number.isFinite(watts)) return watts / 1000;
  }

  return Number.NaN;
}

function extraerCapacidadBateriaKwh(producto) {
  const texto = `${producto?.name || ''} ${producto?.description || ''}`;
  const matchKwh = texto.match(/(\d+(?:[.,]\d+)?)\s*kwh\b/i);
  if (matchKwh) return parseNumeroFlexible(matchKwh[1]);

  const matchAh = texto.match(/(\d+(?:[.,]\d+)?)\s*ah\b/i);
  const matchVoltaje = texto.match(/(12|24|48|51\.2)\s*v\b/i);
  if (!matchAh || !matchVoltaje) return Number.NaN;

  const ah = parseNumeroFlexible(matchAh[1]);
  const voltaje = parseNumeroFlexible(matchVoltaje[1]);
  if (!Number.isFinite(ah) || !Number.isFinite(voltaje)) return Number.NaN;

  return (ah * voltaje) / 1000;
}

function estimarPotenciaInversorKw(resultados) {
  const consumoAnual = Number(resultados?.consumoAnual) || 0;
  const horasSolPico = Number(resultados?.horasSolPico) || 4.5;
  const potenciaSolarKw = (Number(resultados?.potenciaTotalWp) || 0) / 1000;
  const consumoDiario = consumoAnual > 0 ? consumoAnual / 365 : 0;
  const base = Math.max(
    potenciaSolarKw * 0.8,
    (consumoDiario / Math.max(0.1, horasSolPico)) * 1.15
  );

  const factorBateria = (resultados?.incluyeBateria ?? true) ? 1.2 : 1;
  const requerido = base * factorBateria;
  const escalado = Math.ceil(requerido * 2) / 2;

  return Math.max(1.5, escalado);
}

function estimarCapacidadBateriaKwh(resultados) {
  const consumoAnual = Number(resultados?.consumoAnual) || 0;
  const consumoDiario = consumoAnual > 0 ? consumoAnual / 365 : 0;
  const objetivoManual = Number(resultados?.capacidadBateriaObjetivo);
  if (Number.isFinite(objetivoManual) && objetivoManual > 0) return objetivoManual;

  const capacidadEstimadda = consumoDiario * 0.65;
  return Math.max(2, Math.ceil(capacidadEstimadda * 2) / 2);
}

function obtenerGruposTerminosInversor(resultados) {
  const opcion = String(resultados?.opcionInversor || '').trim();
  const base = [['inversor'], ['inverter']];

  if (opcion === 'ConBateria') {
    return [...base, ['off-grid'], ['offgrid'], ['bateria'], ['hibrido'], ['hybrid']];
  }

  if (opcion === 'Hibrido') {
    return [...base, ['hibrido'], ['hybrid']];
  }

  if (opcion === 'SinBateria') {
    return [...base, ['on-grid'], ['ongrid'], ['microinversor'], ['micro', 'inverter']];
  }

  if (opcion === 'microInversor') {
    return [['microinversor'], ['micro', 'inverter'], ['string', 'inverter'], ['on-grid']];
  }

  return (resultados?.incluyeBateria ?? true)
    ? [...base, ['hibrido'], ['hybrid'], ['off-grid'], ['bateria']]
    : base;
}

function puntuarCompatibilidadConexion(textoProducto, resultados) {
  const conexion = String(resultados?.conexionElectrica || '').trim();
  const tension = String(resultados?.tensionConexionTrifasica || '').trim();
  if (!conexion) return 0;

  const tieneMonofasico = /monofasic|single\s*phase|1f|1\s*phase/.test(textoProducto);
  const tieneTrifasico = /trifasic|three\s*phase|3f|3\s*phase/.test(textoProducto);

  let score = 0;

  if (conexion === 'Monofasico') {
    if (tieneMonofasico) score += 18;
    if (tieneTrifasico) score -= 10;
  }

  if (conexion === 'Trifasico') {
    if (tieneTrifasico) score += 22;
    if (tieneMonofasico) score -= 10;

    const mapaTension = {
      '208-220': /208|220/,
      '240': /240/,
      '480': /480/,
    };
    const patron = mapaTension[tension];
    if (patron && patron.test(textoProducto)) {
      score += 14;
    }
  }

  return score;
}

function recomendarInversorDesdeCatalogo(productos, resultados) {
  const potenciaObjetivo = estimarPotenciaInversorKw(resultados);
  const gruposTerminos = obtenerGruposTerminosInversor(resultados);

  const candidatos = productos
    .map((producto) => {
      const texto = getTextoProducto(producto);
      const stock = getStockProducto(producto);
      if (!gruposTerminos.some((grupo) => cumpleGrupoTerminos(texto, grupo))) return null;

      const potenciaKw = extraerPotenciaInversorKw(producto);
      if (!Number.isFinite(potenciaKw) || potenciaKw <= 0) return null;

      const distancia = potenciaKw >= potenciaObjetivo ? potenciaKw - potenciaObjetivo : potenciaObjetivo - potenciaKw + 2;
      const compatibilidadConexion = puntuarCompatibilidadConexion(texto, resultados);
      return {
        producto,
        potenciaKw,
        distancia,
        stock,
        compatibilidadConexion,
        precio: Number.parseFloat(producto?.price) || 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (
      b.compatibilidadConexion - a.compatibilidadConexion ||
      a.distancia - b.distancia ||
      b.stock - a.stock ||
      a.precio - b.precio
    ));

  const conStock = candidatos.find((item) => item.stock > 0);
  return { producto: (conStock || candidatos[0])?.producto || null, potenciaObjetivoKw: potenciaObjetivo };
}

function recomendarBateriaDesdeCatalogo(productos, resultados) {
  if (resultados?.incluyeBateria === false) {
    return { producto: null, capacidadObjetivoKwh: Number(resultados?.capacidadBateriaObjetivo) || 0 };
  }

  const capacidadObjetivo = estimarCapacidadBateriaKwh(resultados);
  const terminosBateria = [['bateria'], ['battery'], ['lifepo'], ['litio']];
  const candidatos = productos
    .map((producto) => {
      const texto = getTextoProducto(producto);
      const stock = getStockProducto(producto);
      if (!terminosBateria.some((grupo) => cumpleGrupoTerminos(texto, grupo))) return null;

      const capacidadKwh = extraerCapacidadBateriaKwh(producto);
      if (!Number.isFinite(capacidadKwh) || capacidadKwh <= 0) return null;

      const distancia = capacidadKwh >= capacidadObjetivo
        ? capacidadKwh - capacidadObjetivo
        : capacidadObjetivo - capacidadKwh + 1;

      return {
        producto,
        capacidadKwh,
        distancia,
        stock,
        precio: Number.parseFloat(producto?.price) || 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (
      a.distancia - b.distancia ||
      b.stock - a.stock ||
      a.precio - b.precio
    ));

  const conStock = candidatos.find((item) => item.stock > 0);
  return { producto: (conStock || candidatos[0])?.producto || null, capacidadObjetivoKwh: capacidadObjetivo };
}

function construirClaveExtraProducto(productId) {
  return `extra:${productId}`;
}

function construirDetallePanel(resultados) {
  const potencia = formatearNumeroTecnico(resultados.potenciaPanel || resultados.panelPower);
  const nombre = String(resultados.nombrePanel || resultados.panelName || '').trim();

  if (!nombre) return `${potencia} W`;

  const detalleLimpio = nombre
    .replace(/^[^/]+\/\s*/i, '')
    .replace(/\bpanel(?:\s+solar)?\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!detalleLimpio) return `${potencia} W`;
  if (new RegExp(`\\b${potencia}\\s*w\\b`, 'i').test(detalleLimpio)) return detalleLimpio;

  return `${potencia} W ${detalleLimpio}`;
}

function construirObservacionTecnica(resultados) {
  if (!resultados) return '';

  const perfil = resultados.recommendationProfile || resultados.perfilRecomendacion;
  const razonesPerfil = {
    balanced: 'Se priorizó un equilibrio entre inversión, rendimiento y cantidad de equipos.',
    stock: 'Se priorizó disponibilidad de inventario para facilitar una entrega e instalación más rápida.',
    premium: 'Se priorizó mayor potencia por panel y una configuración de mayor desempeño.',
  };
  const potenciaRequeridaKw = Number(resultados.potenciaRequeridaWp || resultados.requiredWp || 0) / 1000;
  const potenciaInstaladaKw = Number(resultados.potenciaTotalWp || resultados.totalWp || 0) / 1000;
  const produccionAnual = Number(resultados.produccionAnualEstimada || resultados.estimatedAnnualProduction || 0);
  const cobertura = Number(resultados.coberturaObjetivo || 0);
  const detalleMontaje = resultados.tipoMontaje
    ? (() => {
      if (resultados.tipoMontaje === 'TPO') {
        const orientacion = resultados.tipoTPO === 'VERTICAL' ? 'vertical' : 'horizontal';
        return ` sobre estructura TPO ${orientacion}`;
      }
      if (resultados.tipoMontaje === 'Piso') {
        const configPiso = resultados.configuracionPiso === 'ESTE_OESTE' ? 'Este-Oeste' : 'Mirando al Sur';
        return ` sobre estructura Piso (${configPiso})`;
      }
      return ` sobre estructura ${resultados.tipoMontaje}`;
    })()
    : '';
  const distancia = Number.isFinite(Number(resultados.distanciaInversor))
    ? ` y una distancia al inversor de ${formatearNumeroTecnico(resultados.distanciaInversor, 1)} m`
    : '';
  const opcionInversor = {
    ConBateria: 'Off-Grid',
    SinBateria: 'On-Grid microinversor',
    Hibrido: 'Híbrido',
    microInversor: 'On-Grid inversor de cadena',
  }[resultados.opcionInversor] || '';
  const conexionElectrica = resultados.conexionElectrica === 'Trifasico'
    ? `trifásica ${resultados.tensionConexionTrifasica || '208-220'}V`
    : resultados.conexionElectrica === 'Monofasico'
      ? 'monofásica'
      : '';
  const resumenRollosCable = construirResumenRollosCable(resultados.cable);
  const cableInfo = resultados.cable && resumenRollosCable
    ? `Se estiman ${resumenRollosCable} (${formatearNumeroTecnico(resultados.cable.metrosRequeridos, 0)} m requeridos, sobrante estimado ${formatearNumeroTecnico(resultados.cable.sobranteEstimado, 0)} m).`
    : '';
  const advertencias = Array.isArray(resultados.advertenciasMateriales)
    ? resultados.advertenciasMateriales.filter(Boolean).join(' ')
    : '';
  const totalMateriales = Array.isArray(resultados.piezas) ? resultados.piezas.length : 0;
  const resumenMateriales = totalMateriales > 0
    ? `La propuesta considera ${totalMateriales} material(es) técnicos calculados automáticamente.`
    : '';

  return [
    razonesPerfil[perfil] || 'Se eligió la configuración que mejor se ajusta a los parámetros ingresados.',
    `Con ${resultados.cantidadPaneles} panel(es) de ${construirDetallePanel(resultados)} se instala una potencia aproximada de ${formatearNumeroTecnico(potenciaInstaladaKw, 2)} kWp frente a una necesidad calculada de ${formatearNumeroTecnico(potenciaRequeridaKw, 2)} kWp.`,
    `La estimación considera ${formatearNumeroTecnico(cobertura)}% de cobertura, ${formatearNumeroTecnico(resultados.horasSolPico, 1)} HSP, performance ratio de ${formatearNumeroTecnico(resultados.performanceRatio)}%${detalleMontaje}${distancia}.`,
    opcionInversor ? `Preferencia de inversor aplicada: ${opcionInversor}.` : '',
    conexionElectrica ? `Conexión eléctrica objetivo: ${conexionElectrica}.` : '',
    resultados.incluyeBateria ? 'Se activó respaldo con batería para recomendar configuración híbrida/off-grid.' : 'Se priorizó solución sin banco de baterías.',
    resumenMateriales,
    cableInfo,
    advertencias,
    produccionAnual > 0 ? `Producción anual estimada: ${formatearNumeroTecnico(produccionAnual)} kWh/año.` : '',
  ].filter(Boolean).join(' ');
}

function crearSeleccionDesdeResultados(resultados, cantidadPaneles, productosCatalogo = []) {
  if (!resultados) return { seleccion: {}, detallePorClave: {} };

  const cantidad = normalizarCantidadPaneles(cantidadPaneles, resultados.cantidadPaneles);
  const seleccion = {};
  const detallePorClave = {};
  const panelKey = PANEL_LINE_KEY;

  seleccion[panelKey] = cantidad;
  detallePorClave[panelKey] = {
    tipo: 'panel',
    categoria: 'Panel recomendado',
    nombre: resultados.nombrePanel || 'Panel solar',
    productId: resultados.idPanel,
    piezaId: null,
    origen: 'IA',
  };

  const piezas = calcularPiezasSistema({
    cantidadPaneles: cantidad,
    tipoMontaje: resultados.tipoMontaje,
    distanciaInversor: resultados.distanciaInversor,
    tipoTPO: resultados.tipoTPO,
    configuracionPiso: resultados.configuracionPiso,
  });

  piezas.forEach((pieza) => {
    const clave = `material:${pieza.id}`;
    const productoCatalogo = resolverMaterialDesdeCatalogo(productosCatalogo, pieza, pieza.cant);
    seleccion[clave] = pieza.cant;
    detallePorClave[clave] = {
      tipo: 'material',
      categoria: 'Material calculado',
      nombre: productoCatalogo?.name || pieza.name,
      productId: productoCatalogo?.id || null,
      piezaId: pieza.id,
      origen: productoCatalogo ? 'Catálogo API' : 'Regla técnica',
    };
  });

  const recomendacionInversor = recomendarInversorDesdeCatalogo(productosCatalogo, {
    ...resultados,
    cantidadPaneles: cantidad,
  });

  if (recomendacionInversor.producto) {
    const claveInversor = 'equipo:inversor';
    seleccion[claveInversor] = 1;
    detallePorClave[claveInversor] = {
      tipo: 'equipo',
      categoria: `Inversor recomendado (${formatearNumeroTecnico(recomendacionInversor.potenciaObjetivoKw, 1)} kW objetivo)`,
      nombre: recomendacionInversor.producto.name,
      productId: recomendacionInversor.producto.id,
      piezaId: null,
      origen: 'Catálogo API',
    };
  }

  const recomendacionBateria = recomendarBateriaDesdeCatalogo(productosCatalogo, resultados);
  if (resultados?.incluyeBateria && recomendacionBateria.producto) {
    const claveBateria = 'equipo:bateria';
    seleccion[claveBateria] = 1;
    detallePorClave[claveBateria] = {
      tipo: 'equipo',
      categoria: `Batería recomendada (${formatearNumeroTecnico(recomendacionBateria.capacidadObjetivoKwh, 1)} kWh objetivo)`,
      nombre: recomendacionBateria.producto.name,
      productId: recomendacionBateria.producto.id,
      piezaId: null,
      origen: 'Catálogo API',
    };
  }

  return { seleccion, detallePorClave };
}

function construirResultadosConDimensionamiento(resultados, cantidadPaneles) {
  if (!resultados) return null;

  const cantidadNormalizada = normalizarCantidadPaneles(cantidadPaneles, resultados.cantidadPaneles);
  const potenciaPanel = Number(resultados.potenciaPanel || resultados.panelPower || 0);
  const potenciaTotalWp = potenciaPanel * cantidadNormalizada;
  const produccionAnualEstimada = (potenciaTotalWp / 1000) *
    365 *
    Number(resultados.horasSolPico || 0) *
    (Number(resultados.performanceRatio || 0) / 100);

  return {
    ...resultados,
    cantidadPaneles: cantidadNormalizada,
    numPaneles: cantidadNormalizada,
    potenciaTotalWp,
    totalWp: potenciaTotalWp,
    produccionAnualEstimada,
    estimatedAnnualProduction: produccionAnualEstimada,
  };
}

/**
 * Orquesta el flujo completo de propuestas.
 * Menú 1: calculadora.
 * Menú 2: recomendaciones.
 * Menú 3: fusión de PDF.
 */
export default function FlujoPropuesta({
  productos,
  categorias,
  clientes,
  cargandoCatalogo,
  errorCatalogo,
  iniciarSinCalculadora = false,
}) {
  const menuInicialFlujo = iniciarSinCalculadora ? 'recomendaciones' : 'calculadora';
  const [menuActual, setMenuActual] = useState(menuInicialFlujo);
  const [resultadosInteligentes, setResultadosInteligentes] = useState(null);
  const [productosSeleccionados, setProductosSeleccionados] = useState({});
  const [cotizacionPdf, setCotizacionPdf] = useState(null);
  const [numeroCotizacion] = useState(() => `FT-${Math.floor(Math.random() * 90000) + 10000}`);
  const [error, setError] = useState('');
  const [pdfFusionado, setPdfFusionado] = useState(false);
  const [personalizarRecomendacion, setPersonalizarRecomendacion] = useState(false);
  const [agregarProductos, setAgregarProductos] = useState(false);
  const [mostrarVentanaSelectorProductos, setMostrarVentanaSelectorProductos] = useState(false);
  const [cantidadPanelesPersonalizada, setCantidadPanelesPersonalizada] = useState(null);
  const [datosCalculadora, setDatosCalculadora] = useState(null);
  const [observacionTecnicaFija, setObservacionTecnicaFija] = useState('');
  const [calculoRealizado, setCalculoRealizado] = useState(false);
  const [detalleSeleccionProductos, setDetalleSeleccionProductos] = useState({});
  const [preciosPersonalizados, setPreciosPersonalizados] = useState({});
  const [descuentoPrecotizacion, setDescuentoPrecotizacion] = useState('0');
  const [promptArticulos, setPromptArticulos] = useState('');
  const [estadoPromptArticulos, setEstadoPromptArticulos] = useState({ tipo: '', mensaje: '' });
  const [procesandoPromptArticulos, setProcesandoPromptArticulos] = useState(false);
  const [vendedor, setVendedor] = useState('');
  const [comentariosCliente, setComentariosCliente] = useState('');
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState('');
  const [cargandoCreacion, setCargandoCreacion] = useState(false);
  const [cargandoFusion, setCargandoFusion] = useState(false);
  const [cargandoCotizacionSolo, setCargandoCotizacionSolo] = useState(false);
  const [puedeVerCotizacionSolo, setPuedeVerCotizacionSolo] = useState(false);
  const [resultadoCreacion, setResultadoCreacion] = useState(null);
  const [mensajeFusion, setMensajeFusion] = useState('');
  const menuActualRef = useRef(menuInicialFlujo);
  const botonCerrarSelectorRef = useRef(null);
  const productosSeleccionadosRef = useRef(productosSeleccionados);
  const detalleSeleccionProductosRef = useRef(detalleSeleccionProductos);

  useEffect(() => {
    menuActualRef.current = menuActual;
  }, [menuActual]);

  useEffect(() => {
    productosSeleccionadosRef.current = productosSeleccionados;
  }, [productosSeleccionados]);

  useEffect(() => {
    detalleSeleccionProductosRef.current = detalleSeleccionProductos;
  }, [detalleSeleccionProductos]);

  const navegarEnFlujo = useCallback((siguienteMenu, opciones = {}) => {
    const { desdeHistorial = false } = opciones;
    if (!MENUS_FLUJO.has(siguienteMenu)) return;

    const menuPrevio = menuActualRef.current;
    if (menuPrevio === siguienteMenu) return;

    if (menuPrevio === 'fusion' && siguienteMenu === 'recomendaciones') {
      setPdfFusionado(false);
    }

    setMenuActual(siguienteMenu);

    if (!desdeHistorial) {
      const estadoActual = window.history.state || {};
      window.history.pushState(
        {
          ...estadoActual,
          __flujoPropuesta: true,
          menuFlujo: siguienteMenu,
        },
        ''
      );
    }
  }, []);

  const resolverMenuInicial = useCallback((estado = {}) => {
    const menuEstado = MENUS_FLUJO.has(estado.menuFlujo) ? estado.menuFlujo : '';

    if (iniciarSinCalculadora && (!menuEstado || menuEstado === 'calculadora')) {
      return 'recomendaciones';
    }

    return menuEstado || menuInicialFlujo;
  }, [iniciarSinCalculadora, menuInicialFlujo]);

  useEffect(() => {
    const estadoActual = window.history.state || {};
    const menuInicial = resolverMenuInicial(estadoActual);

    window.history.replaceState(
      {
        ...estadoActual,
        __flujoPropuesta: true,
        menuFlujo: menuInicial,
      },
      ''
    );

    if (menuInicial !== menuActualRef.current) {
      setMenuActual(menuInicial);
    }

    const manejarPopState = (evento) => {
      const esRutaFlujo = ['/propuesta', '/cotizar-sin-calculadora'].includes(window.location.pathname);
      if (!esRutaFlujo) return;

      const esCotizacionSinCalculadora = RUTAS_COTIZACION_SIN_CALCULADORA.has(window.location.pathname);
      const menuEstado = MENUS_FLUJO.has(evento.state?.menuFlujo) ? evento.state.menuFlujo : '';
      const menuDestino = esCotizacionSinCalculadora && (!menuEstado || menuEstado === 'calculadora')
        ? 'recomendaciones'
        : menuEstado || (esCotizacionSinCalculadora ? 'recomendaciones' : 'calculadora');

      navegarEnFlujo(menuDestino, { desdeHistorial: true });
    };

    window.addEventListener('popstate', manejarPopState);
    return () => window.removeEventListener('popstate', manejarPopState);
  }, [navegarEnFlujo, resolverMenuInicial]);

  const cantidadPanelesActiva = resultadosInteligentes
    ? normalizarCantidadPaneles(
        cantidadPanelesPersonalizada ?? resultadosInteligentes.cantidadPaneles,
        resultadosInteligentes.cantidadPaneles
      )
    : 0;

  const calculoMaterialesActivo = useMemo(() => {
    if (!resultadosInteligentes) return null;

    return calcularSistemaCorigy({
      cantidadPaneles: cantidadPanelesActiva,
      tipoMontaje: resultadosInteligentes.tipoMontaje,
      distanciaInversor: resultadosInteligentes.distanciaInversor,
      tipoTPO: resultadosInteligentes.tipoTPO,
      configuracionPiso: resultadosInteligentes.configuracionPiso,
    });
  }, [cantidadPanelesActiva, resultadosInteligentes]);

  const piezasActivas = useMemo(
    () => calculoMaterialesActivo?.materiales || [],
    [calculoMaterialesActivo]
  );

  const resultadosVisibles = useMemo(() => {
    if (!resultadosInteligentes) return null;

    const resultados = construirResultadosConDimensionamiento(resultadosInteligentes, cantidadPanelesActiva);
    if (!resultados) return null;

    return {
      ...resultados,
      piezas: piezasActivas,
      cable: calculoMaterialesActivo?.cable || resultados.cable || null,
      advertenciasMateriales: calculoMaterialesActivo?.advertencias || resultados.advertenciasMateriales || [],
      tipoTPO: resultados.tipoTPO || calculoMaterialesActivo?.orientacionTPO || 'HORIZONTAL',
      configuracionPiso: resultados.configuracionPiso || calculoMaterialesActivo?.configuracionPiso || 'MIRANDO_AL_SUR',
    };
  }, [calculoMaterialesActivo, cantidadPanelesActiva, piezasActivas, resultadosInteligentes]);

  const observacionTecnicaVisible = useMemo(() => {
    if (!calculoRealizado) return '';
    if (observacionTecnicaFija) return observacionTecnicaFija;
    return resultadosVisibles ? construirObservacionTecnica(resultadosVisibles) : '';
  }, [calculoRealizado, observacionTecnicaFija, resultadosVisibles]);
  const mostrarBloquesIA = Boolean(
    calculoRealizado &&
    resultadosVisibles &&
    resultadosVisibles.nombrePanel !== 'Sin cálculo'
  );
  const mostrarAlertaVisual = Boolean(error);
  const tituloAlertaCotizacion = String(error || '').toLowerCase().includes('vendedor')
    ? 'Vendedor no seleccionado'
    : 'Cotización incompleta';

  useEffect(() => {
    if (!mostrarAlertaVisual) return undefined;

    const manejarTecla = (evento) => {
      if (evento.key === 'Escape') {
        setError('');
      }
    };

    window.addEventListener('keydown', manejarTecla);
    return () => window.removeEventListener('keydown', manejarTecla);
  }, [mostrarAlertaVisual]);

  useEffect(() => {
    if (!mostrarVentanaSelectorProductos) return undefined;

    const manejarTecla = (evento) => {
      if (evento.isComposing) return;
      if (evento.key !== 'Enter') return;

      evento.preventDefault();
      botonCerrarSelectorRef.current?.click();
    };

    window.addEventListener('keydown', manejarTecla);
    return () => window.removeEventListener('keydown', manejarTecla);
  }, [mostrarVentanaSelectorProductos]);

  const productosPorId = useMemo(
    () => new Map(productos.map((producto) => [producto.id, producto])),
    [productos]
  );
  const productosIndexados = useMemo(
    () => productos.map(buildProductSearchIndex),
    [productos]
  );
  const clientesPorId = useMemo(
    () => new Map((clientes || []).map((cliente) => [cliente.id, cliente])),
    [clientes]
  );
  const clienteActivoPorDefecto = useMemo(() => {
    if (!Array.isArray(clientes) || clientes.length === 0) return '';
    const clienteActivo = clientes.find((cliente) => String(cliente?.status || '').toUpperCase() === 'ACTIVE');
    return (clienteActivo || clientes[0])?.id || '';
  }, [clientes]);
  const clienteSeleccionadoIdEfectivo = (
    clienteSeleccionadoId && clientesPorId.has(clienteSeleccionadoId)
      ? clienteSeleccionadoId
      : clienteActivoPorDefecto
  );

  const lineasPrecotizacion = useMemo(() => (
    Object.entries(productosSeleccionados)
      .map(([claveProducto, cantidad]) => {
        const detalle = detalleSeleccionProductos[claveProducto] || {};
        const producto = detalle.productId ? productosPorId.get(detalle.productId) : null;
        const cantidadNormalizada = Math.max(0, Number.parseFloat(cantidad) || 0);
        const precioBase = Number.parseFloat(producto?.price) || 0;
        const precioPersonalizado = Number.parseFloat(preciosPersonalizados[claveProducto]);
        const precioUnitario = Number.isFinite(precioPersonalizado) ? Math.max(0, precioPersonalizado) : precioBase;
        const esPanelPrincipal = detalle.tipo === 'panel' || claveProducto === PANEL_LINE_KEY;
        const stockDisponible = getStockProducto(producto);

        return {
          id: claveProducto,
          codigo: producto?.raw?.Producto?.id || producto?.raw?.id || detalle.productId || claveProducto,
          itemNumber: producto?.raw?.Producto?.Item_Number || producto?.raw?.Item_Number || detalle.productId || claveProducto,
          nombre: producto?.name || detalle.nombre || `Producto ${claveProducto}`,
          categoria: detalle.categoria || (esPanelPrincipal ? 'Panel recomendado' : 'Material calculado'),
          origen: detalle.origen || 'Catálogo API',
          cantidad: cantidadNormalizada,
          precioInventario: precioBase,
          precioUnitario,
          total: cantidadNormalizada * precioUnitario,
          esPanelPrincipal,
          stockDisponible,
          enCatalogo: Boolean(producto),
        };
      })
      .filter((linea) => linea.cantidad > 0)
      .sort((a, b) => Number(b.esPanelPrincipal) - Number(a.esPanelPrincipal) || a.nombre.localeCompare(b.nombre))
  ), [detalleSeleccionProductos, preciosPersonalizados, productosPorId, productosSeleccionados]);

  const clavePorProductoId = useMemo(() => {
    const mapa = new Map();
    Object.entries(detalleSeleccionProductos).forEach(([clave, detalle]) => {
      if (!detalle?.productId || mapa.has(detalle.productId)) return;
      mapa.set(detalle.productId, clave);
    });
    return mapa;
  }, [detalleSeleccionProductos]);

  const seleccionadosPorProductoId = useMemo(() => {
    const seleccion = {};

    Object.entries(productosSeleccionados).forEach(([clave, cantidad]) => {
      const detalle = detalleSeleccionProductos[clave];
      if (!detalle?.productId) return;

      const cantidadNormalizada = Math.max(0, Number.parseFloat(cantidad) || 0);
      if (cantidadNormalizada <= 0) return;

      seleccion[detalle.productId] = (seleccion[detalle.productId] || 0) + cantidadNormalizada;
    });

    return seleccion;
  }, [detalleSeleccionProductos, productosSeleccionados]);

  const subtotalPrecotizacion = useMemo(
    () => lineasPrecotizacion.reduce((total, linea) => total + linea.total, 0),
    [lineasPrecotizacion]
  );

  const descuentoPorcentajeNormalizado = useMemo(() => {
    const descuento = Number.parseFloat(descuentoPrecotizacion);
    if (!Number.isFinite(descuento) || descuento < 0) return 0;
    return Math.min(descuento, 100);
  }, [descuentoPrecotizacion]);

  const descuentoMonto = useMemo(
    () => subtotalPrecotizacion * (descuentoPorcentajeNormalizado / 100),
    [descuentoPorcentajeNormalizado, subtotalPrecotizacion]
  );

  const totalPrecotizacion = Math.max(0, subtotalPrecotizacion - descuentoMonto);
  const puedeEditarPrecotizacion = personalizarRecomendacion || agregarProductos;

  const manejarCalculoPropuesta = () => {
    setError('');

    if (!resultadosInteligentes) {
      setError('Completa la calculadora solar para armar la propuesta automática.');
      return;
    }

    const cantidadInicial = normalizarCantidadPaneles(resultadosInteligentes.cantidadPaneles);
    const { seleccion: nuevaSeleccion, detallePorClave } = crearSeleccionDesdeResultados(
      resultadosInteligentes,
      cantidadInicial,
      productos
    );
    const resultadosBase = construirResultadosConDimensionamiento(resultadosInteligentes, cantidadInicial);
    const calculoInicial = calcularSistemaCorigy({
      cantidadPaneles: cantidadInicial,
      tipoMontaje: resultadosInteligentes.tipoMontaje,
      distanciaInversor: resultadosInteligentes.distanciaInversor,
      tipoTPO: resultadosInteligentes.tipoTPO,
      configuracionPiso: resultadosInteligentes.configuracionPiso,
    });
    setObservacionTecnicaFija(construirObservacionTecnica({
      ...resultadosBase,
      piezas: calculoInicial.materiales,
      cable: calculoInicial.cable,
      advertenciasMateriales: calculoInicial.advertencias,
      tipoTPO: resultadosInteligentes.tipoTPO || calculoInicial.orientacionTPO || 'HORIZONTAL',
      configuracionPiso: resultadosInteligentes.configuracionPiso || calculoInicial.configuracionPiso || 'MIRANDO_AL_SUR',
    }));
    setCantidadPanelesPersonalizada(cantidadInicial);
    setPersonalizarRecomendacion(false);
    setAgregarProductos(false);
    setMostrarVentanaSelectorProductos(false);
    setDetalleSeleccionProductos(detallePorClave);
    setPreciosPersonalizados({});
    setDescuentoPrecotizacion('0');
    setPromptArticulos('');
    setEstadoPromptArticulos({ tipo: '', mensaje: '' });
    setProductosSeleccionados(nuevaSeleccion);
    setCalculoRealizado(true);
    navegarEnFlujo('recomendaciones');
  };

  const actualizarCantidadProducto = (idProducto, cantidad) => {
    if (idProducto === PANEL_LINE_KEY) {
      const nuevaCantidadPaneles = normalizarCantidadPaneles(cantidad, cantidadPanelesActiva);
      const { seleccion: seleccionActualizada, detallePorClave } = crearSeleccionDesdeResultados(
        resultadosInteligentes,
        nuevaCantidadPaneles,
        productos
      );
      const idsAccesoriosCalculados = new Set(
        calcularPiezasSistema({
          cantidadPaneles: Math.max(
            cantidadPanelesActiva,
            nuevaCantidadPaneles,
            resultadosInteligentes.cantidadPaneles,
            3
          ),
          tipoMontaje: resultadosInteligentes.tipoMontaje,
          distanciaInversor: resultadosInteligentes.distanciaInversor,
          tipoTPO: resultadosInteligentes.tipoTPO,
          configuracionPiso: resultadosInteligentes.configuracionPiso,
        }).map((pieza) => `material:${pieza.id}`)
      );

      setCantidadPanelesPersonalizada(nuevaCantidadPaneles);
      setDetalleSeleccionProductos(detallePorClave);
      setProductosSeleccionados((previo) => {
        const siguiente = { ...previo };
        idsAccesoriosCalculados.forEach((id) => {
          delete siguiente[id];
        });

        return {
          ...siguiente,
          ...seleccionActualizada,
        };
      });
      return;
    }

    if (cantidad <= 0) {
      setDetalleSeleccionProductos((detallePrevio) => {
        const siguienteDetalle = { ...detallePrevio };
        delete siguienteDetalle[idProducto];
        return siguienteDetalle;
      });
      setPreciosPersonalizados((preciosPrevios) => {
        const siguientePrecios = { ...preciosPrevios };
        delete siguientePrecios[idProducto];
        return siguientePrecios;
      });
    }

    setProductosSeleccionados((previo) => {
      if (cantidad <= 0) {
        const siguiente = { ...previo };
        delete siguiente[idProducto];
        return siguiente;
      }

      return {
        ...previo,
        [idProducto]: cantidad,
      };
    });
  };

  const actualizarPrecioProducto = (idProducto, precio) => {
    const textoPrecio = String(precio ?? '').replace(',', '.');

    if (textoPrecio === '') {
      setPreciosPersonalizados((previo) => ({
        ...previo,
        [idProducto]: '',
      }));
      return;
    }

    if (!/^\d*\.?\d*$/.test(textoPrecio)) return;

    const precioNormalizado = textoPrecio.replace(/^0+(?=\d)/, '');
    setPreciosPersonalizados((previo) => ({
      ...previo,
      [idProducto]: precioNormalizado,
    }));
  };

  const alternarProducto = (idProducto) => {
    if (idProducto === PANEL_LINE_KEY) return;
    if (!personalizarRecomendacion && !agregarProductos) return;

    const existe = productosSeleccionados[idProducto] !== undefined;
    if (existe) {
      setDetalleSeleccionProductos((detallePrevio) => {
        const siguienteDetalle = { ...detallePrevio };
        delete siguienteDetalle[idProducto];
        return siguienteDetalle;
      });
      setPreciosPersonalizados((preciosPrevios) => {
        const siguientePrecios = { ...preciosPrevios };
        delete siguientePrecios[idProducto];
        return siguientePrecios;
      });
    }

    setProductosSeleccionados((previo) => {
      const siguiente = { ...previo };
      if (siguiente[idProducto] !== undefined) {
        delete siguiente[idProducto];
      } else {
        siguiente[idProducto] = 1;
      }
      return siguiente;
    });
  };

  const volverAInicio = () => {
    navegarEnFlujo('calculadora');
    setResultadosInteligentes(null);
    setProductosSeleccionados({});
    setDetalleSeleccionProductos({});
    setCotizacionPdf(null);
    setPdfFusionado(false);
    setPersonalizarRecomendacion(false);
    setAgregarProductos(false);
    setMostrarVentanaSelectorProductos(false);
    setCantidadPanelesPersonalizada(null);
    setDatosCalculadora(null);
    setObservacionTecnicaFija('');
    setPreciosPersonalizados({});
    setDescuentoPrecotizacion('0');
    setPromptArticulos('');
    setEstadoPromptArticulos({ tipo: '', mensaje: '' });
    setVendedor('');
    setComentariosCliente('');
    setResultadoCreacion(null);
    setMensajeFusion('');
    setCargandoCreacion(false);
    setCargandoFusion(false);
  };

  const alternarPersonalizacion = (evento) => {
    const activo = evento.target.checked;
    setPersonalizarRecomendacion(activo);

    if (!activo && resultadosInteligentes) {
      const cantidadRecomendada = normalizarCantidadPaneles(resultadosInteligentes.cantidadPaneles);
      setCantidadPanelesPersonalizada(cantidadRecomendada);
      setPreciosPersonalizados({});
      const { seleccion, detallePorClave } = crearSeleccionDesdeResultados(
        resultadosInteligentes,
        cantidadRecomendada,
        productos
      );
      setDetalleSeleccionProductos(detallePorClave);
      setProductosSeleccionados(seleccion);
    }
  };

  const alternarAgregarProductos = (evento) => {
    const activo = evento.target.checked;
    setAgregarProductos(activo);

    if (!activo) {
      setMostrarVentanaSelectorProductos(false);
    }
  };

  const abrirSelectorCompletoProductos = () => {
    if (!agregarProductos) {
      setAgregarProductos(true);
    }
    setMostrarVentanaSelectorProductos(true);
  };

  const cerrarSelectorCompletoProductos = () => {
    setMostrarVentanaSelectorProductos(false);
  };

  const construirEstadoConProductosAgregados = (detalleBase, seleccionBase, items = []) => {
    const siguienteDetalle = { ...detalleBase };
    const siguienteSeleccion = { ...seleccionBase };

    items.forEach(({ producto, cantidad }) => {
      if (!producto?.id) return;

      const cantidadNormalizada = Math.max(1, Number.parseInt(cantidad, 10) || 1);
      const detalleExistente = Object.entries(siguienteDetalle)
        .find(([, detalle]) => detalle?.productId === producto.id);

      if (detalleExistente) {
        const [claveExistente] = detalleExistente;
        siguienteSeleccion[claveExistente] = (siguienteSeleccion[claveExistente] || 0) + cantidadNormalizada;
        return;
      }

      const nuevaClave = construirClaveExtraProducto(producto.id);
      siguienteDetalle[nuevaClave] = {
        tipo: 'extra',
        categoria: 'Producto añadido',
        nombre: producto.name,
        productId: producto.id,
        piezaId: null,
        origen: 'Catálogo API',
      };
      siguienteSeleccion[nuevaClave] = cantidadNormalizada;
    });

    return { siguienteDetalle, siguienteSeleccion };
  };

  const agregarProductoAPrecotizacion = (producto, cantidadSolicitada = 1) => {
    if (!producto?.id) return;
    const { siguienteDetalle, siguienteSeleccion } = construirEstadoConProductosAgregados(
      detalleSeleccionProductosRef.current,
      productosSeleccionadosRef.current,
      [{ producto, cantidad: cantidadSolicitada }]
    );

    setDetalleSeleccionProductos(siguienteDetalle);
    setProductosSeleccionados(siguienteSeleccion);
  };

  const agregarProductosDesdePrompt = (items = []) => {
    if (items.length === 0) return;

    const { siguienteDetalle, siguienteSeleccion } = construirEstadoConProductosAgregados(
      detalleSeleccionProductosRef.current,
      productosSeleccionadosRef.current,
      items
    );

    setDetalleSeleccionProductos(siguienteDetalle);
    setProductosSeleccionados(siguienteSeleccion);
  };

  const alternarProductoDesdeVentana = (idProducto) => {
    if (!puedeEditarPrecotizacion) return;

    const claveExistente = clavePorProductoId.get(idProducto);
    if (claveExistente) {
      alternarProducto(claveExistente);
      return;
    }

    const producto = productosPorId.get(idProducto);
    if (!producto) return;
    agregarProductoAPrecotizacion(producto, 1);
  };

  const actualizarCantidadDesdeVentana = (idProducto, cantidad) => {
    if (!puedeEditarPrecotizacion) return;

    const cantidadNormalizada = Number.parseInt(cantidad, 10) || 0;
    const claveExistente = clavePorProductoId.get(idProducto);

    if (claveExistente) {
      actualizarCantidadProducto(claveExistente, cantidadNormalizada);
      return;
    }

    if (cantidadNormalizada <= 0) return;

    const producto = productosPorId.get(idProducto);
    if (!producto) return;
    agregarProductoAPrecotizacion(producto, cantidadNormalizada);
  };

  const manejarAplicarPromptArticulos = async () => {
    const texto = String(promptArticulos || '').trim();

    if (!texto) {
      setEstadoPromptArticulos({
        tipo: 'warning',
        mensaje: 'Escribe al menos un producto para buscarlo en inventario.',
      });
      return;
    }

    if (cargandoCatalogo) {
      setEstadoPromptArticulos({
        tipo: 'info',
        mensaje: 'Espera a que cargue el inventario para ejecutar la búsqueda avanzada.',
      });
      return;
    }

    if (!Array.isArray(productos) || productos.length === 0) {
      setEstadoPromptArticulos({
        tipo: 'error',
        mensaje: 'No hay inventario disponible para buscar productos en este momento.',
      });
      return;
    }

    const solicitudes = desglosarPromptProductos(texto);
    if (solicitudes.length === 0) {
      setEstadoPromptArticulos({
        tipo: 'warning',
        mensaje: 'Usa una línea por artículo o separa cada producto con punto y coma.',
      });
      return;
    }

    setProcesandoPromptArticulos(true);

    try {
      await esperar(320);

      if (!agregarProductos) {
        setAgregarProductos(true);
      }

      const encontrados = [];
      const noEncontrados = [];

      solicitudes.forEach((solicitud) => {
        const resolucion = resolverProductoDesdePrompt(productosIndexados, solicitud);
        if (!resolucion.producto) {
          noEncontrados.push(solicitud.descripcion);
          return;
        }

        encontrados.push({
          producto: resolucion.producto,
          cantidad: solicitud.cantidad,
          descripcion: solicitud.descripcion,
        });
      });

      if (encontrados.length > 0) {
        agregarProductosDesdePrompt(encontrados);
      }

      if (encontrados.length === 0) {
        setEstadoPromptArticulos({
          tipo: 'warning',
          mensaje: `No encontré coincidencias suficientemente confiables para: ${noEncontrados.join(', ')}.`,
        });
        return;
      }

      const resumenEncontrados = encontrados
        .slice(0, 3)
        .map((item) => `${item.cantidad} x ${item.producto.name}`)
        .join(', ');
      const sufijoExtra = encontrados.length > 3 ? ` y ${encontrados.length - 3} más` : '';
      const detalleNoEncontrados = noEncontrados.length > 0
        ? ` No encontré: ${noEncontrados.join(', ')}.`
        : '';

      setEstadoPromptArticulos({
        tipo: noEncontrados.length > 0 ? 'warning' : 'success',
        mensaje: `Añadí ${encontrados.length} artículo(s): ${resumenEncontrados}${sufijoExtra}.${detalleNoEncontrados}`,
      });
    } finally {
      setProcesandoPromptArticulos(false);
    }
  };

  const manejarCambioTipoEstructura = (evento) => {
    const nuevoTipoMontaje = evento.target.value;
    if (!resultadosInteligentes || !nuevoTipoMontaje || nuevoTipoMontaje === resultadosInteligentes.tipoMontaje) return;

    const resultadosActualizados = {
      ...resultadosInteligentes,
      tipoMontaje: nuevoTipoMontaje,
      tipoTPO: nuevoTipoMontaje === 'TPO'
        ? (resultadosInteligentes.tipoTPO || 'HORIZONTAL')
        : resultadosInteligentes.tipoTPO,
      configuracionPiso: nuevoTipoMontaje === 'Piso'
        ? (resultadosInteligentes.configuracionPiso || 'MIRANDO_AL_SUR')
        : resultadosInteligentes.configuracionPiso,
    };
    const cantidadActual = normalizarCantidadPaneles(cantidadPanelesActiva, resultadosInteligentes.cantidadPaneles);
    const { seleccion: seleccionActualizada, detallePorClave } = crearSeleccionDesdeResultados(
      resultadosActualizados,
      cantidadActual,
      productos
    );

    setResultadosInteligentes(resultadosActualizados);
    setDatosCalculadora((previo) => (previo
      ? {
        ...previo,
        tipoMontaje: nuevoTipoMontaje,
        tipoTPO: nuevoTipoMontaje === 'TPO' ? (previo.tipoTPO || 'HORIZONTAL') : previo.tipoTPO,
        configuracionPiso: nuevoTipoMontaje === 'Piso' ? (previo.configuracionPiso || 'MIRANDO_AL_SUR') : previo.configuracionPiso,
      }
      : previo));

    if (!personalizarRecomendacion) {
      setDetalleSeleccionProductos(detallePorClave);
      setProductosSeleccionados(seleccionActualizada);
      return;
    }

    const cantidadReferencia = Math.max(cantidadActual, resultadosInteligentes.cantidadPaneles, 3);
    const idsAccesoriosCalculados = new Set([
      ...calcularPiezasSistema({
        cantidadPaneles: cantidadReferencia,
        tipoMontaje: resultadosInteligentes.tipoMontaje,
        distanciaInversor: resultadosInteligentes.distanciaInversor,
        tipoTPO: resultadosInteligentes.tipoTPO,
        configuracionPiso: resultadosInteligentes.configuracionPiso,
      }),
      ...calcularPiezasSistema({
        cantidadPaneles: cantidadReferencia,
        tipoMontaje: nuevoTipoMontaje,
        distanciaInversor: resultadosInteligentes.distanciaInversor,
        tipoTPO: resultadosInteligentes.tipoTPO,
        configuracionPiso: resultadosInteligentes.configuracionPiso,
      }),
    ].map((pieza) => `material:${pieza.id}`));

    setDetalleSeleccionProductos(detallePorClave);
    setProductosSeleccionados((previo) => {
      const siguiente = { ...previo };
      idsAccesoriosCalculados.forEach((id) => {
        delete siguiente[id];
      });

      return {
        ...siguiente,
        ...seleccionActualizada,
      };
    });
  };

  const manejarCrearCotizacion = async () => {
    if (lineasPrecotizacion.length === 0) {
      setError('Debe haber al menos un producto para crear la cotización.');
      return;
    }

    const clienteSeleccionado = clientesPorId.get(clienteSeleccionadoIdEfectivo);
    if (!clienteSeleccionado?.id) {
      setError('Selecciona un cliente válido para crear la cotización.');
      return;
    }

    if (!String(vendedor || '').trim()) {
      setError('Selecciona un vendedor para crear la cotización.');
      return;
    }

    setError('');
    setMensajeFusion('');
    setPuedeVerCotizacionSolo(false);
    setCargandoCreacion(true);

    try {
      const respuesta = await crearCotizacionEnInterfuerza({
        lineasPrecotizacion,
        detalleSeleccionProductos,
        vendedor,
        comentariosCliente,
        subtotalPrecotizacion,
        descuentoPorcentajeNormalizado,
        totalPrecotizacion,
        clienteId: clienteSeleccionado.id,
        clienteNombre: clienteSeleccionado.name,
        pais: clienteSeleccionado.country || 'PANAMA',
        bodega: clienteSeleccionado.raw?.Bodega || 'Bodega Principal',
        observacionTecnicaFija: observacionTecnicaVisible,
        requiereObservacionTecnica: mostrarBloquesIA,
        tipoMontaje: resultadosVisibles?.tipoMontaje,
      });

      setResultadoCreacion({
        exito: true,
        idCotizacion: respuesta.id,
        mensaje: 'La cotización ha sido creada',
      });

      navegarEnFlujo('confirmacion');
    } catch (errorCreacion) {
      setError(errorCreacion?.message || 'No se pudo crear la cotización.');
    } finally {
      setCargandoCreacion(false);
    }
  };

  const obtenerCotizacionCreadaDesdeApi = async (idCotizacion) => {
    let cotizacionApi = null;

    for (let intento = 1; intento <= 4; intento += 1) {
      try {
        cotizacionApi = await obtenerCotizacionPorId(idCotizacion);
        break;
      } catch {
        if (intento < 4) {
          await esperar(1500 * intento);
        }
      }
    }

    if (!cotizacionApi) {
      throw new Error(
        `No se pudo leer la cotización ${idCotizacion} desde InterFuerza. ` +
        'Verifica que el cliente sea válido y que el token tenga permisos de lectura.'
      );
    }

    if (!Array.isArray(cotizacionApi.lines) || cotizacionApi.lines.length === 0) {
      throw new Error(
        `La cotización ${idCotizacion} no devolvió líneas de productos en InterFuerza.`
      );
    }

    return cotizacionApi;
  };

  const descargarCotizacionSolo = async (cotizacionApi, idCotizacion) => {
    const pdfCotizacionBytes = await generarPdfCotizacionDesdeApi(cotizacionApi);
    descargarBytes(pdfCotizacionBytes, `cotizacion_${idCotizacion}.pdf`);
    setMensajeFusion('Cotización descargada sin ficha técnica.');
  };

  const manejarVerCotizacionConFicha = async () => {
    const idCotizacion = String(resultadoCreacion?.idCotizacion || '').trim();
    if (!idCotizacion) {
      setError('No hay una cotización creada para consultar en la API.');
      return;
    }

    setError('');
    setMensajeFusion('');
    setPuedeVerCotizacionSolo(false);
    setCargandoFusion(true);

    try {
      const cotizacionApi = await obtenerCotizacionCreadaDesdeApi(idCotizacion);
      const lineasEnriquecidas = enriquecerLineasCotizacionConProductos(cotizacionApi.lines, productos);
      const referencias = extraerReferenciasFichasDesdeLineasCotizacion(lineasEnriquecidas);
      const disponibilidad = await verificarFichasDisponibles(referencias.datasheetNames);

      if ((disponibilidad?.foundSlugs || []).length === 0) {
        setPuedeVerCotizacionSolo(true);
        setError(
          referencias.datasheetNames.length > 0
            ? 'Se detectaron productos, pero no se encontró ninguna ficha técnica disponible. Puedes ver solo la cotización.'
            : 'No se detectaron referencias de ficha técnica en esta cotización. Puedes ver solo la cotización.'
        );
        return;
      }

      const pdfCotizacionBytes = await generarPdfCotizacionDesdeApi(cotizacionApi);
      const archivoPdf = new File(
        [new Blob([pdfCotizacionBytes], { type: 'application/pdf' })],
        `cotizacion_${idCotizacion}.pdf`,
        { type: 'application/pdf' }
      );
      const resultadoMerge = await generarPdfFusionadoConFichas(archivoPdf, {
        referenciasFichasExtra: referencias.datasheetNames || [],
        referenciasFichasResueltas: disponibilidad.foundSlugs || [],
        bytesPdfCotizacion: pdfCotizacionBytes,
      });

      if (!resultadoMerge?.success || !resultadoMerge?.mergedPdf) {
        throw new Error(resultadoMerge?.error || 'No se pudo completar el merge de fichas técnicas.');
      }

      descargarBytes(
        resultadoMerge.mergedPdf,
        `cotizacion_${idCotizacion}_con_ficha_tecnica.pdf`
      );
      setMensajeFusion('Cotización con ficha técnica descargada.');
    } catch (errorFusion) {
      setError(errorFusion?.message || 'No se pudo completar el merge de ficha técnica.');
    } finally {
      setCargandoFusion(false);
    }
  };

  const manejarVerCotizacionSolo = async () => {
    const idCotizacion = String(resultadoCreacion?.idCotizacion || '').trim();
    if (!idCotizacion) {
      setError('No hay una cotización creada para consultar en la API.');
      return;
    }

    setError('');
    setMensajeFusion('');
    setCargandoCotizacionSolo(true);

    try {
      const cotizacionApi = await obtenerCotizacionCreadaDesdeApi(idCotizacion);
      await descargarCotizacionSolo(cotizacionApi, idCotizacion);
    } catch (errorDescarga) {
      setError(errorDescarga?.message || 'No se pudo descargar la cotización.');
    } finally {
      setCargandoCotizacionSolo(false);
    }
  };

  if (menuActual === 'calculadora') {
    return (
      <>
        <BarraNavegacion />
        {mostrarAlertaVisual && (
          <div className="superposicion-alerta-propuesta" role="presentation" onClick={() => setError('')}>
            <div
              className="alerta-propuesta-modal"
              role="alertdialog"
              aria-modal="true"
              aria-live="assertive"
              onClick={(evento) => evento.stopPropagation()}
            >
              <div className="alerta-propuesta-modal__icono">⚠️</div>
              <div className="alerta-propuesta-modal__contenido">
                <h4>Calculadora incompleta</h4>
                <p>{error}</p>
              </div>
              <button type="button" className="alerta-propuesta-modal__boton" onClick={() => setError('')}>
                Entendido
              </button>
            </div>
          </div>
        )}
        <div className="pagina-propuesta">
          <div className="pagina-propuesta__cuadricula">
            <div className="pagina-propuesta__columna">
              <CalculadoraInteligente
                productos={productos}
                alCambiarResultados={setResultadosInteligentes}
                datosIniciales={datosCalculadora}
                alCambiarDatos={setDatosCalculadora}
              />
              <Boton variant="primary" icon="📐" onClick={manejarCalculoPropuesta} fullWidth>
                Calcular Propuesta
              </Boton>
            </div>

            <div className="pagina-propuesta__columna">
              <SelectorProductos
                productos={productos}
                categorias={categorias}
                seleccionados={{}}
                alAlternarProducto={() => {}}
                alActualizarCantidad={() => {}}
                cargando={cargandoCatalogo}
                error={errorCatalogo}
                soloLectura
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (menuActual === 'recomendaciones') {
    return (
      <>
        <BarraNavegacion />
        {mostrarAlertaVisual && (
          <div className="superposicion-alerta-propuesta" role="presentation" onClick={() => setError('')}>
            <div
              className="alerta-propuesta-modal"
              role="alertdialog"
              aria-modal="true"
              aria-live="assertive"
              onClick={(evento) => evento.stopPropagation()}
            >
              <div className="alerta-propuesta-modal__icono">⚠️</div>
              <div className="alerta-propuesta-modal__contenido">
                <h4>{tituloAlertaCotizacion}</h4>
                <p>{error}</p>
              </div>
              <button type="button" className="alerta-propuesta-modal__boton" onClick={() => setError('')}>
                Entendido
              </button>
            </div>
          </div>
        )}
        <div className="pagina-propuesta">
          <div className="pagina-propuesta__recomendaciones">
            {mostrarBloquesIA && (
              <>
                <div className="tarjeta-propuesta animate-fade-in-up">
                  <h3 className="tarjeta-propuesta__titulo">
                    <span className="tarjeta-propuesta__icono">🤖</span>
                    Recomendación IA
                  </h3>

                  <div className="contenido-recomendaciones">
                    <div className="elemento-recomendacion">
                      <span className="etiqueta-recomendacion">Perfil Recomendado:</span>
                      <span className="valor-recomendacion">{resultadosVisibles.etiquetaRecomendacion}</span>
                    </div>
                    <div className="elemento-recomendacion">
                      <span className="etiqueta-recomendacion">Panel Seleccionado:</span>
                      <span className="valor-recomendacion">{resultadosVisibles.nombrePanel}</span>
                    </div>
                    <div className="elemento-recomendacion">
                      <span className="etiqueta-recomendacion">Cantidad de Paneles:</span>
                      <span className="valor-recomendacion">{resultadosVisibles.cantidadPaneles}</span>
                    </div>
                    <div className="elemento-recomendacion">
                      <span className="etiqueta-recomendacion">Potencia Total:</span>
                      <span className="valor-recomendacion">{resultadosVisibles.potenciaTotalWp} Wp</span>
                    </div>
                    {resultadosVisibles.opcionInversor && (
                      <div className="elemento-recomendacion">
                        <span className="etiqueta-recomendacion">Modo de Inversor:</span>
                        <span className="valor-recomendacion">{resultadosVisibles.opcionInversor}</span>
                      </div>
                    )}
                    {resultadosVisibles.conexionElectrica && (
                      <div className="elemento-recomendacion">
                        <span className="etiqueta-recomendacion">Conexión Eléctrica:</span>
                        <span className="valor-recomendacion">
                          {resultadosVisibles.conexionElectrica === 'Trifasico'
                            ? `Trifásico ${resultadosVisibles.tensionConexionTrifasica || '208-220'}V`
                            : 'Monofásico'}
                        </span>
                      </div>
                    )}
                    {construirResumenRollosCable(resultadosVisibles?.cable) && (
                      <div className="elemento-recomendacion">
                        <span className="etiqueta-recomendacion">Cable estimado:</span>
                        <span className="valor-recomendacion">{construirResumenRollosCable(resultadosVisibles.cable)}</span>
                      </div>
                    )}
                    {Array.isArray(resultadosVisibles.piezas) && resultadosVisibles.piezas.length > 0 && (
                      <div className="elemento-recomendacion">
                        <span className="etiqueta-recomendacion">Materiales calculados:</span>
                        <span className="valor-recomendacion">{resultadosVisibles.piezas.length} ítems técnicos</span>
                      </div>
                    )}
                  </div>
                </div>

                {observacionTecnicaVisible && (
                  <div className="tarjeta-propuesta animate-fade-in-up">
                    <h3 className="tarjeta-propuesta__titulo">
                      <span className="tarjeta-propuesta__icono">📝</span>
                      Observación técnica
                    </h3>
                    <div className="descripcion-recomendacion">
                      <p>{observacionTecnicaVisible}</p>
                    </div>
                  </div>
                )}

                <div className="tarjeta-propuesta animate-fade-in-up">
                  <h3 className="tarjeta-propuesta__titulo">
                    <span className="tarjeta-propuesta__icono">🏗️</span>
                    Tipo de estructura
                  </h3>
                  <div className="tarjeta-estructura-recomendacion">
                    <div className="control-estructura-recomendacion">
                      <label htmlFor="tipo-estructura-recomendacion">Selecciona la estructura</label>
                      <select
                        id="tipo-estructura-recomendacion"
                        value={resultadosVisibles.tipoMontaje || ''}
                        onChange={manejarCambioTipoEstructura}
                      >
                        {OPCIONES_TIPO_ESTRUCTURA.map((opcion) => (
                          <option key={opcion.value} value={opcion.value}>
                            {opcion.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

              </>
            )}

            <div className="tarjeta-propuesta animate-fade-in-up">
              <div className="encabezado-tarjeta-recomendacion">
                <h3 className="tarjeta-propuesta__titulo">
                  <span className="tarjeta-propuesta__icono">📋</span>
                  Pre-cotización IA
                </h3>

                <div className="interruptores-encabezado-precotizacion">
                  <label className="interruptor-personalizacion">
                    <input
                      type="checkbox"
                      checked={agregarProductos}
                      onChange={alternarAgregarProductos}
                    />
                    <span className="interruptor-personalizacion__switch" />
                    <span>¿Deseas añadir?</span>
                  </label>

                  {mostrarBloquesIA && (
                    <label className="interruptor-personalizacion">
                      <input
                        type="checkbox"
                        checked={personalizarRecomendacion}
                        onChange={alternarPersonalizacion}
                      />
                      <span className="interruptor-personalizacion__switch" />
                      <span>¿Deseas personalizar?</span>
                    </label>
                  )}
                </div>
              </div>

              <div className="atajo-precotizacion">
                <Boton
                  variant="primary"
                  icon="🪟"
                  fullWidth
                  className="atajo-precotizacion__boton"
                  onClick={abrirSelectorCompletoProductos}
                >
                  Abrir selector completo de productos
                </Boton>
                <p className="atajo-precotizacion__ayuda">
                  Acceso directo con búsqueda real por categoría, código, descripción y ubicación.
                </p>
              </div>

              <div className={`atajo-precotizacion atajo-precotizacion--prompt ${procesandoPromptArticulos ? 'atajo-precotizacion--cargando' : ''}`}>
                <label className="bloque-consumo-mensual__titulo" htmlFor="prompt-articulos-inventario">
                  Buscar artículos por prompt
                </label>
                {procesandoPromptArticulos && (
                  <div className="atajo-precotizacion__carga" role="status" aria-live="polite">
                    <span className="atajo-precotizacion__carga-icono">⏳</span>
                    <strong>Buscando productos...</strong>
                    <p>Comparando marca, modelo, watts, voltaje y referencias del inventario.</p>
                  </div>
                )}
                <textarea
                  id="prompt-articulos-inventario"
                  className="form-input area-texto-prompt"
                  placeholder={'Ej:\n4 x panel canadian 585w\n1 inversor deye sun-5k 48v\n2 baterias dyness 5.12kwh'}
                  value={promptArticulos}
                  disabled={procesandoPromptArticulos}
                  onChange={(evento) => {
                    setPromptArticulos(evento.target.value);
                    if (estadoPromptArticulos.mensaje) {
                      setEstadoPromptArticulos({ tipo: '', mensaje: '' });
                    }
                  }}
                  rows={4}
                />
                <div className="pegar-consumo-mensual__acciones">
                  <button
                    type="button"
                    className="pegar-consumo-mensual__aplicar"
                    onClick={manejarAplicarPromptArticulos}
                    disabled={procesandoPromptArticulos || cargandoCatalogo}
                  >
                    {procesandoPromptArticulos ? 'Buscando...' : 'Buscar y añadir'}
                  </button>
                </div>
                <p className="atajo-precotizacion__ayuda">
                  Escribe un artículo por línea. La búsqueda prioriza marca, modelo, watts, voltaje y referencias del producto dentro de tu inventario.
                </p>
                {estadoPromptArticulos.mensaje && (
                  <div
                    className={`estado-prompt estado-prompt--${estadoPromptArticulos.tipo || 'info'}`}
                    role="status"
                  >
                    {estadoPromptArticulos.mensaje}
                  </div>
                )}
              </div>

              <div className="lista-productos-editable">
                {lineasPrecotizacion.map((linea) => {
                  const {
                    id,
                    nombre,
                    categoria,
                    origen,
                    cantidad,
                    precioUnitario,
                    precioInventario,
                    total,
                    esPanelPrincipal,
                    stockDisponible,
                    enCatalogo
                  } = linea;

                  return (
                    <div key={id} className="item-producto-editable">
                      <div className="info-producto">
                        <span className="nombre-producto">{nombre}</span>
                        <span className="meta-producto">
                          {categoria} · {origen}
                          {enCatalogo
                            ? ` · Stock: ${formatearNumeroTecnico(stockDisponible, 0)} · Precio sugerido: ${formatearMoneda(precioInventario)}`
                            : ' · Sin precio de catálogo'}
                        </span>
                      </div>
                      <div className="acciones-producto">
                        <label className="campo-producto">
                          <span>Precio</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={preciosPersonalizados[id] ?? precioUnitario}
                            onChange={(evento) => actualizarPrecioProducto(id, evento.target.value)}
                            onFocus={(evento) => evento.target.select()}
                            className="entrada-cantidad entrada-cantidad--producto"
                          />
                        </label>
                        <label className="campo-producto">
                          <span>Cantidad</span>
                          <input
                            type="number"
                            min="1"
                            value={cantidad}
                            disabled={!puedeEditarPrecotizacion}
                            onChange={(evento) =>
                              actualizarCantidadProducto(id, Number.parseInt(evento.target.value, 10) || 1)
                            }
                            className="entrada-cantidad entrada-cantidad--producto"
                          />
                        </label>
                        <div className="total-linea-producto">
                          <span>Total</span>
                          <strong>{formatearMoneda(total)}</strong>
                        </div>
                        <Boton
                          variant="ghost"
                          icon="🗑️"
                          onClick={() => alternarProducto(id)}
                          size="sm"
                          disabled={!puedeEditarPrecotizacion || esPanelPrincipal}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {lineasPrecotizacion.length === 0 && (
                <p className="lista-vacia">No hay artículos seleccionados</p>
              )}

              <div className="resumen-precotizacion">
                <div className="campos-cotizacion-api">
                  <label className="control-descuento-precotizacion">
                    <span>Cliente</span>
                    <select
                      value={clienteSeleccionadoIdEfectivo}
                      onChange={(evento) => setClienteSeleccionadoId(evento.target.value)}
                      className="entrada-cantidad"
                    >
                      <option value="">Selecciona un cliente</option>
                      {(clientes || []).map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.id} - {cliente.name}
                        </option>
                      ))}
                    </select>
                  </label>

                   <label className="control-descuento-precotizacion">
                     <span>Vendedor</span>
                     <select
                       value={vendedor}
                       onChange={(evento) => setVendedor(evento.target.value)}
                       className="entrada-cantidad"
                     >
                       <option value="">Selecciona un vendedor</option>
                       <option value="Robert Guerra">Robert Guerra</option>
                       <option value="Aquiles Pena">Aquiles Pena</option>
                       <option value="Alfonso Trujillo">Alfonso Trujillo</option>
                       <option value="Otro">Otro</option>
                     </select>
                   </label>

                  <label className="control-descuento-precotizacion control-descuento-precotizacion--amplio">
                    <span>Comentarios para cliente</span>
                    <textarea
                      value={comentariosCliente}
                      onChange={(evento) => setComentariosCliente(evento.target.value)}
                      className="entrada-cantidad"
                      rows={3}
                      placeholder="Mensaje visible para el cliente"
                    />
                  </label>
                </div>

                <label className="control-descuento-precotizacion">
                  <span>Descuento aplicado (%)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={descuentoPrecotizacion}
                    onChange={(evento) => setDescuentoPrecotizacion(evento.target.value)}
                    className="entrada-cantidad"
                  />
                </label>

                <div className="resumen-precios__filas">
                  <div className="resumen-precios__fila">
                    <span>Subtotal</span>
                    <span className="resumen-precios__monto">{formatearMoneda(subtotalPrecotizacion)}</span>
                  </div>
                  <div className="resumen-precios__fila">
                    <span>Descuento ({descuentoPorcentajeNormalizado.toFixed(2)}%)</span>
                    <span className="resumen-precios__monto resumen-precios__monto--descuento">
                      -{formatearMoneda(descuentoMonto)}
                    </span>
                  </div>
                  <div className="resumen-precios__fila resumen-precios__fila--total">
                    <span>Total pre-cotización</span>
                    <span className="resumen-precios__total">{formatearMoneda(totalPrecotizacion)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {mostrarVentanaSelectorProductos && (
            <div
              className="superposicion-ventana-productos"
              role="presentation"
            >
              <div
                className="ventana-productos"
                role="dialog"
                aria-modal="true"
                aria-label="Selector completo de productos"
                onClick={(evento) => evento.stopPropagation()}
              >
                <div className="ventana-productos__encabezado">
                  <h3 className="ventana-productos__titulo">Selector completo de productos</h3>
                  <button
                    ref={botonCerrarSelectorRef}
                    type="button"
                    className="ventana-productos__cerrar"
                    onClick={cerrarSelectorCompletoProductos}
                  >
                    Cerrar
                  </button>
                </div>
                <p className="ventana-productos__subtitulo">
                  Aquí puedes buscar y seleccionar productos del catálogo completo.
                </p>
                <div className="ventana-productos__contenido">
                  <SelectorProductos
                    productos={productos}
                    categorias={categorias}
                    seleccionados={seleccionadosPorProductoId}
                    alAlternarProducto={alternarProductoDesdeVentana}
                    alActualizarCantidad={actualizarCantidadDesdeVentana}
                    cargando={cargandoCatalogo}
                    error={errorCatalogo}
                    autoFocusBusqueda
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pagina-propuesta__acciones">
            <Boton variant="secondary" icon="◀️" onClick={() => navegarEnFlujo('calculadora')} fullWidth>
              Volver
            </Boton>

            <Boton
              variant="success"
              icon={cargandoCreacion ? '⏳' : '✅'}
              onClick={manejarCrearCotizacion}
              fullWidth
              disabled={cargandoCreacion}
            >
              {cargandoCreacion ? 'Creando cotización...' : 'Crear cotización'}
            </Boton>
          </div>
        </div>
      </>
    );
  }

  if (menuActual === 'confirmacion') {
    return (
      <>
        <BarraNavegacion />
        <div className="pagina-propuesta">
          <PantallaConfirmacion
            resultadoCreacion={resultadoCreacion}
            cargandoFusion={cargandoFusion}
            cargandoCotizacionSolo={cargandoCotizacionSolo}
            puedeVerCotizacionSolo={puedeVerCotizacionSolo}
            alVolver={() => {
              setError('');
              setMensajeFusion('');
              setPuedeVerCotizacionSolo(false);
              navegarEnFlujo('recomendaciones');
            }}
            alVerCotizacionConFicha={manejarVerCotizacionConFicha}
            alVerCotizacionSolo={manejarVerCotizacionSolo}
            error={error}
            mensajeFusion={mensajeFusion}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <BarraNavegacion />
      {mostrarAlertaVisual && (
        <div className="superposicion-alerta-propuesta" role="presentation" onClick={() => setError('')}>
          <div
            className="alerta-propuesta-modal"
            role="alertdialog"
            aria-modal="true"
            aria-live="assertive"
            onClick={(evento) => evento.stopPropagation()}
          >
            <div className="alerta-propuesta-modal__icono">⚠️</div>
            <div className="alerta-propuesta-modal__contenido">
              <h4>{tituloAlertaCotizacion}</h4>
              <p>{error}</p>
            </div>
            <button type="button" className="alerta-propuesta-modal__boton" onClick={() => setError('')}>
              Entendido
            </button>
          </div>
        </div>
      )}
      <div className="pagina-propuesta">
        <div className="pagina-propuesta__fusion">
          <CargadorPdfCotizacion valor={cotizacionPdf} alCambiar={setCotizacionPdf} productos={productos} />
        </div>

        <div className="pagina-propuesta__acciones">
          <Boton
            variant="secondary"
            icon="◀️"
            onClick={() => {
              navegarEnFlujo('recomendaciones');
            }}
            fullWidth
            disabled={pdfFusionado}
          >
            Volver al menú anterior
          </Boton>

          <GeneradorPdfFusionado
            cotizacionPdf={cotizacionPdf}
            numeroCotizacion={cotizacionPdf?.quoteApiData?.quoteId || numeroCotizacion}
            referenciasFichasExtra={cotizacionPdf?.apiDatasheetReferences || []}
            disabled={!cotizacionPdf || pdfFusionado}
            alCompletarFusion={() => setPdfFusionado(true)}
          />

          {pdfFusionado && (
            <Boton variant="success" icon="🏠" onClick={volverAInicio} fullWidth>
              Volver al inicio
            </Boton>
          )}
        </div>
      </div>
    </>
  );
}
