const METROS_POR_ROLLO_CABLE_200 = 200;
const METROS_POR_ROLLO_CABLE_500 = 500;

function toNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPositiveInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function floorSafe(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.floor(value);
}

function ceilSafe(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.ceil(value);
}

function roundMaterial(value) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  return Math.ceil(value);
}

function seleccionarRollosCable(metrosRequeridos) {
  const metros = Math.max(0, toNumber(metrosRequeridos, 0));
  if (metros <= 0) {
    return {
      rollosDe200m: 0,
      rollosDe500m: 0,
      totalRollos: 0,
      metrosDisponibles: 0,
      sobranteEstimado: 0,
    };
  }

  if (metros < METROS_POR_ROLLO_CABLE_200) {
    return {
      rollosDe200m: 1,
      rollosDe500m: 0,
      totalRollos: 1,
      metrosDisponibles: METROS_POR_ROLLO_CABLE_200,
      sobranteEstimado: Math.max(0, METROS_POR_ROLLO_CABLE_200 - metros),
    };
  }

  if (metros >= 400 && metros < METROS_POR_ROLLO_CABLE_500) {
    return {
      rollosDe200m: 0,
      rollosDe500m: 1,
      totalRollos: 1,
      metrosDisponibles: METROS_POR_ROLLO_CABLE_500,
      sobranteEstimado: Math.max(0, METROS_POR_ROLLO_CABLE_500 - metros),
    };
  }

  let mejor = null;
  const maxRollos500 = ceilSafe(metros / METROS_POR_ROLLO_CABLE_500) + 1;

  for (let rollosDe500m = 0; rollosDe500m <= maxRollos500; rollosDe500m += 1) {
    const metrosCubiertos500 = rollosDe500m * METROS_POR_ROLLO_CABLE_500;
    const metrosRestantes = Math.max(0, metros - metrosCubiertos500);
    const rollosDe200m = metrosRestantes > 0
      ? ceilSafe(metrosRestantes / METROS_POR_ROLLO_CABLE_200)
      : 0;
    const metrosDisponibles = metrosCubiertos500 + (rollosDe200m * METROS_POR_ROLLO_CABLE_200);
    const sobranteEstimado = Math.max(0, metrosDisponibles - metros);
    const totalRollos = rollosDe500m + rollosDe200m;
    const candidato = {
      rollosDe200m,
      rollosDe500m,
      totalRollos,
      metrosDisponibles,
      sobranteEstimado,
    };

    if (!mejor) {
      mejor = candidato;
      continue;
    }

    if (candidato.sobranteEstimado < mejor.sobranteEstimado) {
      mejor = candidato;
      continue;
    }

    if (candidato.sobranteEstimado === mejor.sobranteEstimado && candidato.totalRollos < mejor.totalRollos) {
      mejor = candidato;
      continue;
    }

    if (
      candidato.sobranteEstimado === mejor.sobranteEstimado &&
      candidato.totalRollos === mejor.totalRollos &&
      candidato.rollosDe500m > mejor.rollosDe500m
    ) {
      mejor = candidato;
    }
  }

  return mejor || {
    rollosDe200m: 0,
    rollosDe500m: 0,
    totalRollos: 0,
    metrosDisponibles: 0,
    sobranteEstimado: 0,
  };
}

function normalizeTipoTpo(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'VERTICAL') return 'VERTICAL';
  return 'HORIZONTAL';
}

function normalizeConfiguracionPiso(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'ESTE_OESTE' || normalized === 'ESTE-OESTE') return 'ESTE_OESTE';
  return 'MIRANDO_AL_SUR';
}

function normalizeTipoInstalacion(tipoMontaje = '') {
  const value = String(tipoMontaje || '').trim();
  if (value === 'Losa') return 'LOSA';
  if (value === 'S-5') return 'S5';
  if (value === 'Piso') return 'PISO';
  if (value === 'TPO') return 'TPO';
  if (value === 'Teja') return 'TEJA';
  return 'RIELES';
}

function normalizeLayoutGrupos(layoutGrupos, fallbackPaneles = 0) {
  if (!Array.isArray(layoutGrupos) || layoutGrupos.length === 0) {
    if (fallbackPaneles <= 0) return [];
    return [{ filasDireccionRiel: fallbackPaneles, columnas: 1 }];
  }

  const normalized = layoutGrupos
    .map((grupo) => ({
      filasDireccionRiel: Math.max(0, toPositiveInt(grupo?.filasDireccionRiel, 0)),
      columnas: Math.max(0, toPositiveInt(grupo?.columnas, 0)),
    }))
    .filter((grupo) => grupo.filasDireccionRiel > 0 && grupo.columnas > 0);

  if (normalized.length > 0) return normalized;

  if (fallbackPaneles <= 0) return [];
  return [{ filasDireccionRiel: fallbackPaneles, columnas: 1 }];
}

function calcularRielesPorGrupo(grupo, configuracionRieles) {
  const filas = Math.max(0, toPositiveInt(grupo?.filasDireccionRiel, 0));
  const columnas = Math.max(0, toPositiveInt(grupo?.columnas, 0));

  if (filas === 0 || columnas === 0) {
    return {
      ...grupo,
      totalPaneles: 0,
      riel5850: 0,
      riel4700: 0,
      riel3700: 0,
      riel2400: 0,
      riel1250: 0,
      splice: 0,
      endClampBase: 0,
      midClampBase: 0,
      feetL: 0,
      wd: 0,
      groundingLugBase: 0,
    };
  }

  const r5850 = configuracionRieles.riel5850Activo
    ? floorSafe(filas / 5) * 2 * columnas
    : 0;

  const panelesCubiertosPor5850 = r5850 > 0
    ? (r5850 * 5) / (2 * columnas)
    : 0;

  const restante4700 = Math.max(0, filas - panelesCubiertosPor5850);
  const r4700 = configuracionRieles.riel4700Activo
    ? floorSafe(restante4700 / 4) * 2 * columnas
    : 0;

  const panelesCubiertosPor4700 = r4700 > 0
    ? (r4700 * 4) / (2 * columnas)
    : 0;

  const restante3700 = Math.max(0, filas - panelesCubiertosPor5850 - panelesCubiertosPor4700);
  const r3700 = configuracionRieles.riel3700Activo
    ? floorSafe(restante3700 / 3) * 2 * columnas
    : 0;

  const panelesCubiertosPor3700 = r3700 > 0
    ? (r3700 * 3) / (2 * columnas)
    : 0;

  const restante2400 = Math.max(0, filas - panelesCubiertosPor5850 - panelesCubiertosPor4700 - panelesCubiertosPor3700);
  const r2400 = configuracionRieles.riel2400Activo
    ? floorSafe(restante2400 / 2) * 2 * columnas
    : 0;

  const panelesCubiertosPor2400 = r2400 > 0
    ? (r2400 * 2) / (2 * columnas)
    : 0;

  const restante1250 = Math.max(0, filas - panelesCubiertosPor5850 - panelesCubiertosPor4700 - panelesCubiertosPor3700 - panelesCubiertosPor2400);
  const r1250 = floorSafe(restante1250) * 2 * columnas;

  const totalRieles = r5850 + r4700 + r3700 + r2400 + r1250;
  const splice = Math.max(0, totalRieles - (2 * columnas));

  const endClampBaseRaw = (
    (((totalRieles / (2 * columnas)) * 2) - (splice / columnas)) * columnas * 2
  );

  const midClampBase = (r5850 * 4) + (r4700 * 3) + (r3700 * 2) + (r2400 * 1) + splice;
  const feetL = (r5850 * 5) + (r4700 * 4) + (r3700 * 3) + (r2400 * 2) + (r1250 * 2);
  const wdRaw = ((r5850 * 5) + (r4700 * 4) + (r3700 * 3) + (r2400 * 2) + r1250) / 2;
  const groundingLugBase = ceilSafe(columnas * 1.2);

  return {
    ...grupo,
    filasDireccionRiel: filas,
    columnas,
    totalPaneles: filas * columnas,
    riel5850: roundMaterial(r5850),
    riel4700: roundMaterial(r4700),
    riel3700: roundMaterial(r3700),
    riel2400: roundMaterial(r2400),
    riel1250: roundMaterial(r1250),
    splice: roundMaterial(splice),
    endClampBase: roundMaterial(endClampBaseRaw),
    midClampBase: roundMaterial(midClampBase),
    feetL: roundMaterial(feetL),
    wd: roundMaterial(wdRaw),
    groundingLugBase: roundMaterial(groundingLugBase),
  };
}

function calcularTotalesBase(layoutGrupos, configuracionRieles) {
  return layoutGrupos
    .map((grupo) => calcularRielesPorGrupo(grupo, configuracionRieles))
    .reduce((totales, grupo) => ({
      gruposCalculados: [...totales.gruposCalculados, grupo],
      riel5850: totales.riel5850 + grupo.riel5850,
      riel4700: totales.riel4700 + grupo.riel4700,
      riel3700: totales.riel3700 + grupo.riel3700,
      riel2400: totales.riel2400 + grupo.riel2400,
      riel1250: totales.riel1250 + grupo.riel1250,
      splice: totales.splice + grupo.splice,
      endClampBase: totales.endClampBase + grupo.endClampBase,
      midClampBase: totales.midClampBase + grupo.midClampBase,
      feetL: totales.feetL + grupo.feetL,
      wd: totales.wd + grupo.wd,
      groundingLugBase: totales.groundingLugBase + grupo.groundingLugBase,
      paneles: totales.paneles + grupo.totalPaneles,
    }), {
      gruposCalculados: [],
      riel5850: 0,
      riel4700: 0,
      riel3700: 0,
      riel2400: 0,
      riel1250: 0,
      splice: 0,
      endClampBase: 0,
      midClampBase: 0,
      feetL: 0,
      wd: 0,
      groundingLugBase: 0,
      paneles: 0,
    });
}

function calcularCableRecomendado(distanciaPromedioCableMetros, totalPaneles, distanciaValida = true) {
  const distancia = Math.max(0, toNumber(distanciaPromedioCableMetros, 0));
  const paneles = Math.max(0, toPositiveInt(totalPaneles, 0));

  if (paneles <= 0 || !distanciaValida) {
    return {
      distanciaPromedioMetros: distancia,
      metrosRequeridos: 0,
      rollosDe200m: 0,
      rollosDe500m: 0,
      totalRollos: 0,
      metrosDisponibles: 0,
      sobranteEstimado: 0,
    };
  }

  const metrosRequeridos = distancia;
  const seleccionRollos = seleccionarRollosCable(metrosRequeridos);

  return {
    distanciaPromedioMetros: distancia,
    metrosRequeridos,
    ...seleccionRollos,
  };
}

function calcularReferenciasLayoutLosa(layoutGrupos) {
  return layoutGrupos
    .map((grupo) => {
      const filas = Math.max(0, toPositiveInt(grupo?.filasDireccionRiel, 0));
      const columnas = Math.max(0, toPositiveInt(grupo?.columnas, 0));

      if (filas === 0 || columnas === 0) {
        return {
          sideWindshield: 0,
          rearWindshield: 0,
          groundingLug: 0,
        };
      }

      return {
        sideWindshield: roundMaterial(filas * 2),
        rearWindshield: roundMaterial(filas * columnas),
        groundingLug: roundMaterial(ceilSafe((filas * columnas) / 60)),
      };
    })
    .reduce((total, grupo) => ({
      sideWindshield: total.sideWindshield + grupo.sideWindshield,
      rearWindshield: total.rearWindshield + grupo.rearWindshield,
      groundingLug: total.groundingLug + grupo.groundingLug,
    }), {
      sideWindshield: 0,
      rearWindshield: 0,
      groundingLug: 0,
    });
}

function calcularTotalLosa(totalPaneles, layoutGrupos) {
  const paneles = Math.max(0, toPositiveInt(totalPaneles, 0));
  const referenciasLayout = calcularReferenciasLayoutLosa(layoutGrupos);

  return {
    baseParaLastre: roundMaterial(paneles * 2.8),
    endClamp: roundMaterial(paneles * 4),
    frontLeg: roundMaterial(paneles * 1.4),
    rearLeg: roundMaterial(paneles * 1.4),
    rielLastre: roundMaterial(paneles * 0.7),
    rielTransversal: roundMaterial(paneles * 2),
    sideWindshield: referenciasLayout.sideWindshield,
    rearWindshield: referenciasLayout.rearWindshield,
    splice: roundMaterial(paneles * 2.0167),
    groundingLug: referenciasLayout.groundingLug,
  };
}

function calcularBondingClipS5(layoutGrupos) {
  const bondingClip = layoutGrupos.reduce((total, grupo) => {
    const filas = Math.max(0, toPositiveInt(grupo?.filasDireccionRiel, 0));
    const columnas = Math.max(0, toPositiveInt(grupo?.columnas, 0));
    if (filas <= 0) return total;
    return total + (2 * (columnas - 1));
  }, 0);

  return Math.max(0, roundMaterial(bondingClip));
}

function calcularGroundingLugS5(layoutGrupos) {
  return layoutGrupos.reduce((total, grupo) => {
    const filas = Math.max(0, toPositiveInt(grupo?.filasDireccionRiel, 0));
    const columnas = Math.max(0, toPositiveInt(grupo?.columnas, 0));
    const totalPaneles = filas * columnas;
    return total + ceilSafe(totalPaneles / 60);
  }, 0);
}

function calcularS5(totalesBase, layoutGrupos) {
  const edge = roundMaterial(totalesBase.endClampBase);
  const mid = roundMaterial(totalesBase.midClampBase);

  return {
    edge,
    mid,
    base: edge + mid,
    bondingClip: calcularBondingClipS5(layoutGrupos),
    groundingLug: roundMaterial(calcularGroundingLugS5(layoutGrupos)),
    cableClip: roundMaterial(totalesBase.paneles),
  };
}

function calcularPiso(totalPaneles, configuracionPiso) {
  const paneles = Math.max(0, toPositiveInt(totalPaneles, 0));
  const esEsteOeste = normalizeConfiguracionPiso(configuracionPiso) === 'ESTE_OESTE';

  const fijacionPiso = paneles * 2;
  const fijacionPiso2 = esEsteOeste ? paneles : paneles * 2;

  return {
    endClamp: roundMaterial(paneles * 4),
    fijacionPiso: roundMaterial(fijacionPiso),
    fijacionPiso2: roundMaterial(fijacionPiso2),
    soportePiso: roundMaterial(fijacionPiso),
    rielPiso: roundMaterial(fijacionPiso),
  };
}

function calcularTpo(totalPaneles, tipoTPO, totalesBase) {
  const paneles = Math.max(0, toPositiveInt(totalPaneles, 0));
  const orientacion = normalizeTipoTpo(tipoTPO);

  if (orientacion === 'VERTICAL') {
    const endClamp = roundMaterial(totalesBase.endClampBase);
    const midClamp = roundMaterial(totalesBase.midClampBase);
    const frontLeg = roundMaterial((endClamp + midClamp) / 2);

    return {
      tipoTPO: 'VERTICAL',
      endClamp,
      midClamp,
      frontLeg,
      rearLeg: frontLeg,
      nombreRiel: 'B Rail 1800',
      rielId: 'cor-b-rail-1800',
      cantidadRiel: frontLeg,
    };
  }

  const frontLeg = roundMaterial(paneles * 2);

  return {
    tipoTPO: 'HORIZONTAL',
    endClamp: roundMaterial(paneles * 4),
    midClamp: 0,
    frontLeg,
    rearLeg: frontLeg,
    nombreRiel: 'B Rail 1370',
    rielId: 'cor-b-rail-1370',
    cantidadRiel: frontLeg,
  };
}

function limpiarMaterialesEnCero(materiales = []) {
  return materiales.filter((material) => Number(material?.cant) > 0);
}

function crearMaterial(id, name, cant, unidad = 'unidad') {
  return {
    id,
    name,
    cant: roundMaterial(cant),
    unidad,
  };
}

function agregarMaterialesCable(piezas, cable) {
  if (Number(cable?.rollosDe500m) > 0) {
    piezas.push(crearMaterial('cab-solar-4-500', 'Cable Solar 4mm2 (Rollos 500m)', cable.rollosDe500m, 'rollo'));
  }

  if (Number(cable?.rollosDe200m) > 0) {
    piezas.push(crearMaterial('cab-solar-4-200', 'Cable Solar 4mm2 (Rollos 200m)', cable.rollosDe200m, 'rollo'));
  }
}

function construirMaterialesRieles(totalesBase, cable) {
  const piezas = [
    crearMaterial('cor-rail-5850', 'Riel de Aluminio 5850mm', totalesBase.riel5850),
    crearMaterial('cor-rail-4700', 'Riel de Aluminio 4700mm', totalesBase.riel4700),
    crearMaterial('cor-rail-3700', 'Riel de Aluminio 3700mm', totalesBase.riel3700),
    crearMaterial('cor-rail-2400', 'Riel de Aluminio 2400mm', totalesBase.riel2400),
    crearMaterial('cor-rail-1250', 'Riel de Aluminio 1250mm', totalesBase.riel1250),
    crearMaterial('cor-splice', 'Splice / Conector de Riel', totalesBase.splice),
    crearMaterial('cor-end-clamp', 'End Clamp 35mm', totalesBase.endClampBase),
    crearMaterial('cor-mid-clamp', 'Mid Clamp 35mm', totalesBase.midClampBase),
    crearMaterial('cor-feet-l', 'Feet L', totalesBase.feetL),
    crearMaterial('cor-wd', 'WD', totalesBase.wd),
    crearMaterial('cor-ground-lug', 'Grounding Lug', totalesBase.groundingLugBase),
  ];

  agregarMaterialesCable(piezas, cable);

  return limpiarMaterialesEnCero(piezas);
}

function construirMaterialesLosa(totalPaneles, layoutGrupos, cable) {
  const losa = calcularTotalLosa(totalPaneles, layoutGrupos);
  const piezas = [
    crearMaterial('cor-base-lastre', 'Base para lastre (Losa)', losa.baseParaLastre),
    crearMaterial('cor-end-clamp', 'End Clamp 35mm', losa.endClamp),
    crearMaterial('cor-front-leg', 'Front Leg (Soporte)', losa.frontLeg),
    crearMaterial('cor-rear-leg', 'Rear Leg (Soporte)', losa.rearLeg),
    crearMaterial('cor-rail-lastre', 'Riel Lastre', losa.rielLastre),
    crearMaterial('cor-rail-transversal', 'Riel transversal', losa.rielTransversal),
    crearMaterial('cor-side-windshield', 'Side Windshield', losa.sideWindshield),
    crearMaterial('cor-rear-windshield', 'Rear Windshield', losa.rearWindshield),
    crearMaterial('cor-splice', 'Splice / Conector de Riel', losa.splice),
    crearMaterial('cor-ground-lug', 'Grounding Lug', losa.groundingLug),
  ];

  agregarMaterialesCable(piezas, cable);

  return limpiarMaterialesEnCero(piezas);
}

function construirMaterialesS5(totalesBase, layoutGrupos, cable) {
  const s5 = calcularS5(totalesBase, layoutGrupos);
  const piezas = [
    crearMaterial('cor-s5-edge', 'S-5 Edge Clamp', s5.edge),
    crearMaterial('cor-s5-mid', 'S-5 Mid Clamp', s5.mid),
    crearMaterial('cor-s5-base', 'S-5 Base', s5.base),
    crearMaterial('cor-s5-bonding-clip', 'S-5 Bonding Clip', s5.bondingClip),
    crearMaterial('cor-ground-lug', 'Grounding Lug', s5.groundingLug),
    crearMaterial('cor-cable-clip', 'Cable Clip', s5.cableClip),
  ];

  agregarMaterialesCable(piezas, cable);

  return limpiarMaterialesEnCero(piezas);
}

function construirMaterialesPiso(totalPaneles, configuracionPiso, cable) {
  const piso = calcularPiso(totalPaneles, configuracionPiso);
  const piezas = [
    crearMaterial('cor-end-clamp', 'End Clamp 35mm', piso.endClamp),
    crearMaterial('cor-fijacion-piso', 'Fijación Piso', piso.fijacionPiso),
    crearMaterial('cor-fijacion-piso-2', 'Fijación Piso 2', piso.fijacionPiso2),
    crearMaterial('cor-soporte-piso', 'Soporte de Piso', piso.soportePiso),
    crearMaterial('cor-rail-piso', 'Riel Piso', piso.rielPiso),
  ];

  agregarMaterialesCable(piezas, cable);

  return limpiarMaterialesEnCero(piezas);
}

function construirMaterialesTpo(totalPaneles, tipoTPO, totalesBase, cable) {
  const tpo = calcularTpo(totalPaneles, tipoTPO, totalesBase);
  const piezas = [
    crearMaterial('cor-end-clamp', 'End Clamp 35mm', tpo.endClamp),
    crearMaterial('cor-mid-clamp', 'Mid Clamp 35mm', tpo.midClamp),
    crearMaterial('cor-front-leg', 'Front Leg (Soporte)', tpo.frontLeg),
    crearMaterial('cor-rear-leg', 'Rear Leg (Soporte)', tpo.rearLeg),
    crearMaterial(tpo.rielId, tpo.nombreRiel, tpo.cantidadRiel),
  ];

  agregarMaterialesCable(piezas, cable);

  return {
    tipoTPO: tpo.tipoTPO,
    materiales: limpiarMaterialesEnCero(piezas),
  };
}

function construirMaterialesTeja(totalesBase, totalPaneles, cable) {
  const piezas = [
    crearMaterial('cor-roof-hook', 'Gancho para techo de teja', roundMaterial(totalPaneles * 2.2)),
    crearMaterial('cor-end-clamp', 'End Clamp 35mm', totalesBase.endClampBase),
    crearMaterial('cor-mid-clamp', 'Mid Clamp 35mm', totalesBase.midClampBase),
    crearMaterial('cor-rail-5850', 'Riel de Aluminio 5850mm', totalesBase.riel5850),
    crearMaterial('cor-rail-4700', 'Riel de Aluminio 4700mm', totalesBase.riel4700),
    crearMaterial('cor-rail-3700', 'Riel de Aluminio 3700mm', totalesBase.riel3700),
    crearMaterial('cor-rail-2400', 'Riel de Aluminio 2400mm', totalesBase.riel2400),
    crearMaterial('cor-rail-1250', 'Riel de Aluminio 1250mm', totalesBase.riel1250),
    crearMaterial('cor-splice', 'Splice / Conector de Riel', totalesBase.splice),
    crearMaterial('cor-ground-lug', 'Grounding Lug', totalesBase.groundingLugBase),
  ];

  agregarMaterialesCable(piezas, cable);

  return limpiarMaterialesEnCero(piezas);
}

export function calcularSistemaCorigy({
  cantidadPaneles,
  layoutGrupos,
  tipoMontaje,
  distanciaInversor,
  tipoTPO,
  configuracionPiso,
  riel5850Activo = true,
  riel4700Activo = true,
  riel3700Activo = true,
  riel2400Activo = true,
} = {}) {
  const cantidadPanelesNormalizada = Math.max(0, toPositiveInt(cantidadPaneles, 0));
  const layout = normalizeLayoutGrupos(layoutGrupos, cantidadPanelesNormalizada);

  const configuracionRieles = {
    riel5850Activo: Boolean(riel5850Activo),
    riel4700Activo: Boolean(riel4700Activo),
    riel3700Activo: Boolean(riel3700Activo),
    riel2400Activo: Boolean(riel2400Activo),
  };

  const totalesBase = calcularTotalesBase(layout, configuracionRieles);
  const totalPaneles = Math.max(totalesBase.paneles, cantidadPanelesNormalizada);
  const distanciaNormalizada = String(distanciaInversor ?? '').trim();
  const distanciaValida = distanciaNormalizada !== '' && Number.isFinite(Number.parseFloat(distanciaNormalizada)) && Number.parseFloat(distanciaNormalizada) >= 0;
  const cable = calcularCableRecomendado(distanciaInversor, totalPaneles, distanciaValida);
  const tipoInstalacion = normalizeTipoInstalacion(tipoMontaje);

  let materiales;
  let orientacionTPO = null;
  const advertencias = [];

  switch (tipoInstalacion) {
    case 'LOSA':
      materiales = construirMaterialesLosa(totalPaneles, layout, cable);
      break;
    case 'S5':
      materiales = construirMaterialesS5(totalesBase, layout, cable);
      break;
    case 'PISO':
      materiales = construirMaterialesPiso(totalPaneles, configuracionPiso, cable);
      break;
    case 'TPO': {
      const resultadoTPO = construirMaterialesTpo(totalPaneles, tipoTPO, totalesBase, cable);
      orientacionTPO = resultadoTPO.tipoTPO;
      materiales = resultadoTPO.materiales;
      break;
    }
    case 'TEJA':
      materiales = construirMaterialesTeja(totalesBase, totalPaneles, cable);
      break;
    case 'RIELES':
    default:
      materiales = construirMaterialesRieles(totalesBase, cable);
      break;
  }

  if (totalPaneles <= 0) {
    advertencias.push('No se detectaron paneles válidos para calcular materiales.');
  }

  if (cable.totalRollos === 0 && totalPaneles > 0) {
    advertencias.push('No se pudo calcular cable por falta de distancia válida.');
  }

  return {
    totalPaneles,
    tipoInstalacion,
    orientacionTPO,
    configuracionPiso: normalizeConfiguracionPiso(configuracionPiso),
    layoutGrupos: layout,
    materiales: limpiarMaterialesEnCero(materiales),
    cable,
    totalesBase,
    advertencias,
  };
}

export function calcularPiezasSistema(opciones = {}) {
  return calcularSistemaCorigy(opciones).materiales;
}
