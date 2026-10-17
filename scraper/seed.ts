/**
 * Gera eventos fictícios a partir de hoje, espalhados pelos polos de rolê de SP.
 * Serve para desenvolver a interface sem depender do scraper.
 */
import type { Category, RoleEvent } from '../src/lib/types'
import { OUT, writeEvents } from './output'

const HOTSPOTS: { name: string; lat: number; lng: number; weight: number }[] = [
  { name: 'Augusta', lat: -23.5535, lng: -46.6573, weight: 5 },
  { name: 'Vila Madalena', lat: -23.5568, lng: -46.6912, weight: 5 },
  { name: 'Pinheiros', lat: -23.5665, lng: -46.6895, weight: 4 },
  { name: 'Barra Funda', lat: -23.5257, lng: -46.6668, weight: 3 },
  { name: 'Centro', lat: -23.5444, lng: -46.6413, weight: 4 },
  { name: 'Vila Mariana', lat: -23.5889, lng: -46.6345, weight: 2 },
  { name: 'Itaim Bibi', lat: -23.5845, lng: -46.6781, weight: 2 },
  { name: 'Bela Vista', lat: -23.5583, lng: -46.6455, weight: 2 },
  { name: 'Tatuapé', lat: -23.5403, lng: -46.5763, weight: 1 },
  { name: 'Santana', lat: -23.5016, lng: -46.6244, weight: 1 },
]

const TEMPLATES: Record<Category, { titles: string[]; venues: string[]; hours: number[]; price: [number, number] }> = {
  festa: {
    titles: ['Baile do Sereno', 'Techno na Laje', 'Noite Pop 2000', 'Pagode da Firma', 'Forró de Quinta', 'House Club Session', 'Funk Total'],
    venues: ['Club Subsolo', 'Galpão 22', 'Casa Neon', 'Terraço Alto', 'Porão Bar Club'],
    hours: [22, 23, 23, 0],
    price: [30, 120],
  },
  show: {
    titles: ['Trio de Jazz Ao Vivo', 'Tributo Legião', 'Rock Autoral na Casa', 'MPB de Bolso', 'Samba de Roda Ao Vivo'],
    venues: ['Casa de Shows Alameda', 'Teatro do Porão', 'Bourbon de Bairro', 'Palco Aberto'],
    hours: [20, 21, 21, 22],
    price: [40, 180],
  },
  bar: {
    titles: ['Happy Hour Chopp em Dobro', 'Karaokê da Vila', 'Quiz de Boteco', 'Noite do Vinil'],
    venues: ['Boteco do Zé', 'Bar da Esquina', 'Empório Lúpulo', 'Bar Balcão'],
    hours: [18, 19, 20],
    price: [0, 0],
  },
  standup: {
    titles: ['Comédia em Pé', 'Open Mic de Stand-up', 'Noite do Humor'],
    venues: ['Comedy Club SP', 'Bar do Riso'],
    hours: [20, 21, 22],
    price: [30, 70],
  },
  teatro: {
    titles: ['Peça: O Último Ato', 'Musical Noite Paulistana', 'Improviso em Cena'],
    venues: ['Teatro Pequeno', 'Espaço Cênico Augusta'],
    hours: [19, 20, 21],
    price: [40, 120],
  },
  cultura: {
    titles: ['Sarau da Lua', 'Cinema na Praça', 'Exposição Noturna'],
    venues: ['Centro Cultural', 'Galeria Aberta', 'Praça Roosevelt'],
    hours: [18, 19, 20],
    price: [0, 30],
  },
  outro: { titles: ['Feirinha Noturna'], venues: ['Largo da Batata'], hours: [18], price: [0, 0] },
}

// PRNG determinístico para o seed não mudar a cada execução
let s = 42
const rand = () => ((s = (s * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32)
const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)]
const weighted = <T extends { weight: number }>(xs: T[]) => {
  let r = rand() * xs.reduce((a, x) => a + x.weight, 0)
  for (const x of xs) if ((r -= x.weight) < 0) return x
  return xs[0]
}

const CAT_WEIGHTS: [Category, number][] = [
  ['festa', 5], ['show', 4], ['bar', 4], ['standup', 2], ['teatro', 2], ['cultura', 2], ['outro', 1],
]

const events: RoleEvent[] = []
const today = new Date()
today.setHours(0, 0, 0, 0)

for (let day = 0; day < 7; day++) {
  const perDay = [4, 5].includes(new Date(today.getTime() + day * 86400_000).getDay()) ? 60 : 30
  for (let i = 0; i < perDay; i++) {
    const cat = weighted(CAT_WEIGHTS.map(([c, weight]) => ({ c, weight }))).c
    const t = TEMPLATES[cat]
    const spot = weighted(HOTSPOTS)
    const start = new Date(today)
    start.setDate(start.getDate() + day)
    const h = pick(t.hours)
    start.setHours(h, pick([0, 0, 30]))
    if (h < 6) start.setDate(start.getDate() + 1)
    const durationH = cat === 'festa' ? 6 : cat === 'bar' ? 5 : 2
    const [lo, hi] = t.price
    const price = lo === hi ? lo : Math.round((lo + rand() * (hi - lo)) / 5) * 5
    events.push({
      id: `seed-${day}-${i}`,
      title: pick(t.titles),
      source: 'Exemplo',
      url: 'https://www.sympla.com.br',
      category: cat,
      start: start.toISOString(),
      end: new Date(start.getTime() + durationH * 3600_000).toISOString(),
      priceMin: price,
      priceMax: price && rand() > 0.5 ? price + 20 : null,
      venue: {
        name: `${pick(t.venues)} ${spot.name}`,
        address: spot.name,
        lat: spot.lat + (rand() - 0.5) * 0.014,
        lng: spot.lng + (rand() - 0.5) * 0.014,
      },
    })
  }
}

await writeEvents(events)
console.log(`✓ ${events.length} eventos de exemplo salvos em ${OUT}`)
