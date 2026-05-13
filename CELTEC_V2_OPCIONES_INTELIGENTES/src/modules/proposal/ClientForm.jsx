import Input from '../../components/common/Input';
import './proposal.css';

/**
 * Formulario de datos del cliente.
 * @param {object} data - Estado del formulario
 * @param {function} onChange - Callback cuando cambia un campo
 */
export default function ClientForm({ data, onChange }) {
  const handleChange = (e) => {
    onChange({ ...data, [e.target.id]: e.target.value });
  };

  return (
    <div className="proposal-card animate-fade-in-up">
      <div className="proposal-card__header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 className="proposal-card__title" style={{ margin: 0 }}>
          <span className="proposal-card__icon">📋</span>
          Datos del Cliente
        </h3>
        <button 
          onClick={() => onChange({
            cliente: '', ruc: '', direccion: '', contacto: '', email: '', proyecto: '',
            potencia: '', voltaje: '', ambiente: '', garantia: '12', plazo: ''
          })}
          className="btn-clear-client"
        >
          <span>🗑️</span> Limpiar Datos
        </button>
      </div>

      <style>{`
        .btn-clear-client {
          background: rgba(231, 76, 60, 0.1);
          border: 1px solid rgba(231, 76, 60, 0.2);
          color: #ff4757;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn-clear-client:hover {
          background: #ff4757;
          color: white;
          border-color: #ff4757;
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(255, 71, 87, 0.2);
        }
        .btn-clear-client:active {
          transform: scale(0.92);
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
        }
      `}</style>

      <div className="form-row">
        <Input
          id="cliente"
          label="Nombre del Cliente"
          placeholder="Ej: Empresa XYZ S.A."
          value={data.cliente}
          onChange={handleChange}
          required
        />
        <Input
          id="ruc"
          label="RUC"
          placeholder="Ej: J0310000..."
          value={data.ruc}
          onChange={handleChange}
        />
      </div>

      <Input
        id="direccion"
        label="Dirección"
        placeholder="Ej: Calle Principal #123..."
        value={data.direccion}
        onChange={handleChange}
      />

      <div className="form-row">
        <Input
          id="contacto"
          label="Contacto"
          placeholder="Nombre del contacto"
          value={data.contacto}
          onChange={handleChange}
          required
        />
        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="contacto@empresa.com"
          value={data.email}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label htmlFor="proyecto" className="form-label">
          Notas Adicionales <span className="form-required">*</span>
        </label>
        <textarea
          id="proyecto"
          className="form-textarea form-input"
          rows="3"
          placeholder="Escribe aquí los términos, condiciones o notas especiales..."
          value={data.proyecto}
          onChange={handleChange}
          required
        />
      </div>
    </div>
  );
}
