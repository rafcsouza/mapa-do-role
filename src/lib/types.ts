export type Category = 'festa' | 'show' | 'bar' | 'teatro' | 'standup' | 'cultura' | 'outro'

export interface Venue {
  name: string
  address?: string
  lat: number
  lng: number
}

export interface RoleEvent {
  id: string
  title: string
  source: string
  url: string
  category: Category
  /** ISO 8601 com fuso */
  start: string
  end?: string
  /** em reais; 0 = grátis; null = não informado */
  priceMin: number | null
  priceMax: number | null
  venue: Venue
  image?: string
}

export interface EventsFile {
  generatedAt: string
  city: string
  events: RoleEvent[]
}

export const CATEGORIES: { id: Category; label: string; color: string }[] = [
  { id: 'festa', label: 'Festa', color: '#ff3d81' },
  { id: 'show', label: 'Show', color: '#8b5cf6' },
  { id: 'bar', label: 'Bar / Boteco', color: '#f59e0b' },
  { id: 'standup', label: 'Stand-up', color: '#22d3ee' },
  { id: 'teatro', label: 'Teatro', color: '#34d399' },
  { id: 'cultura', label: 'Cultura', color: '#a3e635' },
  { id: 'outro', label: 'Outro', color: '#94a3b8' },
]

export const categoryColor = (c: Category) =>
  CATEGORIES.find((x) => x.id === c)?.color ?? '#94a3b8'
