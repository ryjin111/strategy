const config = globalThis.__shapelection_config || (globalThis.__shapelection_config = {
  holdingsEth: 0.010,
  collections: [],
  activeCollectionIndex: 0,
  rewardMultiplier: 0.02,
  holdings: [],
  sales: [],
});

async function resolveByAddress(request, address) {
  const base = new URL(request.url);
  const res = await fetch(new URL(`/api/resolve-collection?address=${address}&chain=shape`, base.origin), { next: { revalidate: 60 } });
  const json = await res.json();
  return { ok: res.ok, data: json };
}

async function fetchShapeFloor(request, address) {
  const base = new URL(request.url);
  const res = await fetch(new URL(`/api/analytics?source=shape&address=${address}`, base.origin), { next: { revalidate: 60 } });
  const json = await res.json();
  return { ok: res.ok, data: json };
}

export async function GET() {
  return Response.json({ collections: config.collections || [], activeCollectionIndex: config.activeCollectionIndex || 0 });
}

export async function POST(request) {
  const body = await request.json();
  const contractAddress = (body.contractAddress || body.address || '').toString().trim().toLowerCase();
  const acquireThreshold = Number(body.acquireThreshold || 1);

  if (!/^0x[a-f0-9]{40}$/.test(contractAddress)) {
    return new Response(JSON.stringify({ message: 'Missing or invalid contract address' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  let id = (body.id || '').toString().trim();
  let name = (body.name || '').toString().trim();
  let slug = (body.slug || '').toString().trim();

  // Auto-resolve if missing
  if (!name || !slug) {
    const r = await resolveByAddress(request, contractAddress);
    if (r.ok) {
      name = name || r.data?.name || '';
      slug = slug || r.data?.slug || '';
      if (!id && slug) id = slug.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
    }
  }

  // Fallback ID from address
  if (!id) id = contractAddress.slice(0, 10);

  const floor = await fetchShapeFloor(request, contractAddress);
  const floorEth = Number(floor?.data?.stats?.floorEth || floor?.data?.floorEth || 0);

  const existingIdx = (config.collections || []).findIndex(c => c.contractAddress?.toLowerCase() === contractAddress);
  if (existingIdx >= 0) {
    const existing = config.collections[existingIdx];
    config.collections[existingIdx] = { ...existing, id: existing.id || id, name: name || existing.name, slug: slug || existing.slug, contractAddress, chain: 'shape', acquireThreshold: Number.isFinite(acquireThreshold) ? acquireThreshold : existing.acquireThreshold, floorEth: floorEth || existing.floorEth };
  } else {
    config.collections.push({ id, name, slug, contractAddress, chain: 'shape', acquireThreshold: Number.isFinite(acquireThreshold) ? acquireThreshold : 1, acquiredCount: 0, floorEth: floorEth || 0 });
    if (config.collections.length === 1) config.activeCollectionIndex = 0;
  }

  return Response.json({ message: 'Saved', collections: config.collections, activeCollectionIndex: config.activeCollectionIndex });
}

export async function PATCH(request) {
  const body = await request.json();
  const id = (body.id || '').toString().trim();
  const idx = (config.collections || []).findIndex(c => c.id === id);
  if (idx < 0) {
    return new Response(JSON.stringify({ message: 'Collection not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const col = config.collections[idx];
  if (typeof body.name === 'string') col.name = body.name;
  if (typeof body.slug === 'string') col.slug = body.slug;
  if (typeof body.contractAddress === 'string') col.contractAddress = body.contractAddress.toLowerCase();
  col.chain = 'shape';
  if (typeof body.acquireThreshold !== 'undefined') col.acquireThreshold = Number(body.acquireThreshold) || 1;
  if (typeof body.acquiredCount !== 'undefined') col.acquiredCount = Math.max(0, Number(body.acquiredCount) || 0);
  if (typeof body.active !== 'undefined' && body.active) config.activeCollectionIndex = idx;

  return Response.json({ message: 'Updated', collections: config.collections, activeCollectionIndex: config.activeCollectionIndex });
}

export async function DELETE(request) {
  const body = await request.json();
  const id = (body.id || '').toString().trim();
  const idx = (config.collections || []).findIndex(c => c.id === id);
  if (idx < 0) {
    return new Response(JSON.stringify({ message: 'Collection not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  config.collections.splice(idx, 1);
  if (config.activeCollectionIndex >= config.collections.length) {
    config.activeCollectionIndex = Math.max(0, config.collections.length - 1);
  }

  return Response.json({ message: 'Deleted', collections: config.collections, activeCollectionIndex: config.activeCollectionIndex });
} 