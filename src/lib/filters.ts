import type { Category, RoleEvent } from './types'

export type When = 'agora' | 'hoje' | 'fds' | 'todos'

export interface Filters {
  query: string
  categories: Category[] // vazio = todas
  when: When
  /** faixa de horário de início, em horas (0–24); fim > 24 permite madrugada */
  hourFrom: number
  hourTo: number
  maxPrice: number | null // null = sem limite
  freeOnly: boolean
}

export const DEFAULT_FILTERS: Filters = {
  query: '',
  categories: [],
  when: 'hoje',
  hourFrom: 18,
  hourTo: 30,
  maxPrice: null,
  freeOnly: false,
}

const HOUR = 3600_000
/** duração assumida quando a fonte não informa o fim */
const DEFAULT_DURATION = 5 * HOUR

export const eventEnd = (e: RoleEvent) =>
  e.end ? new Date(e.end).getTime() : new Date(e.start).getTime() + DEFAULT_DURATION

export const isHappeningNow = (e: RoleEvent, now = Date.now()) =>
  new Date(e.start).getTime() <= now && now < eventEnd(e)

/** "noite de hoje" vai até as 6h do dia seguinte */
function nightWindow(now: Date): [number, number] {
  const d = new Date(now)
  if (d.getHours() < 6) d.setDate(d.getDate() - 1)
  d.setHours(6, 0, 0, 0)
  const start = d.getTime()
  return [start, start + 24 * HOUR]
}

function weekendWindow(now: Date): [number, number] {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 dom … 6 sáb
  const toFriday = day === 0 ? -2 : day === 6 ? -1 : 5 - day
  d.setDate(d.getDate() + toFriday)
  d.setHours(18)
  const start = Math.max(d.getTime(), now.getTime() - 6 * HOUR)
  const end = new Date(d)
  end.setDate(end.getDate() + 3)
  end.setHours(6)
  return [start, end.getTime()]
}

/** hora de início em 0–30 (madrugada conta como 24+) */
function startHour(e: RoleEvent) {
  const d = new Date(e.start)
  const h = d.getHours() + d.getMinutes() / 60
  return h < 6 ? h + 24 : h
}

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function applyFilters(events: RoleEvent[], f: Filters, now = new Date()): RoleEvent[] {
  const q = normalize(f.query.trim())
  const t = now.getTime()
  return events.filter((e) => {
    if (eventEnd(e) < t) return false
    if (f.categories.length && !f.categories.includes(e.category)) return false

    if (f.when === 'agora' && !isHappeningNow(e, t)) return false
    if (f.when === 'hoje' || f.when === 'fds') {
      const [a, b] = f.when === 'hoje' ? nightWindow(now) : weekendWindow(now)
      const s = new Date(e.start).getTime()
      if (!(s < b && eventEnd(e) > a)) return false
    }

    if (f.when !== 'agora') {
      const h = startHour(e)
      if (h < f.hourFrom || h > f.hourTo) return false
    }

    if (f.freeOnly && e.priceMin !== 0) return false
    if (f.maxPrice != null && e.priceMin != null && e.priceMin > f.maxPrice) return false

    if (q && !normalize(`${e.title} ${e.venue.name} ${e.venue.address ?? ''}`).includes(q)) return false
    return true
  })
}

export function formatPrice(e: RoleEvent) {
  if (e.priceMin == null) return 'Preço não informado'
  if (e.priceMin === 0 && !e.priceMax) return 'Grátis'
  const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  if (e.priceMax && e.priceMax !== e.priceMin) return `${brl(e.priceMin)} – ${brl(e.priceMax)}`
  return e.priceMin === 0 ? 'Grátis' : brl(e.priceMin)
}

export function formatTime(e: RoleEvent, now = new Date()) {
  const d = new Date(e.start)
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (isHappeningNow(e, now.getTime())) return `Rolando agora · desde ${time}`
  const sameDay = d.toDateString() === now.toDateString()
  const day = sameDay ? 'Hoje' : d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
  return `${day} · ${time}`
}
