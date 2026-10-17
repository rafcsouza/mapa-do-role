import type { RoleEvent } from '../src/lib/types'
import { CITY, OUT, writeEvents } from './output'
import { sympla } from './sources/sympla'
import type { Source } from './sources/types'

/** adicione novas ticketeiras aqui (Eventim, Ingresso Rápido, Shotgun, Ticket360…) */
const SOURCES: Source[] = [sympla]

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** mesmo título + mesmo dia + mesmo local = mesmo evento vendido em lugares diferentes */
const dedupeKey = (e: RoleEvent) =>
  `${e.title.toLowerCase().replace(/\W+/g, '')}|${e.start.slice(0, 10)}|${e.venue.lat.toFixed(3)},${e.venue.lng.toFixed(3)}`

async function main() {
  const all: RoleEvent[] = []
  for (const src of SOURCES) {
    console.log(`→ ${src.name}`)
    try {
      const evs = await src.scrape(CITY)
      console.log(`  ${evs.length} eventos`)
      all.push(...evs)
    } catch (err) {
      console.error(`  ${src.name} falhou:`, err)
    }
  }

  const now = Date.now()
  const seen = new Set<string>()
  const events = all.filter((e) => {
    if (new Date(e.end ?? e.start).getTime() < now) return false
    // eventos de vários dias (cursos, temporadas) poluem o "agora"
    if (e.end && new Date(e.end).getTime() - new Date(e.start).getTime() > 2 * 86400_000) return false
    if (distanceKm(CITY.center, e.venue) > CITY.radiusKm) return false
    const k = dedupeKey(e)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  await writeEvents(events)
  console.log(`✓ ${events.length} eventos salvos em ${OUT}`)
}

main()
