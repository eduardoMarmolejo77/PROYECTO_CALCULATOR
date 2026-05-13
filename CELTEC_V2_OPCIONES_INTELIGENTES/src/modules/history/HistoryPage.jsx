import { useState, useEffect } from 'react';
import Button from '../../components/common/Button';
import './history.css';

const HISTORY_KEY = 'propuestas_app_history';

function getHistory() {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Página de historial de propuestas.
 * Muestra las propuestas guardadas previamente.
 */
export default function HistoryPage() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleClear = () => {
    if (window.confirm('¿Estás seguro de limpiar todo el historial?')) {
      localStorage.removeItem(HISTORY_KEY);
      setHistory([]);
    }
  };

  return (
    <div className="history-page">
      <div className="history-page__header">
        <div>
          <h1 className="history-page__title">
            <span>📋</span> Historial de Propuestas
          </h1>
          <p className="history-page__subtitle">
            Revisa las propuestas generadas anteriormente
          </p>
        </div>
        {history.length > 0 && (
          <Button variant="danger" icon="🗑️" onClick={handleClear}>
            Limpiar historial
          </Button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="history-empty animate-fade-in-up">
          <span className="history-empty__icon">📭</span>
          <h3>Sin propuestas aún</h3>
          <p>Las propuestas generadas aparecerán aquí automáticamente.</p>
        </div>
      ) : (
        <div className="history-list stagger-children">
          {history.map((item) => (
            <div key={item.id} className="history-item">
              <div className="history-item__header">
                <div className="history-item__info">
                  <span className="history-item__quote">{item.quoteNumber}</span>
                  <h3 className="history-item__client">{item.cliente}</h3>
                  <span className="history-item__ruc">RUC: {item.ruc || 'N/A'}</span>
                </div>
                <div className="history-item__status">
                  <span className="history-item__date">
                    {new Date(item.date).toLocaleDateString('es-ES', { 
                      day: '2-digit', month: 'short', year: 'numeric' 
                    })}
                  </span>
                </div>
              </div>
              
              <div className="history-item__body">
                <div className="history-item__stat">
                  <label>Productos</label>
                  <span>{item.productCount} items</span>
                </div>
                <div className="history-item__stat">
                  <label>Total Cotizado</label>
                  <span className="history-item__total">$ {item.total}</span>
                </div>
                
                <div className="history-item__actions">
                   <Button 
                    variant="ghost" 
                    icon="👁️" 
                    onClick={() => alert('Función para re-cargar datos próximamente')}
                   >
                    Detalles
                   </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
