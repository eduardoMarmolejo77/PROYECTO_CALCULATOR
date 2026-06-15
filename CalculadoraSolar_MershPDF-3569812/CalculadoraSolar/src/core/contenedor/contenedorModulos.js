class ContenedorModulos {
  constructor() {
    this._modulos = new Map();
  }

  registrar(modulo) {
    const registro = modulo?.registroModulo;

    if (!registro?.id) {
      throw new Error('El módulo no tiene un registro válido.');
    }

    this._modulos.set(registro.id, {
      ...modulo,
      registro,
    });

    if (typeof registro.inicializar === 'function') {
      registro.inicializar(this);
    }

    return this;
  }

  limpiar() {
    this._modulos.clear();
    return this;
  }

  obtener(id) {
    return this._modulos.get(id);
  }

  existe(id) {
    return this._modulos.has(id);
  }

  obtenerModulos() {
    return Array.from(this._modulos.values());
  }

  obtenerRutas() {
    return this.obtenerModulos().flatMap((modulo) => modulo.registro.rutas || []);
  }

  obtenerItemsNavegacion() {
    return this.obtenerModulos()
      .flatMap((modulo) => modulo.registro.itemsNavegacion || [])
      .filter((item) => item?.ruta && item?.etiqueta)
      .sort((a, b) => (a.orden ?? 100) - (b.orden ?? 100));
  }
}

export const contenedor = new ContenedorModulos();
export { ContenedorModulos };
