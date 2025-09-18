const baseState = globalThis.__shapelection_state || (globalThis.__shapelection_state = {
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

function derive(state) {
  const active = state.collections[state.activeCollectionIndex] || state.collections[0];
  const goalEth = active.floorEth;
  const rewardEth = Math.max(0.001, +(goalEth * (state.rewardMultiplier || 0.02)).toFixed(3));
  const progressPercent = Math.min(100, (state.holdingsEth / goalEth) * 100);
  const cheapestShape = `${active.name} — ${goalEth.toFixed(3)} ETH`;
  return { ...state, goalEth, rewardEth, progressPercent, cheapestShape };
}

export async function GET() {
  return Response.json(derive(baseState));
} 