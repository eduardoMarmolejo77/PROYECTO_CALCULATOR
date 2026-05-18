import './common.css';

/**
 * Input reutilizable con label y error.
 */
export default function Input({
  label,
  id,
  error,
  required,
  className = '',
  ...props
}) {
  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label htmlFor={id} className="form-label">
          {label} {required && <span className="form-required">*</span>}
        </label>
      )}
      <input
        id={id}
        className={`form-input ${error ? 'form-input--error' : ''}`}
        required={required}
        {...props}
      />
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
