import type { Category } from '../src/lib/types'

const strip = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** ordem importa: a primeira regra que bater define a categoria */
const RULES: [Category, RegExp][] = [
  ['standup', /\b(stand ?up|standup|comedia|comedy|humor|humorista|improviso)\b/],
  ['teatro', /\b(teatro|peca|espetaculo|musical|danca|ballet|bale|circo|opera)\b/],
  ['festa', /\b(festa|balada|baile|rave|techno|house music|open bar|after|funk|sertanejo universitario|pagode|samba|forro|dj|b2b|club|clube|bloco|pre ?carnaval|halloween)\b/],
  ['show', /\b(show|ao vivo|turne|tour|tributo|cover|banda|quarteto|trio|orquestra|concerto|recital|jazz|blues|rock|mpb|rap|festival|acustico)\b/],
  ['bar', /\b(bar|boteco|happy hour|chopp|cervej|drinks?|degustacao|wine|vinho|karaoke|quiz|pub)\b/],
  ['cultura', /\b(exposicao|mostra|museu|cinema|filme|sarau|poesia|literatura|feira|visita guiada|tour guiado|galeria)\b/],
]

/** termos que indicam algo que não é rolê noturno (cursos, palestras, workshops) */
const NOT_ROLE = /\b(curso|workshop|palestra|imersao|treinamento|mentoria|congresso|seminario|aula|retiro|webinar|capacitacao|certificacao|simulado|vestibular|corrida|caminhada|missa|culto|encontro de casais)\b/

export function classify(text: string, hint?: Category): Category | null {
  const t = strip(text)
  if (NOT_ROLE.test(t)) return null
  for (const [cat, re] of RULES) if (re.test(t)) return cat
  // sem palavra-chave e sem dica da listagem: provavelmente não é rolê (palestra, consulta, etc.)
  return hint ?? null
}
