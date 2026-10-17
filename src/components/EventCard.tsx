import { CATEGORIES, type RoleEvent } from '../lib/types'
import { formatPrice, formatTime } from '../lib/filters'

export function EventCard({ event, onClose }: { event: RoleEvent; onClose: () => void }) {
  const cat = CATEGORIES.find((c) => c.id === event.category)
  const maps = `https://www.google.com/maps/search/?api=1&query=${event.venue.lat},${event.venue.lng}`
  return (
    <div className="card" role="dialog" aria-label={event.title}>
      <button className="close" onClick={onClose} aria-label="Fechar">×</button>
      {event.image && <img src={event.image} alt="" loading="lazy" />}
      <div className="card-body">
        <span className="tag" style={{ color: cat?.color }}>{cat?.label}</span>
        <h2>{event.title}</h2>
        <p>{formatTime(event)}</p>
        <p className="muted">
          {event.venue.name}
          {event.venue.address ? ` · ${event.venue.address}` : ''}
        </p>
        <p className="price">{formatPrice(event)}</p>
        <div className="actions">
          <a className="btn primary" href={event.url} target="_blank" rel="noreferrer">
            Ingressos · {event.source}
          </a>
          <a className="btn" href={maps} target="_blank" rel="noreferrer">Como chegar</a>
        </div>
      </div>
    </div>
  )
}
