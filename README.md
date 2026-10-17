# Mapa do Rolê

Mapa noturno com os rolês da cidade: pontos por categoria, mapa de calor e filtros de horário, preço e categoria.

## Rodando

```bash
npm install
npm run scrape   # busca eventos reais (Sympla) → public/data/events.json
npm run dev      # http://localhost:5173
```

`npm run seed` gera eventos fictícios para desenvolver a interface sem depender do scraper.

## Estrutura

- `src/` — front (React + MapLibre, tema escuro CARTO). Lê `public/data/events.json`.
- `src/lib/filters.ts` — lógica de "agora / hoje / fim de semana", horário e preço.
- `scraper/` — coleta das ticketeiras. Cada fonte implementa `Source` em `scraper/sources/`.
  - `sympla.ts` lê o payload que a própria página de listagem da Sympla já entrega (com lat/lon).
  - `classify.ts` categoriza por palavras-chave e descarta o que não é rolê (cursos, palestras…).
- Cidade configurada em `scraper/output.ts`.

## Limitações atuais

- Só Sympla por enquanto; preço não vem estruturado na listagem dela, então aparece "não informado".
- Os dados são um JSON estático: precisa rodar `npm run scrape` periodicamente (cron/CI) para atualizar.
