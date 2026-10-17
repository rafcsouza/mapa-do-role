import { CATEGORIES, categoryColor, type Category, type RoleEvent } from '../lib/types'
import { DEFAULT_FILTERS, formatPrice, formatTime, type Filters, type When } from '../lib/filters'

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
  results: RoleEvent[]
  selectedId: string | null
  onSelect: (id: string) => void
  showHeat: boolean
  onToggleHeat: () => void
}

const WHEN: { id: When; label: string }[] = [
  { id: 'agora', label: 'Agora' },
  { id: 'hoje', label: 'Hoje' },
  { id: 'fds', label: 'Fim de semana' },
  { id: 'todos', label: 'Tudo' },
]

const PRICE_STEPS = [20, 50, 80, 120, 200]

const hourLabel = (h: number) => `${String(h % 24).padStart(2, '0')}h`

export function FilterPanel({ filters, onChange, results, selectedId, onSelect, showHeat, onToggleHeat }: Props) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...filters, [k]: v })
  const toggleCat = (c: Category) =>
    set('categories', filters.categories.includes(c) ? filters.categories.filter((x) => x !== c) : [...filters.categories, c])

  return (
    <div className="panel-inner">
      <input
        className="search"
        type="search"
        placeholder="Buscar evento, lugar, bairro…"
        value={filters.query}
        onChange={(e) => set('query', e.target.value)}
      />

      <section>
        <h3>Quando</h3>
        <div className="segmented">
          {WHEN.map((w) => (
            <button key={w.id} className={filters.when === w.id ? 'on' : ''} onClick={() => set('when', w.id)}>
              {w.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>Categoria</h3>
        <div className="chips">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={`chip ${filters.categories.includes(c.id) ? 'on' : ''}`}
              style={{ '--c': c.color } as React.CSSProperties}
              onClick={() => toggleCat(c.id)}
            >
              <span className="dot" />
              {c.label}
            </button>
          ))}
        </div>
      </section>

      {filters.when !== 'agora' && (
        <section>
          <h3>
            Começa entre <span className="muted">{hourLabel(filters.hourFrom)} e {hourLabel(filters.hourTo)}</span>
          </h3>
          <div className="range2">
            <input
              type="range" min={6} max={30} value={filters.hourFrom} aria-label="Início a partir de"
              onChange={(e) => set('hourFrom', Math.min(+e.target.value, filters.hourTo))}
            />
            <input
              type="range" min={6} max={30} value={filters.hourTo} aria-label="Início até"
              onChange={(e) => set('hourTo', Math.max(+e.target.value, filters.hourFrom))}
            />
          </div>
        </section>
      )}

      <section>
        <h3>Preço</h3>
        <div className="chips">
          <button
            className={`chip ${filters.freeOnly ? 'on' : ''}`}
            onClick={() => onChange({ ...filters, freeOnly: !filters.freeOnly, maxPrice: null })}
          >
            Grátis
          </button>
          {PRICE_STEPS.map((p) => (
            <button
              key={p}
              className={`chip ${!filters.freeOnly && filters.maxPrice === p ? 'on' : ''}`}
              onClick={() => onChange({ ...filters, freeOnly: false, maxPrice: filters.maxPrice === p ? null : p })}
            >
              até R${p}
            </button>
          ))}
        </div>
      </section>

      <div className="row">
        <label className="switch">
          <input type="checkbox" checked={showHeat} onChange={onToggleHeat} />
          <span className="track" />
          <span>Mapa de calor</span>
        </label>
        <button className="link" onClick={() => onChange(DEFAULT_FILTERS)}>Limpar filtros</button>
      </div>

      <section className="results">
        <h3>{results.length} {results.length === 1 ? 'rolê' : 'rolês'}</h3>
        <ul>
          {results.slice(0, 200).map((e) => (
            <li key={e.id}>
              <button className={`result ${selectedId === e.id ? 'on' : ''}`} onClick={() => onSelect(e.id)}>
                <span className="bar" style={{ background: categoryColor(e.category) }} />
                <span className="txt">
                  <strong>{e.title}</strong>
                  <small>{e.venue.name} · {formatTime(e)}</small>
                  <small className="muted">{formatPrice(e)}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {!results.length && (
          <p className="muted empty">Nada por aqui com esses filtros. Tenta ampliar o horário ou o preço.</p>
        )}
      </section>
    </div>
  )
}
