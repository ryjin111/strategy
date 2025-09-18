const config = globalThis.__shapelection_config || (globalThis.__shapelection_config = {
  holdingsEth: 0.010,
  collections: [],
  activeCollectionIndex: 0,
  rewardMultiplier: 0.02,
  holdings: [],
  sales: [],
});

function activeCollection() {
  return config.collections[config.activeCollectionIndex] || config.collections[0] || null;
}

function rotateCollectionIfThreshold() {
  const col = activeCollection();
  if (!col) return;
  if (typeof col.acquireThreshold === 'number' && typeof col.acquiredCount === 'number' && col.acquiredCount >= col.acquireThreshold) {
    if (config.collections.length > 0) {
      config.activeCollectionIndex = (config.activeCollectionIndex + 1) % config.collections.length;
    }
  }
}

async function fetchActiveFloor(request) {
  const col = activeCollection();
  if (!col || !col.slug) return 0;
  const base = new URL(request.url);
  const endpoint = new URL(`/api/analytics?source=opensea&slug=${encodeURIComponent(col.slug)}`, base.origin);
  const res = await fetch(endpoint.href, { next: { revalidate: 60 } });
  if (!res.ok) return 0;
  const json = await res.json();
  return Number(json?.stats?.floorEth || 0);
}

function derive(goalEthOverride) {
  const col = activeCollection() || { name: '—' };
  const goalEth = Number.isFinite(goalEthOverride) ? goalEthOverride : Number(col.floorEth || 0);
  const rewardEth = Math.max(0.001, +(goalEth * (config.rewardMultiplier || 0.02)).toFixed(3));
  const progressPercent = goalEth > 0 ? Math.min(100, (config.holdingsEth / goalEth) * 100) : 0;
  const cheapestShape = `${col.name} — ${goalEth.toFixed(3)} ETH`;
  return { ...config, goalEth, rewardEth, progressPercent, cheapestShape };
}

export async function POST(request) {
  const body = await request.json();
  const action = body?.action;
  let message = 'OK';

  if (action === 'buy-floor') {
    const goal = await fetchActiveFloor(request);
    if (!activeCollection()) {
      return new Response(JSON.stringify({ message: 'No active collection configured', state: derive(goal) }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (!goal || goal <= 0) {
      return new Response(JSON.stringify({ message: 'Unable to determine live floor price', state: derive(goal) }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }
    if (config.holdingsEth >= goal) {
      config.holdingsEth -= goal;
      const id = Date.now().toString(36).slice(-6).toUpperCase();
      const col = activeCollection();
      col.acquiredCount = (col.acquiredCount || 0) + 1;
      config.holdings.unshift({ title: `${col.name} #${id}`, subtitle: `Acquired for ${goal.toFixed(3)} ETH` });
      message = 'Floor NFT purchased';
      rotateCollectionIfThreshold();
    } else {
      const missing = Math.max(0, goal - config.holdingsEth);
      return new Response(JSON.stringify({ message: `Insufficient funds. Missing ${missing.toFixed(3)} ETH`, state: derive(goal) }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
  } else if (action === 'process-sale') {
    if (config.holdings.length === 0) {
      return new Response(JSON.stringify({ message: 'No holdings to sell', state: derive() }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const sold = config.holdings.shift();
    const goal = await fetchActiveFloor(request);
    const proceeds = (goal > 0 ? goal : 0.05) * (1 + Math.random() * 0.15);
    config.holdingsEth += proceeds;
    config.sales.unshift({ title: sold.title, subtitle: `Sold for ${proceeds.toFixed(3)} ETH` });
    message = 'Sale processed';
  } else if (action === 'buy-burn') {
    const spend = Math.min(config.holdingsEth * 0.02, 0.25);
    if (spend <= 0.001) {
      return new Response(JSON.stringify({ message: 'Not enough treasury to buy and burn', state: derive() }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    config.holdingsEth -= spend;
    message = `Executed buy & burn of ~${spend.toFixed(3)} ETH`;
  } else if (action === 'set-collection') {
    const id = body?.id;
    const idx = (config.collections || []).findIndex(c => c.id === id);
    if (idx >= 0) config.activeCollectionIndex = idx;
    message = 'Active collection updated';
  } else {
    return new Response(JSON.stringify({ message: 'Unknown action', state: derive() }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const liveGoal = await fetchActiveFloor(request);
  return Response.json({ message, state: derive(liveGoal) });
} 