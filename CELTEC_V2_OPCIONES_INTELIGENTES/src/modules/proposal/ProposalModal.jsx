import Button from '../../components/common/Button';
import './proposal.css';

export default function ProposalModal({ isOpen, onClose, clientData, materials, quoteNumber, total, onDownloadPDF }) {
  if (!isOpen) return null;

  return (
    <div className="proposal-modal-overlay">
      <div className="proposal-modal animate-scale-in">
        <div className="proposal-modal__header">
          <div className="proposal-modal__title-group">
            <span className="proposal-modal__badge">RECOMENDADO</span>
            <h2 className="proposal-modal__title">Esta es la mejor propuesta que tenemos</h2>
          </div>
          <button className="proposal-modal__close" onClick={onClose}>&times;</button>
        </div>

        <div className="proposal-modal__body">
          <div className="proposal-modal__client-info">
            <p><strong>Cliente:</strong> {clientData.cliente}</p>
            <p><strong>Proyecto:</strong> {clientData.proyecto}</p>
            <p><strong>Cotización:</strong> {quoteNumber}</p>
          </div>

          <h3 className="proposal-modal__section-title">Lista de Materiales</h3>
          <div className="proposal-modal__table-wrapper">
            <table className="proposal-modal__table">
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Cantidad</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m, i) => (
                  <tr key={i}>
                    <td>{m.name}</td>
                    <td>{m.quantity} {m.id.includes('sol-p') ? 'unidades' : 'piezas'}</td>
                    <td>${(m.price * m.quantity).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="proposal-modal__footer-stats">
            <div className="proposal-modal__stat">
              <label>Inversión Estimada</label>
              <span>${total.toLocaleString()}</span>
            </div>
            <div className="proposal-modal__actions">
              <Button variant="primary" icon="📥" onClick={onDownloadPDF}>
                Descargar PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .proposal-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .proposal-modal {
          background: white;
          width: 100%;
          max-width: 800px;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-height: 90vh;
        }
        .proposal-modal__header {
          padding: 24px;
          background: var(--color-bg-secondary);
          border-bottom: 1px solid var(--color-border);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .proposal-modal__badge {
          background: var(--color-accent);
          color: white;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          margin-bottom: 8px;
          display: inline-block;
        }
        .proposal-modal__title {
          font-size: 24px;
          font-weight: 800;
          color: var(--color-text);
          margin: 0;
        }
        .proposal-modal__close {
          background: none;
          border: none;
          font-size: 32px;
          color: var(--color-text-muted);
          cursor: pointer;
          line-height: 1;
        }
        .proposal-modal__body {
          padding: 24px;
          overflow-y: auto;
        }
        .proposal-modal__client-info {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          background: #f8fafc;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 14px;
        }
        .proposal-modal__section-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 16px;
          color: var(--color-accent);
        }
        .proposal-modal__table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
        }
        .proposal-modal__table th {
          text-align: left;
          padding: 12px;
          background: #f1f5f9;
          font-size: 12px;
          text-transform: uppercase;
          color: var(--color-text-secondary);
        }
        .proposal-modal__table td {
          padding: 12px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 14px;
        }
        .proposal-modal__footer-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 24px;
          border-top: 2px solid var(--color-border);
        }
        .proposal-modal__stat {
          display: flex;
          flex-direction: column;
        }
        .proposal-modal__stat label {
          font-size: 12px;
          color: var(--color-text-muted);
          text-transform: uppercase;
          font-weight: 600;
        }
        .proposal-modal__stat span {
          font-size: 28px;
          font-weight: 800;
          color: var(--color-text);
        }
      `}</style>
    </div>
  );
}
