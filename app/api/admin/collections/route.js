const config = globalThis.__shapelection_config || (globalThis.__shapelection_config = {
  holdingsEth: 0.010,
  collections: [],
  activeCollectionIndex: 0,
  rewardMultiplier: 0.02,
  holdings: [],
  sales: [],
});

export async function GET() {
  return Response.json({ collections: config.collections || [], activeCollectionIndex: config.activeCollectionIndex || 0 });
}

export async function POST(request) {
  const body = await request.json();
  const id = (body.id || body.slug || '').toString().trim();
  const name = (body.name || '').toString().trim();
  const slug = (body.slug || '').toString().trim();
  const acquireThreshold = Number(body.acquireThreshold || 1);

  if (!id || !name || !slug) {
    return new Response(JSON.stringify({ message: 'Missing required fields: id/name/slug' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const existingIdx = (config.collections || []).findIndex(c => c.id === id);
  if (existingIdx >= 0) {
    const existing = config.collections[existingIdx];
    config.collections[existingIdx] = { ...existing, name, slug, acquireThreshold: Number.isFinite(acquireThreshold) ? acquireThreshold : existing.acquireThreshold };
  } else {
    config.collections.push({ id, name, slug, acquireThreshold: Number.isFinite(acquireThreshold) ? acquireThreshold : 1, acquiredCount: 0 });
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