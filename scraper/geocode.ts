import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { politeFetch } from './http'

/**
 * Geocodificação pelo Nominatim (OpenStreetMap). A política de uso permite
 * uso leve: no máximo 1 req/s (o politeFetch já espaça por host), User-Agent
 * identificando o app e cache dos resultados — por isso o cache em disco.
 * Dados © OpenStreetMap contributors, ODbL.
 * https://operations.osmfoundation.org/policies/nominatim/
 */

const CACHE_FILE = resolve(import.meta.dirname, '.cache/geocode.json')
type Hit = { lat: number; lng: number } | null
let cache: Record<string, Hit> | undefined

async function load() {
  if (cache) return cache
  try {
    cache = JSON.parse(await readFile(CACHE_FILE, 'utf8'))
  } catch {
    cache = {}
  }
  return cache!
}

export async function saveGeocodeCache() {
  if (!cache) return
  await mkdir(dirname(CACHE_FILE), { recursive: true })
  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 1))
}

export async function geocode(query: string): Promise<Hit> {
  const c = await load()
  const key = query.toLowerCase().trim()
  if (key in c) return c[key]
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`
  let hit: Hit = null
  try {
    const [r] = JSON.parse(await politeFetch(url)) as { lat: string; lon: string }[]
    if (r) hit = { lat: Number(r.lat), lng: Number(r.lon) }
  } catch (err) {
    console.warn(`  [geocode] falhou "${query}": ${(err as Error).message}`)
    return null // não cacheia erro de rede
  }
  c[key] = hit
  return hit
}
