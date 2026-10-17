import { useEffect, useMemo, useState } from 'react'
import { RoleMap } from './components/RoleMap'
import { FilterPanel } from './components/FilterPanel'
import { EventCard } from './components/EventCard'
import { applyFilters, DEFAULT_FILTERS, type Filters } from './lib/filters'
import type { EventsFile } from './lib/types'

const SP: [number, number] = [-46.6559, -23.5613]

export default function App() {
  const [data, setData] = useState<EventsFile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showHeat, setShowHeat] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    fetch('/data/events.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch((e) => setError(String(e)))
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const results = useMemo(
    () => (data ? applyFilters(data.events, filters, now).sort((a, b) => a.start.localeCompare(b.start)) : []),
    [data, filters, now],
  )
  const selected = results.find((e) => e.id === selectedId) ?? null

  const select = (id: string | null) => {
    setSelectedId(id)
    if (id) setPanelOpen(false)
  }

  return (
    <div className={`app ${panelOpen ? 'panel-open' : ''}`}>
      <aside className="panel">
        <header className="brand">
          <span className="logo" />
          <h1>Mapa do Rolê</h1>
          <button className="panel-toggle" onClick={() => setPanelOpen((o) => !o)}>
            {panelOpen ? 'Ver mapa' : `Filtros · ${results.length}`}
          </button>
        </header>
        <div className="panel-scroll">
          {error && (
            <p className="error">
              Não consegui carregar os eventos ({error}). Rode <code>npm run seed</code> ou <code>npm run scrape</code>.
            </p>
          )}
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            results={results}
            selectedId={selectedId}
            onSelect={select}
            showHeat={showHeat}
            onToggleHeat={() => setShowHeat((s) => !s)}
          />
          {data && (
            <footer className="muted foot">
              {data.city} · atualizado{' '}
              {new Date(data.generatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </footer>
          )}
        </div>
      </aside>

      <main className="map-wrap">
        <RoleMap events={results} center={SP} showHeat={showHeat} selectedId={selectedId} onSelect={select} />
        {selected && <EventCard event={selected} onClose={() => setSelectedId(null)} />}
      </main>
    </div>
  )
}
