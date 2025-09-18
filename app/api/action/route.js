const state = globalThis.__shapelection_state || (globalThis.__shapelection_state = {
  holdingsEth: 0.010,
  collections: [
    { id: 'tri', name: 'Triangles', floorEth: 0.150, acquiredCount: 0, acquireThreshold: 3 },
    { id: 'sqr', name: 'Squares', floorEth: 0.120, acquiredCount: 0, acquireThreshold: 5 },
    { id: 'crc', name: 'Circles', floorEth: 0.090, acquiredCount: 0, acquireThreshold: 4 },
    { id: 'hex', name: 'Hexagons', floorEth: 0.200, acquiredCount: 0, acquireThreshold: 2 },
  ],
  activeCollectionIndex: 0,
  rewardMultiplier: 0.02,
  holdings: [],
  sales: [],
});

function activeCollection() {
  return state.collections[state.activeCollectionIndex] || state.collections[0];
}

function rotateCollectionIfThreshold() {
  const col = activeCollection();
  if (col.acquiredCount >= col.acquireThreshold) {
    state.activeCollectionIndex = (state.activeCollectionIndex + 1) % state.collections.length;
  }
}

function derive() {
  const goalEth = activeCollection().floorEth;
  const rewardEth = Math.max(0.001, +(goalEth * (state.rewardMultiplier || 0.02)).toFixed(3));
  const progressPercent = Math.min(100, (state.holdingsEth / goalEth) * 100);
  const cheapestShape = `${activeCollection().name} — ${goalEth.toFixed(3)} ETH`;
  return { ...state, goalEth, rewardEth, progressPercent, cheapestShape };
}

export async function POST(request) {
  const { action } = await request.json();
  let message = 'OK';

  if (action === 'buy-floor') {
    const goal = activeCollection().floorEth;
    if (state.holdingsEth >= goal) {
      state.holdingsEth -= goal;
      const id = Date.now().toString(36).slice(-6).toUpperCase();
      const col = activeCollection();
      col.acquiredCount += 1;
      state.holdings.unshift({ title: `${col.name} #${id}`, subtitle: `Acquired for ${goal.toFixed(3)} ETH` });
      message = 'Floor shape purchased';
      rotateCollectionIfThreshold();
    } else {
      const missing = Math.max(0, goal - state.holdingsEth);
      return new Response(JSON.stringify({ message: `Insufficient funds. Missing ${missing.toFixed(3)} ETH`, state: derive() }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
  } else if (action === 'process-sale') {
    if (state.holdings.length === 0) {
      return new Response(JSON.stringify({ message: 'No holdings to sell', state: derive() }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const sold = state.holdings.shift();
    const proceeds = activeCollection().floorEth * (1 + Math.random() * 0.15);
    state.holdingsEth += proceeds;
    state.sales.unshift({ title: sold.title, subtitle: `Sold for ${proceeds.toFixed(3)} ETH` });
    message = 'Sale processed';
  } else if (action === 'buy-burn') {
    const spend = Math.min(state.holdingsEth * 0.02, 0.25);
    if (spend <= 0.001) {
      return new Response(JSON.stringify({ message: 'Not enough treasury to buy and burn', state: derive() }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    state.holdingsEth -= spend;
    message = `Executed buy & burn of ~${spend.toFixed(3)} ETH`;
  } else if (action === 'set-collection') {
    const body = await request.json();
    const idx = state.collections.findIndex(c => c.id === body.id);
    if (idx >= 0) state.activeCollectionIndex = idx;
    message = 'Active collection updated';
  } else {
    return new Response(JSON.stringify({ message: 'Unknown action', state: derive() }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  return Response.json({ message, state: derive() });
} 