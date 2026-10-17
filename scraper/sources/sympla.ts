import type { Category, RoleEvent } from '../../src/lib/types'
import { classify } from '../classify'
import { politeFetch } from '../http'
import type { CityConfig, Source } from './types'

/**
 * A Sympla (Next.js) já manda os eventos da listagem no payload RSC do HTML
 * (`self.__next_f.push(...)`), com nome, datas, imagem e lat/lon do local.
 * Lemos esse payload em vez de depender de seletores CSS.
 * Preço não vem na listagem nem estruturado na página do evento — fica null.
 */

interface SymplaEvent {
  id: number
  name: string
  url: string
  start_date: string
  end_date?: string
  images?: { original?: string; lg?: string; xs?: string }
  location?: {
    name?: string
    address?: string
    address_num?: string
    neighborhood?: string
    city?: string
    lat?: number
    lon?: number
  }
}

/** listagens a percorrer: [caminho, páginas, categoria sugerida] */
const LISTINGS: [string, number, Category | undefined][] = [
  ['show-musica-festa', 8, 'show'],
  ['teatro-espetaculo', 4, 'teatro'],
  ['', 6, undefined],
]

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

/** acha objetos JSON que contêm `"event_type"` casando chaves a partir dele */
function extractEvents(payload: string): SymplaEvent[] {
  const found: SymplaEvent[] = []
  let i = 0
  while ((i = payload.indexOf('"event_type"', i)) !== -1) {
    let depth = 0
    let start = i
    for (; start >= 0; start--) {
      const c = payload[start]
      if (c === '}') depth++
      else if (c === '{') {
        if (depth === 0) break
        depth--
      }
    }
    depth = 0
    let end = start
    for (; end < payload.length; end++) {
      const c = payload[end]
      if (c === '{') depth++
      else if (c === '}' && --depth === 0) break
    }
    try {
      const obj = JSON.parse(payload.slice(start, end + 1))
      if (obj.id && obj.name && obj.start_date) found.push(obj)
    } catch {
      /* não era um evento completo */
    }
    i = Math.max(end, i + 1)
  }
  return found
}

function toRoleEvent(e: SymplaEvent, hint?: Category): RoleEvent | null {
  const loc = e.location
  if (!loc?.lat || !loc?.lon) return null
  // "Local a definir" e eventos online vêm com coordenada genérica do centro da cidade
  if (!loc.address || /a definir|online/i.test(loc.name ?? '')) return null

  const category = classify(`${e.name} ${loc.name ?? ''}`, hint)
  if (!category) return null

  const address = [loc.address, loc.address_num && loc.address_num !== '0' ? loc.address_num : null, loc.neighborhood]
    .filter(Boolean)
    .join(', ')

  return {
    id: `sympla-${e.id}`,
    title: e.name.trim(),
    source: 'Sympla',
    url: e.url,
    category,
    start: e.start_date,
    end: e.end_date,
    priceMin: null,
    priceMax: null,
    venue: { name: loc.name?.trim() || 'Local', address, lat: loc.lat, lng: loc.lon },
    image: e.images?.lg || e.images?.original,
  }
}

export const sympla: Source = {
  name: 'Sympla',
  async scrape(city: CityConfig) {
    const byId = new Map<string, RoleEvent>()
    for (const [path, pages, hint] of LISTINGS) {
      for (let page = 1; page <= pages; page++) {
        const url = `https://www.sympla.com.br/eventos/${city.slug}${path ? `/${path}` : ''}${page > 1 ? `?page=${page}` : ''}`
        let raw: SymplaEvent[]
        try {
          raw = extractEvents(extractRscPayload(await politeFetch(url)))
        } catch (err) {
          console.warn(`  [sympla] falhou ${url}: ${(err as Error).message}`)
          break
        }
        if (!raw.length) break
        let added = 0
        for (const e of raw) {
          const ev = toRoleEvent(e, hint)
          if (ev && !byId.has(ev.id)) {
            byId.set(ev.id, ev)
            added++
          }
        }
        console.log(`  [sympla] ${path || 'geral'} p${page}: ${raw.length} lidos, ${added} novos`)
      }
    }
    return [...byId.values()]
  },
}
