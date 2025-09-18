'use client';

import { useEffect, useState } from 'react';

export default function Page() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [state, setState] = useState({
    holdingsEth: 0.0,
    goalEth: 0.0,
    rewardEth: 0.0,
    cheapestShape: 'Loading...?',
    collections: [],
    activeCollectionIndex: 0,
    progressPercent: 0,
    holdings: [],
    sales: [],
  });

  const active = state.collections?.[state.activeCollectionIndex] || { name: '—', floorEth: 0, acquiredCount: 0, acquireThreshold: 1 };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/state');
        const json = await res.json();
        if (!mounted) return;
        setState(json);
      } catch (e) {
        setToast('Failed to load state');
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const run = async (action, body) => {
    if (action !== 'set-collection' && !connected) { setToast('Connect wallet first'); return; }
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...(body || {}) })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Action failed');
      setState(json.state || state);
      setToast(json.message || 'Action complete');
    } catch (e) {
      setToast(e.message);
    }
  };

  return (
    <main className="relative z-10 max-w-5xl mx-auto p-6">
      <header className="sticky top-0 z-20 backdrop-blur bg-black/40 border-b border-zinc-800 -mx-6 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg border border-zinc-800 bg-gradient-to-br from-cyan-500/20 to-emerald-400/20 grid place-items-center font-bold">◆</div>
          <div>
            <h1 className="text-base font-semibold">Shapelection Strategy</h1>
            <p className="text-xs text-zinc-400 -mt-0.5">Perpetual Shape Machine™</p>
          </div>
        </div>
        <button
          onClick={() => setConnected(!connected)}
          className={`px-4 py-2 rounded-lg border text-sm font-semibold transition ${connected ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-800 bg-gradient-to-br from-cyan-500/15 to-emerald-400/15'}`}
        >{connected ? 'Connected' : 'Connect Wallet'}</button>
      </header>

      <section className="grid md:grid-cols-2 gap-4 mt-4">
        <div className="rounded-xl border border-zinc-800 p-4 bg-white/5">
          <h2 className="text-xs uppercase tracking-wide text-zinc-400 font-semibold">Shapelection™ is currently holding</h2>
          <div className="text-2xl font-extrabold mt-1">{state.holdingsEth.toFixed(3)} ETH</div>
        </div>
        <div className="rounded-xl border border-zinc-800 p-4 bg-white/5">
          <h2 className="text-xs uppercase tracking-wide text-zinc-400 font-semibold">Cheapest NFT in the current collection</h2>
          <div className="text-zinc-300">{loading ? 'Loading...' : (state.cheapestShape || '—')}</div>
          <div className="text-xs text-zinc-500 mt-1">Active: <span className="font-semibold text-zinc-300">{active.name}</span> · Floor {active.floorEth?.toFixed?.(3) || '0.000'} ETH</div>
        </div>
        <div className="md:col-span-2 rounded-xl border border-zinc-800 p-4 bg-white/5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs uppercase tracking-wide text-zinc-400 font-semibold">Progress to Next Purchase</h2>
            <div className="text-sm text-zinc-400">Current reward: <span className="font-semibold text-zinc-200">{state.rewardEth?.toFixed?.(3) || '0.000'} ETH</span></div>
          </div>
          <div className="h-3 rounded-full border border-zinc-800 bg-black/40 overflow-hidden mt-2">
            <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-[0_0_24px_rgba(34,211,238,0.35)]" style={{ width: `${(state.progressPercent || 0).toFixed(1)}%` }} />
          </div>
          <div className="text-sm text-zinc-400 mt-1">{(state.progressPercent || 0).toFixed(1)}%</div>

          <div className="flex flex-wrap gap-2 mt-3">
            <button onClick={() => run('buy-floor')} className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900">Buy Floor </button>
            <button onClick={() => run('process-sale')} className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900">Process Sale</button>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4 mt-4">
        <div className="rounded-xl border border-zinc-800 p-4 bg-white/5">
          <h2 className="text-xs uppercase tracking-wide text-zinc-400 font-semibold">Currently Holding</h2>
          <List items={state.holdings} empty="No shapes currently held" />
        </div>
        <div className="rounded-xl border border-zinc-800 p-4 bg-white/5">
          <h2 className="text-xs uppercase tracking-wide text-zinc-400 font-semibold">Previously Sold</h2>
          <List items={state.sales} empty="No previous sales data" />
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 p-4 bg-white/5 mt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wide text-zinc-400 font-semibold">Collections</h2>
          <div className="text-xs text-zinc-500">Rotates when acquired count reaches threshold</div>
        </div>
        <ul className="mt-3 grid gap-2">
          {(state.collections || []).map((c, i) => {
            const isActive = i === state.activeCollectionIndex;
            const pct = Math.min(100, (c.acquiredCount / Math.max(1, c.acquireThreshold)) * 100);
            return (
              <li key={c.id} className={`px-3 py-3 rounded-lg border ${isActive ? 'border-cyan-500/40 bg-cyan-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-zinc-400">Floor {c.floorEth.toFixed(3)} ETH · Acquired {c.acquiredCount}/{c.acquireThreshold}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-40 h-2 rounded-full bg-black/40 overflow-hidden border border-zinc-800">
                      <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${pct}%` }} />
                    </div>
                    <button onClick={() => run('set-collection', { id: c.id })} className="px-2 py-1 rounded-md border border-zinc-800 text-xs">{isActive ? 'Active' : 'Activate'}</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-wrap items-center gap-3 mt-4 rounded-xl border border-zinc-800 p-4 bg-white/5">
        <a className="text-sm text-zinc-200 underline underline-offset-4 decoration-dotted" href="#" target="_blank" rel="noreferrer">TokenWorks™</a>
        <a className="text-sm text-zinc-200 underline underline-offset-4 decoration-dotted" href="#" target="_blank" rel="noreferrer">Contract</a>
        <a className="text-sm text-zinc-200 underline underline-offset-4 decoration-dotted" href="#" target="_blank" rel="noreferrer">Geckoterminal</a>
        <a className="px-3 py-2 rounded-lg border border-zinc-800" href="#" target="_blank" rel="noreferrer">Buy $SHAPSTR</a>
      </section>

      <footer className="text-center text-xs text-zinc-500 mt-6">
        <p>Shapelection Strategy is not affiliated with any official NFT IP.</p>
        <p>© 2025 All rights reserved</p>
      </footer>

      <div className={`fixed right-6 bottom-6 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-sm transition ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>{toast}</div>
    </main>
  );
}

function List({ items = [], empty }) {
  if (!items || items.length === 0) {
    return <ul className="mt-2"><li className="text-zinc-400 text-sm">{empty}</li></ul>;
  }
  return (
    <ul className="mt-2 grid gap-2">
      {items.map((item, idx) => (
        <li key={idx} className="px-3 py-2 rounded-lg border border-zinc-800">
          <div className="font-semibold">{item.title}</div>
          <div className="text-sm text-zinc-400">{item.subtitle}</div>
        </li>
      ))}
    </ul>
  );
} 