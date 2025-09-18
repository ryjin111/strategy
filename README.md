# Shapelection Strategy (Next.js)

Perpetual Shape Machine — Next.js app reusing the seishinz Tailwind setup.

## Quickstart

```bash
cd strategy
npm install
npm run dev
# open http://localhost:3000
```

## Structure

- `app/` Next.js App Router pages and API routes
- `app/api/state` and `app/api/action` provide demo endpoints with in-memory state
- `tailwind.config.js`, `postcss.config.js`, `app/globals.css` for styling
- `next.config.js` mirrors seishinz config for compatibility

## References

- Reference UI/flow: [`https://www.punkstrategy.fun/app`](https://www.punkstrategy.fun/app)
- Social reference: [`https://x.com/token_works/status/1968361945226166754`](https://x.com/token_works/status/1968361945226166754) 

## Analytics API

- Endpoint: `GET /api/analytics?source=opensea&slug={collectionSlug}`
  - Optional env vars:
    - `OPENSEA_API_KEY` — if set, included as `X-API-KEY`
    - `OPENSEA_API_BASE` — defaults to `https://api.opensea.io`
  - Returns normalized stats `{ floorEth, listedCount, oneDayVolume, oneDaySales, sevenDayVolume, sevenDaySales }` and a `raw` payload.

- Placeholder: `GET /api/analytics?source=shape` returns 501 with a note to wire up Shape MCP.
  - See the Shape MCP client demo for patterns: `https://github.com/shape-network/mcp-client-demo` 