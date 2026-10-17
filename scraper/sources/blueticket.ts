import type { Category, RoleEvent } from '../../src/lib/types'
import { classify } from '../classify'
import { geocode } from '../geocode'
import { politeFetch } from '../http'
import type { CityConfig, Source } from './types'

/**
 * Blueticket é um SPA (Nuxt) sem dados no HTML; a própria busca do site chama
 * a API pública `api2.blueticket.com.br/events/?search=`, que devolve JSON.
 * O detalhe do evento (`api2-cdn…/events/:id/detail`) traz o endereço do local,
 * mas latitude/longitude vêm nulas — geocodificamos o endereço pelo Nominatim
 * (com cache). Preço não vem em nenhum dos dois — fica null.
 * Não há robots.txt (o site devolve o index do SPA para /robots.txt).
 */

const API = 'https://api2.blueticket.com.br'
const CDN = 'https://api2-cdn.blueticket.com.br'

interface BtEvent {
  id: number
  name: string
  date: string // "2026-10-17 23:59:00", horário de Brasília
  venue: string
  cityName: string
  cityState: string
  category?: string
  slug: string
  url?: string // imagem
  indefiniteDate?: number
  venueType?: string
}

interface BtDetail {
  venue?: {
    name?: string
    address?: string
    city?: string
    state?: string
    latitude?: number | null
    longitude?: number | null
  }
}

const CATEGORY_HINT: Record<string, Category | null> = {
  Baladas: 'festa',
  Shows: 'show',
  'Shows e Festivais': 'show',
  Festivais: 'show',
  Teatro: 'teatro',
  'Teatro e Espetáculos': 'teatro',
  'Stand Up': 'standup',
  Humor: 'standup',
  Gastronomia: 'bar',
  // não é rolê noturno
  'Cursos e Workshops': null,
  Congressos: null,
  Palestras: null,
  Esportivos: null,
}

async function venueCoords(e: BtEvent): Promise<{ lat: number; lng: number; address?: string } | null> {
  const d = JSON.parse(await politeFetch(`${CDN}/events/${e.id}/detail`)) as BtDetail
  const v = d.venue
  if (v?.latitude && v?.longitude) return { lat: v.latitude, lng: v.longitude, address: v.address }
  if (!v?.address || /a definir/i.test(`${v.address} ${v.name}`)) return null
  // "Avenida X, 141- Barra Funda" → "Avenida X, 141, Barra Funda, São Paulo, SP"
  const address = v.address.replace(/\s*-\s*/, ', ')
  const hit = await geocode(`${address}, ${v.city ?? e.cityName}, ${v.state ?? e.cityState}`)
  return hit && { ...hit, address }
}

export const blueticket: Source = {
  name: 'Blueticket',
  async scrape(city: CityConfig) {
    const url = `${API}/events/?search=${encodeURIComponent(city.name.toLowerCase())}&origin=capa&pdv=100`
    const list = JSON.parse(await politeFetch(url)) as BtEvent[]
    const inCity = list.filter((e) => e.cityName === city.name && !e.indefiniteDate && e.venueType !== 'online')
    console.log(`  [blueticket] busca: ${list.length} eventos, ${inCity.length} em ${city.name}`)

    const out: RoleEvent[] = []
    for (const e of inCity) {
      const hint = e.category ? CATEGORY_HINT[e.category] : undefined
      if (hint === null) continue
      const category = classify(`${e.name} ${e.venue}`, hint)
      if (!category) continue

      let loc: Awaited<ReturnType<typeof venueCoords>>
      try {
        loc = await venueCoords(e)
      } catch (err) {
        console.warn(`  [blueticket] detalhe ${e.id} falhou: ${(err as Error).message}`)
        continue
      }
      if (!loc) continue

      out.push({
        id: `blueticket-${e.id}`,
        title: e.name.trim(),
        source: 'Blueticket',
        url: `https://www.blueticket.com.br/evento/${e.id}/${e.slug}`,
        category,
        start: `${e.date.replace(' ', 'T')}-03:00`,
        priceMin: null,
        priceMax: null,
        venue: { name: e.venue.trim(), address: loc.address, lat: loc.lat, lng: loc.lng },
        image: e.url,
      })
    }
    return out
  },
}
