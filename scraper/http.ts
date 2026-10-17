const UA = 'Mozilla/5.0 (compatible; MapaDoRoleBot/0.1; +https://github.com/) AppleWebKit/537.36 Chrome/130 Safari/537.36'

/** intervalo mínimo entre requisições para o mesmo host — não queremos sobrecarregar ninguém */
const MIN_INTERVAL_MS = 1200
const lastHit = new Map<string, number>()

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function politeFetch(url: string, init: RequestInit = {}, retries = 2): Promise<string> {
  const host = new URL(url).host
  const wait = (lastHit.get(host) ?? 0) + MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await sleep(wait)
  lastHit.set(host, Date.now())

  const res = await fetch(url, {
    ...init,
    headers: { 'user-agent': UA, 'accept-language': 'pt-BR,pt;q=0.9', ...init.headers },
  })
  if (res.status === 429 || res.status >= 500) {
    if (retries > 0) {
      await sleep(5000)
      return politeFetch(url, init, retries - 1)
    }
  }
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.text()
}
