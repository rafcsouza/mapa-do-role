import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import type { EventsFile, RoleEvent } from '../src/lib/types'
import type { CityConfig } from './sources/types'

export const CITY: CityConfig = {
  name: 'São Paulo',
  slug: 'sao-paulo-sp',
  center: { lat: -23.5613, lng: -46.6559 },
  radiusKm: 45,
}

export const OUT = resolve(import.meta.dirname, '../public/data/events.json')

export async function writeEvents(events: RoleEvent[], city = CITY) {
  const file: EventsFile = { generatedAt: new Date().toISOString(), city: city.name, events }
  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(file))
}
