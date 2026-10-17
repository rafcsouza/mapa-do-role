import type { RoleEvent } from '../../src/lib/types'

export interface CityConfig {
  /** nome exibido */
  name: string
  /** slug usado pelas ticketeiras, ex.: sao-paulo-sp */
  slug: string
  center: { lat: number; lng: number }
  /** eventos mais longe que isso do centro são descartados */
  radiusKm: number
}

export interface Source {
  name: string
  scrape(city: CityConfig): Promise<RoleEvent[]>
}
