export async function GET(request) {
  const url = new URL(request.url);
  const address = (url.searchParams.get('address') || '').trim().toLowerCase();
  const chain = (url.searchParams.get('chain') || 'ethereum').toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(address)) {
    return new Response(JSON.stringify({ message: 'Invalid address' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const apiBase = process.env.OPENSEA_API_BASE || 'https://api.opensea.io';
  const headers = {};
  if (process.env.OPENSEA_API_KEY) headers['X-API-KEY'] = process.env.OPENSEA_API_KEY;

  async function tryFetch(urlStr) {
    const res = await fetch(urlStr, { headers, next: { revalidate: 120 } });
    if (!res.ok) return null;
    try { return await res.json(); } catch { return null; }
  }

  let name = null;
  let slug = null;
  let raw = {};

  // Attempt 1: Get a sample NFT from the contract and read its collection info
  const nftsUrl = `${apiBase}/api/v2/chain/${encodeURIComponent(chain)}/contract/${address}/nfts?limit=1`;
  const nftsJson = await tryFetch(nftsUrl);
  if (nftsJson && (nftsJson.nfts?.length || 0) > 0) {
    const item = nftsJson.nfts[0];
    raw.nftSample = item;
    const c = item?.collection || {};
    name = c.name || name;
    slug = c.slug || slug;
  }

  // Attempt 2: Collections search by contract address (if available)
  if (!slug) {
    const collectionsUrl = `${apiBase}/api/v2/collections?contract_address=${address}&limit=1`;
    const colsJson = await tryFetch(collectionsUrl);
    if (colsJson && (colsJson.collections?.length || 0) > 0) {
      const col = colsJson.collections[0];
      raw.collections = colsJson.collections;
      name = col.name || name;
      slug = col.slug || slug;
    }
  }

  if (!slug) {
    return new Response(JSON.stringify({ message: 'Could not resolve collection from address', chain, address, raw }), { status: 404, headers: { 'Content-Type': 'application/json' } });
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