import type { RoleEvent } from '../src/lib/types'
import { CITY, OUT, writeEvents } from './output'
import { saveGeocodeCache } from './geocode'
import { blueticket } from './sources/blueticket'
import { sympla } from './sources/sympla'
import { ticket360 } from './sources/ticket360'
import type { Source } from './sources/types'

/**
 * adicione novas ticketeiras aqui. Avaliadas e puladas (out/2026): Shotgun
 * (checkpoint anti-bot da Vercel), Ingresso Rápido (fila de espera da
 * Cloudflare, host inexistente) e Eventim (não responde nem ao robots.txt).
 */
const SOURCES: Source[] = [sympla, ticket360, blueticket]

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

  await saveGeocodeCache()
  console.log('contagem por fonte:', Object.fromEntries(SOURCES.map((s) => [s.name, all.filter((e) => e.source === s.name).length])))

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
  const kept: Record<string, number> = {}
  for (const e of events) kept[e.source] = (kept[e.source] ?? 0) + 1
  console.log('  por fonte após filtros:', kept)
}

main()
