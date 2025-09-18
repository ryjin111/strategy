const state = globalThis.__shapelection_state || (globalThis.__shapelection_state = {
  holdingsEth: 0.010,
  goalEth: 50.000,
  rewardEth: 0.005,
  cheapestShape: 'Loading…',
  holdings: [],
  sales: [],
});

function recompute() {
  state.progressPercent = Math.min(100, (state.holdingsEth / state.goalEth) * 100);
}

export async function POST(request) {
  const { action } = await request.json();
  let message = 'OK';

  if (action === 'buy-floor') {
    if (state.holdingsEth >= state.goalEth) {
      state.holdingsEth -= state.goalEth;
      const id = Date.now().toString(36).slice(-6).toUpperCase();
      state.holdings.unshift({ title: `Shape #${id}`, subtitle: `Acquired for ${state.goalEth.toFixed(3)} ETH` });
      message = 'Floor shape purchased';
    } else {
      const missing = Math.max(0, state.goalEth - state.holdingsEth);
      return new Response(JSON.stringify({ message: `Insufficient funds. Missing ${missing.toFixed(3)} ETH`, state }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
  } else if (action === 'process-sale') {
    if (state.holdings.length === 0) {
      return new Response(JSON.stringify({ message: 'No holdings to sell', state }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const sold = state.holdings.shift();
    const proceeds = state.goalEth * (1 + Math.random() * 0.15);
    state.holdingsEth += proceeds;
    state.sales.unshift({ title: sold.title, subtitle: `Sold for ${proceeds.toFixed(3)} ETH` });
    message = 'Sale processed';
  } else if (action === 'buy-burn') {
    const spend = Math.min(state.holdingsEth * 0.02, 0.25);
    if (spend <= 0.001) {
      return new Response(JSON.stringify({ message: 'Not enough treasury to buy and burn', state }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    state.holdingsEth -= spend;
    message = `Executed buy & burn of ~${spend.toFixed(3)} ETH`;
  } else {
    return new Response(JSON.stringify({ message: 'Unknown action', state }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  recompute();
  return Response.json({ message, state });
} 