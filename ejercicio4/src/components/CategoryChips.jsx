/**
 * Chips de categoría. `categories` es [[nombre, cuántos], ...].
 * La chip "Todo" se añade aquí y su número se deriva sumando las demás.
 */
export default function CategoryChips({ categories, active, onChange }) {
  if (categories.length === 0) return null;

  const total = categories.reduce((sum, [, count]) => sum + count, 0);
  const chips = [['all', total], ...categories];

  return (
    <div className="chips" role="group" aria-label="Filtrar por categoría">
      {chips.map(([name, count]) => (
        <button
          key={name}
          type="button"
          className={`chip ${name === active ? 'chip--active' : ''}`}
          aria-pressed={name === active}
          onClick={() => onChange(name)}
        >
          {name === 'all' ? 'Todo' : name} <span>{count}</span>
        </button>
      ))}
    </div>
  );
}
