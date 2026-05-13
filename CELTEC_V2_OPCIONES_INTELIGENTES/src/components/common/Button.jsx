import './common.css';

/**
 * Botón reutilizable con variantes.
 * @param {string} variant - 'primary' | 'success' | 'danger' | 'ghost'
 * @param {boolean} fullWidth - Si ocupa todo el ancho
 * @param {boolean} disabled
 * @param {string} icon - Emoji o icono
 */
export default function Button({
  children,
  variant = 'primary',
  fullWidth = false,
  disabled = false,
  icon,
  className = '',
  ...props
}) {
  return (
    <button
      className={`btn btn--${variant} ${fullWidth ? 'btn--full' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="btn__icon">{icon}</span>}
      {children}
    </button>
  );
}
