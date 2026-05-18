import { useState, useEffect, useMemo } from 'react';
import Input from '../../components/common/Input';
import './proposal.css';

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
export default function SmartCalculator({ products = [], onResultsChange }) {
  const [data, setData] = useState({
    consumosMensuales: MONTH_LABELS.map(() => ''),
    tipoInstalacion: '',
    tipoMontaje: '',
    distanciaInversor: '',
    coberturaObjetivo: 100,
    horasSolPico: 4.5,
    performanceRatio: 80,
    margenSeguridad: 10,
    recommendationProfile: 'balanced'
  });

  const consumosMensuales = useMemo(() => data.consumosMensuales.map((value) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }), [data.consumosMensuales]);
  const hasValidMonthlySeries = consumosMensuales.every((value) => Number.isFinite(value) && value >= 0);
  const consumoAnual = hasValidMonthlySeries
    ? consumosMensuales.reduce((total, value) => total + value, 0)
    : Number.NaN;
  const consumoMensual = hasValidMonthlySeries
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
  const availablePanels = useMemo(() => products.filter((p) => {
    const text = `${p.id} ${p.name} ${p.description}`.toLowerCase();
    return text.includes('panel') || text.includes('solar') || text.includes('fotovolta');
  }), [products]);

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

    if (!hasValidMonthlySeries) fields.push('consumo de los 12 meses');
    else if (!Number.isFinite(consumoMensual) || consumoMensual <= 0) fields.push('consumo mensual promedio');
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
  }, [availablePanels.length, consumoMensual, coberturaObjetivo, data.distanciaInversor, data.recommendationProfile, data.tipoInstalacion, data.tipoMontaje, distanciaInversor, hasValidMonthlySeries, horasSolPico, margenSeguridad, panelOptions.length, performanceRatio, selectedRecommendation]);

  const isRecommendationReady = missingFields.length === 0;

  useEffect(() => {
    if (!isRecommendationReady) {
      onResultsChange(null);
      return;
    }

    const numPaneles = selectedRecommendation.numPaneles;

    // Cálculo de piezas estructurales
    let piezas = [];
    const p = numPaneles;

    if (data.tipoMontaje === 'Losa') {
      piezas = [
        { id: 'cor-base-lastre', name: 'Base para lastre (Losa)', cant: Math.round(p * 2.8) },
        { id: 'cor-end-clamp', name: 'End Clamp 35mm', cant: 4 },
        { id: 'cor-mid-clamp', name: 'Mid Clamp 35mm', cant: Math.max(0, p - 2) * 2 },
        { id: 'cor-front-leg', name: 'Front Leg (Soporte)', cant: Math.round(p * 1.4) },
        { id: 'cor-rear-leg', name: 'Rear Leg (Soporte)', cant: Math.round(p * 1.4) },
        { id: 'cor-rail-5850', name: 'Riel de Aluminio 5850mm', cant: Math.ceil(p * 2.5 / 5.85) },
        { id: 'cor-windshield', name: 'Deflector de viento', cant: Math.ceil(p * 0.33) },
        { id: 'cor-ground-lug', name: 'Grounding Lug', cant: 4 }
      ];
    } else if (data.tipoMontaje === 'Piso') {
      piezas = [
        { id: 'cor-end-clamp', name: 'End Clamp 35mm', cant: 4 },
        { id: 'cor-mid-clamp', name: 'Mid Clamp 35mm', cant: Math.max(0, p - 2) * 2 },
        { id: 'cor-front-leg', name: 'Soporte Frontal Piso', cant: p * 2 },
        { id: 'cor-rail-5850', name: 'Riel de Aluminio 5850mm', cant: Math.ceil(p * 2.5 / 5.85) }
      ];
    } else if (data.tipoMontaje === 'S-5') {
      piezas = [
        { id: 'cor-s5-clamp', name: 'S-5! Clamp (Engargolado)', cant: p * 2 },
        { id: 'cor-end-clamp', name: 'End Clamp 35mm', cant: 4 },
        { id: 'cor-mid-clamp', name: 'Mid Clamp 35mm', cant: Math.max(0, p - 2) * 2 }
      ];
    } else if (data.tipoMontaje === 'TPO') {
      piezas = [
        { id: 'cor-tpo-base', name: 'Base TPO para cubierta plana', cant: Math.ceil(p * 1.5) },
        { id: 'cor-end-clamp', name: 'End Clamp 35mm', cant: 4 },
        { id: 'cor-mid-clamp', name: 'Mid Clamp 35mm', cant: Math.max(0, p - 2) * 2 },
        { id: 'cor-rail-5850', name: 'Riel de Aluminio 5850mm', cant: Math.ceil(p * 2.5 / 5.85) }
      ];
    } else if (data.tipoMontaje === 'Teja') {
      piezas = [
        { id: 'cor-roof-hook', name: 'Gancho para techo de teja', cant: Math.ceil(p * 2.2) },
        { id: 'cor-end-clamp', name: 'End Clamp 35mm', cant: 4 },
        { id: 'cor-mid-clamp', name: 'Mid Clamp 35mm', cant: Math.max(0, p - 2) * 2 },
        { id: 'cor-rail-5850', name: 'Riel de Aluminio 5850mm', cant: Math.ceil(p * 2.5 / 5.85) }
      ];
    }

    // Cableado
    const rollosCable = Math.ceil((distanciaInversor * 2) / 200);
    if (rollosCable > 0) {
      piezas.push({ id: 'cab-solar-4', name: 'Cable Solar 4mm2 (Rollos 200m)', cant: rollosCable });
    }

    const estimatedAnnualProduction = (selectedRecommendation.totalWp / 1000) * 365 * horasSolPico * (performanceRatio / 100);

    onResultsChange({
      numPaneles,
      panelId: selectedRecommendation.id,
      panelName: selectedRecommendation.name,
      panelPower: selectedRecommendation.power,
      piezas,
      totalWp: selectedRecommendation.totalWp,
      requiredWp: selectedRecommendation.requiredWp,
      estimatedAnnualProduction,
      consumosMensuales,
      consumoMensual,
      consumoAnual,
      coberturaObjetivo,
      horasSolPico,
      performanceRatio,
      margenSeguridad,
      distanciaInversor,
      tipoInstalacion: data.tipoInstalacion,
      tipoMontaje: data.tipoMontaje,
      recommendationProfile: data.recommendationProfile,
      recommendationLabel: PROFILE_CONFIG[data.recommendationProfile].label
    });
  }, [consumoAnual, consumoMensual, consumosMensuales, coberturaObjetivo, data.recommendationProfile, data.tipoInstalacion, data.tipoMontaje, distanciaInversor, horasSolPico, isRecommendationReady, margenSeguridad, onResultsChange, performanceRatio, selectedRecommendation]);

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

  return (
    <div className="proposal-card smart-calculator animate-fade-in-up">
      <h3 className="proposal-card__title">
        <span className="proposal-card__icon">🗒️</span>
        Calculadora Solar
      </h3>

      <div className="monthly-consumption-block">
        <label className="monthly-consumption-block__title">Consumo Mensual (kWh) - Últimos 12 meses</label>

        <div className="monthly-consumption-grid">
          {MONTH_LABELS.map((monthLabel, index) => (
            <Input
              key={monthLabel}
              label={monthLabel}
              type="number"
              min="0"
              step="0.01"
              value={data.consumosMensuales[index]}
              onChange={e => handleMonthlyChange(index, e.target.value)}
              onBlur={handleBlur}
            />
          ))}
        </div>

        <div className="monthly-consumption-summary">
          <div>
            Promedio mensual:{' '}
            <strong>
              {Number.isFinite(consumoMensual) ? `${Math.round(consumoMensual).toLocaleString()} kWh` : 'Completa los 12 meses'}
            </strong>
          </div>
          <div>
            Consumo anual:{' '}
            <strong>
              {Number.isFinite(consumoAnual) ? `${Math.round(consumoAnual).toLocaleString()} kWh` : 'Completa los 12 meses'}
            </strong>
          </div>
        </div>
      </div>

      <div className="calc-grid solar-form-grid">
        <div className="calc-input-group">
          <label>Tipo de Instalación</label>
          <select value={data.tipoInstalacion} onChange={e => setData({ ...data, tipoInstalacion: e.target.value })}>
            <option value="">-- Seleccione tipo --</option>
            <option value="Residencial">Residencial</option>
            <option value="Comercial">Comercial</option>
            <option value="Industrial">Industrial</option>
          </select>
        </div>

        <div className="calc-input-group">
          <label>Tipo de Estructura</label>
          <select value={data.tipoMontaje} onChange={e => setData({ ...data, tipoMontaje: e.target.value })}>
            <option value="">-- Seleccione tipo --</option>
            <option value="Losa">Losa</option>
            <option value="Piso">Piso</option>
            <option value="S-5">S-5 (Engargolado)</option>
            <option value="TPO">TPO</option>
            <option value="Teja">Teja</option>
          </select>
        </div>

        <Input
          label="Distancia al Inversor (m)"
          type="number"
          min="0"
          value={data.distanciaInversor}
          onChange={e => handleNumberChange('distanciaInversor', e.target.value)}
          onBlur={() => handleBlur('distanciaInversor')}
        />
      </div>


      <div className="solar-solution">
        <label className="solar-solution__title">
          Tipo de Solución Inteligente
        </label>

        <div className="recommendation-grid">
          {Object.entries(PROFILE_CONFIG).map(([profile, config]) => {
            const recommendation = panelRecommendations[profile];

            return (
              <button
                type="button"
                key={profile}
                onClick={() => setData({ ...data, recommendationProfile: profile })}
                className={`recommendation-btn ${data.recommendationProfile === profile ? 'active' : ''}`}
              >
                <div className="recommendation-btn__title">{config.icon} {config.label}</div>
                <div className="recommendation-btn__description">{config.description}</div>
                {recommendation && (
                  <div className="recommendation-btn__panel">
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
