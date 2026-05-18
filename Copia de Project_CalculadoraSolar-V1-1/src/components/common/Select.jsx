import './common.css';

/**
 * Select reutilizable con label y error.
 */
export default function Select({
  label,
  id,
  options = [],
  placeholder,
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
      <select
        id={id}
        className={`form-select ${error ? 'form-select--error' : ''}`}
        required={required}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
