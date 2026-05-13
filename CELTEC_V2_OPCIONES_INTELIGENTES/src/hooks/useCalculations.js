import { useMemo } from 'react';

/**
 * Hook de cálculos de dimensionamiento eléctrico.
 * Mismas fórmulas del HTML original.
 */
export function useCalculations() {
  const secciones = useMemo(() => ({
    16: 1.5, 25: 2.5, 32: 4, 40: 6, 50: 10,
    63: 16, 80: 25, 100: 35, 125: 50, 160: 70, 200: 95,
  }), []);

  /**
   * Calcula el dimensionamiento eléctrico completo.
   * @param {number} potencia - Potencia en kW
   * @param {number} voltaje - Voltaje en V (230, 400, 690)
   * @returns {object} Resultados de dimensionamiento
   */
  function calcularDimensionamiento(potencia, voltaje) {
    if (!potencia || !voltaje) return null;

    const potenciaInstalada = potencia * 1.15; // 15% de margen
    const voltajeNum = parseFloat(voltaje);
    const cosfi = 0.95;

    // I = P / (√3 * V * cos φ) para trifásico, I = P / (V * cos φ) para monofásico
    const intensidad = voltajeNum === 230
      ? (potenciaInstalada * 1000) / (voltajeNum * cosfi)
      : (potenciaInstalada * 1000) / (Math.sqrt(3) * voltajeNum * cosfi);

    // Selección de sección de cable
    let seccion = 95; // valor por defecto para corrientes muy altas
    for (const [amperaje, seccionCable] of Object.entries(secciones)) {
      if (intensidad <= parseFloat(amperaje)) {
        seccion = seccionCable;
        break;
      }
    }

    // Protección recomendada
    let proteccion = '';
    if (intensidad <= 16) proteccion = 'Magnetotérmico 16A';
    else if (intensidad <= 25) proteccion = 'Magnetotérmico 25A';
    else if (intensidad <= 32) proteccion = 'Magnetotérmico 32A';
    else if (intensidad <= 40) proteccion = 'Magnetotérmico 40A';
    else if (intensidad <= 63) proteccion = 'Magnetotérmico 63A';
    else if (intensidad <= 100) proteccion = 'Magnetotérmico 100A';
    else proteccion = 'Magnetotérmico 125A + diferencial 30mA';

    return {
      potenciaInstalada: potenciaInstalada.toFixed(2),
      intensidad: intensidad.toFixed(1),
      seccion: seccion.toFixed(1),
      proteccion,
    };
  }

  /**
   * Calcula el resumen económico.
   * @param {number} subtotal - Subtotal de productos
   * @param {number} descuentoPct - Porcentaje de descuento (0-1)
   * @param {number} ivaPct - Porcentaje de ITBMS (0-1)
   * @returns {object} Resumen económico
   */
  function calcularEconomico(subtotal, descuentoPct = 0.0) {
    const descuento = subtotal * descuentoPct;
    const total = subtotal - descuento;

    return {
      subtotal: subtotal.toFixed(2),
      descuento: descuento.toFixed(2),
      total: total.toFixed(2),
      descuentoPct: Math.round(descuentoPct * 100),
    };
  }

  return { calcularDimensionamiento, calcularEconomico };
}
