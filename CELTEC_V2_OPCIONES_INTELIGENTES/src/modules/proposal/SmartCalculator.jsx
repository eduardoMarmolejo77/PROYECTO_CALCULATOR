import { useState, useEffect, useMemo } from 'react';
import Input from '../../components/common/Input';
import './proposal.css';

/**
 * Calculadora Solar Simplificada.
 * Permite ingresar consumo y tipo de estructura para dimensionamiento automático.
 */
export default function SmartCalculator({ products = [], onResultsChange }) {
  const [data, setData] = useState({
    consumoAnual: '',
    tipoMontaje: '',
    panelId: '',
    distanciaInversor: '',
    recommendationProfile: ''
  });

  // Obtener paneles del catálogo para el selector
  const availablePanels = useMemo(() => products.filter((p) => {
    const text = `${p.id} ${p.name} ${p.description}`.toLowerCase();
    return text.includes('panel') || text.includes('solar') || text.includes('fotovolta');
  }), [products]);

  useEffect(() => {
    const profileMultipliers = {
      balanced: 1,
      stock: 0.95,
      premium: 1.15
    };

    const selectedPanel = products.find(p => p.id === data.panelId) || availablePanels[0];
    const potPanel = parseInt(selectedPanel?.name?.match(/\d+/)?.[0] || '0');

    if (!potPanel) {
      onResultsChange(null);
      return;
    }
    const consumo = parseFloat(data.consumoAnual) || 0;

    // Lógica de dimensionamiento (Manual CELTEC)
    const factorProduccion = 1200; // Panamá
    const margenSeguridad = 1.25;
    const profileFactor = profileMultipliers[data.recommendationProfile] || 1;
    const wpNecesario = ((consumo / factorProduccion) * 1000 * margenSeguridad) * profileFactor;
    const numPaneles = Math.ceil(wpNecesario / potPanel);

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
    }

    // Cableado
    const rollosCable = Math.ceil((data.distanciaInversor * 2) / 200);
    if (rollosCable > 0) {
      piezas.push({ id: 'cab-solar-4', name: 'Cable Solar 4mm2 (Rollos 200m)', cant: rollosCable });
    }

    onResultsChange({
      numPaneles,
      panelId: data.panelId,
      piezas,
      totalWp: numPaneles * potPanel,
      tipoMontaje: data.tipoMontaje,
      recommendationProfile: data.recommendationProfile
    });
  }, [data, products, availablePanels, onResultsChange]);

  const handleNumberChange = (field, value) => {
    if (value === '') {
      setData(prev => ({ ...prev, [field]: '' }));
    } else {
      setData(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    }
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

      <div className="calc-grid" style={{ marginTop: '20px' }}>
        <Input
          label="Consumo Anual (kWh)"
          type="number"
          value={data.consumoAnual}
          onChange={e => handleNumberChange('consumoAnual', e.target.value)}
          onBlur={() => handleBlur('consumoAnual')}
        />

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

        <div className="calc-input-group">
          <label>Seleccionar Panel</label>
          <select value={data.panelId} onChange={e => setData({ ...data, panelId: e.target.value })}>
            <option value="">-- Seleccione panel --</option>
            {availablePanels.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <Input
          label="Distancia al Inversor (m)"
          type="number"
          value={data.distanciaInversor}
          onChange={e => handleNumberChange('distanciaInversor', e.target.value)}
          onBlur={() => handleBlur('distanciaInversor')}
        />
      </div>


      <div style={{ marginTop: '20px' }}>
        <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: 'var(--color-text)' }}>
          Tipo de Solución Inteligente
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setData({ ...data, recommendationProfile: 'balanced' })}
            className={`recommendation-btn ${data.recommendationProfile === 'balanced' ? 'active' : ''}`}
          >
            <div style={{ fontSize: '15px', fontWeight: '700' }}>⚖️ Balanceado</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Costo / calidad / precio</div>
          </button>

          <button
            type="button"
            onClick={() => setData({ ...data, recommendationProfile: 'stock' })}
            className={`recommendation-btn ${data.recommendationProfile === 'stock' ? 'active' : ''}`}
          >
            <div style={{ fontSize: '15px', fontWeight: '700' }}>📦 Disponible</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Prioriza stock actual</div>
          </button>

          <button
            type="button"
            onClick={() => setData({ ...data, recommendationProfile: 'premium' })}
            className={`recommendation-btn ${data.recommendationProfile === 'premium' ? 'active' : ''}`}
          >
            <div style={{ fontSize: '15px', fontWeight: '700' }}>👑 Premium</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Lo mejor de lo mejor</div>
          </button>
        </div>
      </div>


      <div className="calc-summary" style={{ background: 'linear-gradient(135deg, rgba(227, 255, 0, 0.05) 0%, rgba(255,255,255,0) 100%)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(227, 255, 0, 0.3)', marginTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ background: 'var(--color-accent)', color: 'white', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>SISTEMA IA</span>
          <span style={{ color: 'var(--color-text-secondary)', fontWeight: '600', fontSize: '14px' }}>Mejor Propuesta Recomendada:</span>
        </div>

        <div className="ai-text-box" style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--color-text)' }}>
          {(() => {
            const selectedPanel = products.find(p => p.id === data.panelId) || availablePanels[0];
            const potPanel = parseInt(selectedPanel?.name?.match(/\d+/)?.[0] || '0');
            if (!potPanel) return 'Selecciona un panel del catálogo para generar la recomendación.';
            const consumo = parseFloat(data.consumoAnual) || 0;
            const profileFactor = data.recommendationProfile === 'premium' ? 1.15 : data.recommendationProfile === 'stock' ? 0.95 : 1;
            const wpNecesario = ((consumo / 1200) * 1000 * 1.25) * profileFactor;
            const numPaneles = Math.ceil(wpNecesario / potPanel);
            const totalWp = numPaneles * potPanel;

            return (
              <>
                {data.recommendationProfile === 'balanced' && '⚖️ Opción Balanceada: '}
                {data.recommendationProfile === 'stock' && '📦 Opción Disponible: '}
                {data.recommendationProfile === 'premium' && '👑 Opción Premium: '}
                Basado en tu consumo anual de <strong>{(parseFloat(data.consumoAnual) || 0).toLocaleString()} kWh</strong> y la estructura de tipo <strong>{data.tipoMontaje}</strong>,
                nuestro sistema recomienda una instalación de <strong>{numPaneles} paneles</strong> de {potPanel}W,
                alcanzando una potencia total de <strong>{(totalWp / 1000).toFixed(2)} kWp</strong>.
                {data.recommendationProfile === 'balanced' && ' Esta configuración busca el mejor equilibrio entre rendimiento, inversión y retorno.'}
                {data.recommendationProfile === 'stock' && ' Esta configuración prioriza equipos con disponibilidad inmediata y rápida entrega.'}
                {data.recommendationProfile === 'premium' && ' Esta configuración prioriza máxima eficiencia, mayor producción y componentes premium.'}
              </>
            );
          })()}
        </div>

        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '15px', fontStyle: 'italic' }}>
          * Los accesorios estructurales y el cableado se han dimensionado automáticamente para esta configuración.
        </p>
      </div>

      <style>{`
        select {
          padding: 10px;
          background: #FFFFFF;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-text);
          width: 100%;
          outline: none;
        }
        select:focus {
          border-color: var(--color-accent);
        }
        .recommendation-btn {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.25s ease;
          color: var(--color-text);
          text-align: left;
        }
        .recommendation-btn:hover {
          transform: translateY(-2px);
          border-color: rgba(227,255,0,0.4);
        }
        .recommendation-btn.active {
          background: linear-gradient(135deg, rgba(227,255,0,0.18) 0%, rgba(255,255,255,0.02) 100%);
          border-color: var(--color-accent);
          box-shadow: 0 0 20px rgba(227,255,0,0.12);
        }
      `}</style>
    </div>
  );
}
