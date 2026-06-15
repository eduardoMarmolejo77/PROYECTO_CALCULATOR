class EventBus {
  constructor() {
    this._suscriptores = new Map();
  }

  emitir(evento, datos) {
    const callbacks = this._suscriptores.get(evento) || [];
    callbacks.forEach((callback) => callback(datos));
  }

  suscribir(evento, callback) {
    if (!this._suscriptores.has(evento)) {
      this._suscriptores.set(evento, []);
    }

    this._suscriptores.get(evento).push(callback);
    return () => this._cancelar(evento, callback);
  }

  _cancelar(evento, callback) {
    const callbacks = this._suscriptores.get(evento) || [];
    this._suscriptores.set(
      evento,
      callbacks.filter((item) => item !== callback)
    );
  }
}

export const bus = new EventBus();
export { EventBus };
