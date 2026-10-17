import type { Category, RoleEvent } from '../../src/lib/types'
import { classify } from '../classify'
import { politeFetch } from '../http'
import type { CityConfig, Source } from './types'

/**
 * Ticket360 (Next.js). A página da cidade traz no payload RSC a lista de
 * eventos com id, título, local, data e hora ("22h30"). Coordenadas e preço só
 * aparecem no JSON-LD (schema.org Event) da página de cada evento, então
 * buscamos uma a uma — o politeFetch espaça as requisições.
 * robots.txt: `Allow: /`.
 */

const BASE = 'https://www.ticket360.com.br'
/** teto de páginas de evento por execução, para não martelar o site */
const MAX_EVENTS = 150

interface ListedEvent {
  id: string
  slug: string
  title: string
  venue: string
  city: string
  uf: string
  date: string
  time?: string
  image?: string
}

interface LdEvent {
  '@type': string
  name: string
  url: string
  startDate: string
  endDate?: string
  image?: string | string[]
  location?: {
    name?: string
    address?: { streetAddress?: string; addressLocality?: string }
    geo?: { latitude?: number; longitude?: number }
  }
  offers?: { lowPrice?: number; highPrice?: number; price?: number } | { price?: number }[]
}

const LD_HINT: Record<string, Category> = {
  MusicEvent: 'show',
  TheaterEvent: 'teatro',
  ComedyEvent: 'standup',
  DanceEvent: 'festa',
  ExhibitionEvent: 'cultura',
}

function extractRscPayload(html: string): string {
  const re = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g
  let out = ''
  for (const m of html.matchAll(re)) {
    try {
      out += JSON.parse(m[1])
    } catch {
      /* chunk malformado, ignora */
    }
  }
  return out
}

/** os cards da listagem são objetos planos (sem chaves aninhadas) com "dateLabel" */
function extractListing(payload: string): ListedEvent[] {
  const out: ListedEvent[] = []
  for (const m of payload.matchAll(/\{[^{}]*"dateLabel"[^{}]*\}/g)) {
    try {
      const o = JSON.parse(m[0])
      if (o.id && o.slug && o.title && /^\d{4}-\d{2}-\d{2}$/.test(o.date)) out.push(o)
    } catch {
      /* ignora */
    }
  }
  return out
}

function extractLdEvent(html: string): LdEvent | undefined {
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(m[1])
      const ev = (Array.isArray(data) ? data : [data]).find((x) => /Event$/.test(x?.['@type'] ?? ''))
      if (ev) return ev
    } catch {
      /* ignora */
    }
  }
}

function prices(offers: LdEvent['offers']): [number | null, number | null] {
  const list = Array.isArray(offers) ? offers : offers ? [offers] : []
  const vals = list.flatMap((o) =>
    [(o as { lowPrice?: number }).lowPrice, (o as { highPrice?: number }).highPrice, o.price].filter(
      (v): v is number => typeof v === 'number' && Number.isFinite(v),
    ),
  )
  return vals.length ? [Math.min(...vals), Math.max(...vals)] : [null, null]
}

function toRoleEvent(l: ListedEvent, ld: LdEvent): RoleEvent | null {
  const geo = ld.location?.geo
  if (!geo?.latitude || !geo?.longitude) return null

  const category = classify(`${l.title} ${l.venue}`, LD_HINT[ld['@type']])
  if (!category) return null

  const hm = l.time?.match(/^(\d{1,2})h(\d{2})?$/)
  const start = hm ? `${l.date}T${hm[1].padStart(2, '0')}:${hm[2] ?? '00'}:00-03:00` : `${l.date}T20:00:00-03:00`
  const [priceMin, priceMax] = prices(ld.offers)
  const img = Array.isArray(ld.image) ? ld.image[0] : ld.image

  return {
    id: `ticket360-${l.id}`,
    title: l.title.trim(),
    source: 'Ticket360',
    url: `${BASE}/evento/${l.id}/${l.slug}`,
    category,
    start,
    priceMin,
    priceMax,
    venue: {
      name: ld.location?.name?.trim() || l.venue,
      address: ld.location?.address?.streetAddress,
      lat: geo.latitude,
      lng: geo.longitude,
    },
    image: l.image || img,
  }
}

export const ticket360: Source = {
  name: 'Ticket360',
  async scrape(city: CityConfig) {
    const [citySlug, uf] = [city.slug.replace(/-[a-z]{2}$/, ''), city.slug.slice(-2)]
    const listing = extractListing(extractRscPayload(await politeFetch(`${BASE}/cidade/${uf}/${citySlug}`)))

    const byId = new Map<string, ListedEvent>()
    for (const l of listing) if (l.city === city.name && !byId.has(l.id)) byId.set(l.id, l)
    console.log(`  [ticket360] listagem: ${listing.length} cards, ${byId.size} eventos únicos em ${city.name}`)

    const out: RoleEvent[] = []
    for (const l of [...byId.values()].slice(0, MAX_EVENTS)) {
      const url = `${BASE}/evento/${l.id}/${l.slug}`
      try {
        const ld = extractLdEvent(await politeFetch(url))
        const ev = ld && toRoleEvent(l, ld)
        if (ev) out.push(ev)
      } catch (err) {
        console.warn(`  [ticket360] falhou ${url}: ${(err as Error).message}`)
      }
    }
    return out
  },
}
