const config = globalThis.__shapelection_config || (globalThis.__shapelection_config = {
  holdingsEth: 0.010,
  collections: [],
  activeCollectionIndex: 0,
  rewardMultiplier: 0.02,
  holdings: [],
  sales: [],
});

async function fetchCollectionFloor(request, slug) {
  if (!slug) return 0;
  const base = new URL(request.url);
  const endpoint = new URL(`/api/analytics?source=opensea&slug=${encodeURIComponent(slug)}`, base.origin);
  const res = await fetch(endpoint.href, { next: { revalidate: 60 } });
  if (!res.ok) return 0;
  const json = await res.json();
  return Number(json?.stats?.floorEth || 0);
}

async function enrichCollectionsWithFloors(request, collections) {
  const results = await Promise.all((collections || []).map(async (c) => {
    const floorEth = await fetchCollectionFloor(request, c.slug);
    return { ...c, floorEth: Number.isFinite(floorEth) ? floorEth : 0 };
  }));
  return results;
}

function derive(state, collectionsWithFloors) {
  const safeCollections = collectionsWithFloors || state.collections || [];
  const active = safeCollections[state.activeCollectionIndex] || safeCollections[0] || { name: '—', floorEth: 0 };
  const goalEth = Number(active.floorEth || 0);
  const rewardEth = Math.max(0.001, +(goalEth * (state.rewardMultiplier || 0.02)).toFixed(3));
  const progressPercent = goalEth > 0 ? Math.min(100, (state.holdingsEth / goalEth) * 100) : 0;
  const cheapestShape = `${active.name} — ${goalEth.toFixed(3)} ETH`;
  return { ...state, collections: safeCollections, goalEth, rewardEth, progressPercent, cheapestShape };
}

export async function GET(request) {
  try {
    const collectionsWithFloors = await enrichCollectionsWithFloors(request, config.collections || []);
    return Response.json(derive(config, collectionsWithFloors));
  } catch (e) {
    return new Response(JSON.stringify({ message: 'Failed to load state', error: String(e?.message || e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
} 