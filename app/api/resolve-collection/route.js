function normalizeChain(input) {
  const v = (input || '').toString().toLowerCase();
  if (v === 'eth' || v === 'ethereum' || v === 'mainnet') return 'ethereum';
  if (v === 'polygon' || v === 'matic') return 'matic';
  if (v === 'base') return 'base';
  if (v === 'arbitrum' || v === 'arb') return 'arbitrum';
  if (v === 'optimism' || v === 'op') return 'optimism';
  return v || 'ethereum';
}

export async function GET(request) {
  const url = new URL(request.url);
  const address = (url.searchParams.get('address') || '').trim().toLowerCase();
  const chain = 'shape';
  if (!/^0x[a-f0-9]{40}$/.test(address)) {
    return new Response(JSON.stringify({ message: 'Invalid address' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (chain === 'shape') {
    // Try Shape analytics endpoint for minimal resolution; if not configured, return floor 0 and unknown metadata.
    const shapeAnalyticsBase = process.env.SHAPE_ANALYTICS_URL;
    if (shapeAnalyticsBase) {
      try {
        const endpoint = `${shapeAnalyticsBase.replace(/\/$/, '')}/resolve?address=${address}`;
        const res = await fetch(endpoint, { next: { revalidate: 60 } });
        const json = await res.json();
        const name = json?.name || null;
        const slug = json?.slug || null;
        const floorEth = Number(json?.floorEth || 0);
        return Response.json({ name, slug, address, chain, floorEth, stats: { floorEth }, raw: json });
      } catch {}
    }
    return Response.json({ name: null, slug: null, address, chain, floorEth: 0, stats: { floorEth: 0 } });
  }

  const apiBase = process.env.OPENSEA_API_BASE || 'https://api.opensea.io';
  const headers = {};
  if (process.env.OPENSEA_API_KEY) headers['X-API-KEY'] = process.env.OPENSEA_API_KEY;

  async function tryFetch(urlStr) {
    const res = await fetch(urlStr, { headers, next: { revalidate: 120 } });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { ok: res.ok, status: res.status, text, json };
  }

  let name = null;
  let slug = null;
  const raw = {};

  // Attempt 0: Contract metadata endpoint (if available)
  const contractMetaUrl = `${apiBase}/api/v2/chain/${encodeURIComponent(chain)}/contract/${address}`;
  {
    const r = await tryFetch(contractMetaUrl);
    raw.contractMeta = r.json || r.text;
    const c = r.json?.collection || {};
    name = c.name || name;
    slug = c.slug || slug;
  }

  // Attempt 1: Sample NFT then infer collection
  if (!slug) {
    const nftsUrl = `${apiBase}/api/v2/chain/${encodeURIComponent(chain)}/contract/${address}/nfts?limit=1`;
    const r = await tryFetch(nftsUrl);
    raw.nftSample = r.json || r.text;
    const item = r.json?.nfts?.[0];
    if (item) {
      const c = item.collection || {};
      name = c.name || name;
      slug = c.slug || slug;
    }
  }

  // Attempt 2: Collections search by contract address (+chain hint if supported)
  if (!slug) {
    const collectionsUrl = `${apiBase}/api/v2/collections?contract_address=${address}&chain=${encodeURIComponent(chain)}&limit=1`;
    const r = await tryFetch(collectionsUrl);
    raw.collections = r.json || r.text;
    const col = r.json?.collections?.[0];
    if (col) {
      name = col.name || name;
      slug = col.slug || slug;
    }
  }

  if (!slug) {
    const hint = process.env.OPENSEA_API_KEY ? undefined : ' Missing OPENSEA_API_KEY may cause OpenSea v2 to deny requests.';
    return new Response(JSON.stringify({ message: `Could not resolve collection from address.${hint || ''}`.trim(), chain, address, raw }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  // Fetch current floor using our analytics endpoint
  try {
    const base = new URL(request.url);
    const analyticsUrl = new URL(`/api/analytics?source=opensea&slug=${encodeURIComponent(slug)}`, base.origin);
    const statsRes = await fetch(analyticsUrl.href, { next: { revalidate: 60 } });
    const statsJson = await statsRes.json();
    const floorEth = Number(statsJson?.stats?.floorEth || 0);

    return Response.json({ name, slug, address, chain, floorEth, stats: statsJson?.stats || null, raw });
  } catch (e) {
    return Response.json({ name, slug, address, chain, floorEth: 0, raw, error: String(e?.message || e) });
  }
} 