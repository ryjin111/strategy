const state = globalThis.__shapelection_state || (globalThis.__shapelection_state = {
  holdingsEth: 0.010,
  goalEth: 50.000,
  rewardEth: 0.005,
  cheapestShape: 'Loading…',
  holdings: [],
  sales: [],
});

function withProgress(s) {
  const progressPercent = Math.min(100, (s.holdingsEth / s.goalEth) * 100);
  return { ...s, progressPercent };
}

export async function GET() {
  return Response.json(withProgress(state));
} 