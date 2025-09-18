'use client';

import { useEffect, useState } from 'react';

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [collections, setCollections] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [form, setForm] = useState({ id: '', name: '', slug: '', acquireThreshold: 1 });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/collections');
        const json = await res.json();
        if (!mounted) return;
        setCollections(json.collections || []);
        setActiveIndex(json.activeCollectionIndex || 0);
      } catch (e) {
        setToast('Failed to load collections');
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const save = async () => {
    try {
      const res = await fetch('/api/admin/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Save failed');
      setCollections(json.collections || []);
      setActiveIndex(json.activeCollectionIndex || 0);
      setToast('Saved');
      setForm({ id: '', name: '', slug: '', acquireThreshold: 1 });
    } catch (e) {
      setToast(e.message);
    }
  };

  const update = async (id, data) => {
    try {
      const res = await fetch('/api/admin/collections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Update failed');
      setCollections(json.collections || []);
      setActiveIndex(json.activeCollectionIndex || 0);
      setToast('Updated');
    } catch (e) {
      setToast(e.message);
    }
  };

  const remove = async (id) => {
    try {
      const res = await fetch('/api/admin/collections', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Delete failed');
      setCollections(json.collections || []);
      setActiveIndex(json.activeCollectionIndex || 0);
      setToast('Deleted');
    } catch (e) {
      setToast(e.message);
    }
  };

  return (
    <main className="relative z-10 max-w-5xl mx-auto p-6">
      <header className="sticky top-0 z-20 backdrop-blur bg-black/40 border-b border-zinc-800 -mx-6 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg border border-zinc-800 bg-gradient-to-br from-cyan-500/20 to-emerald-400/20 grid place-items-center font-bold">⚙</div>
          <div>
            <h1 className="text-base font-semibold">Admin Dashboard</h1>
            <p className="text-xs text-zinc-400 -mt-0.5">Manage Collections</p>
          </div>
        </div>
      </header>

      <section className="grid md:grid-cols-2 gap-4 mt-4">
        <div className="rounded-xl border border-zinc-800 p-4 bg-white/5">
          <h2 className="text-xs uppercase tracking-wide text-zinc-400 font-semibold">Add / Update Collection</h2>
          <div className="grid gap-2 mt-2">
            <input className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800" placeholder="ID (e.g., punks)" value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} />
            <input className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800" placeholder="OpenSea Slug (e.g., cryptopunks)" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
            <input className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800" placeholder="Acquire Threshold" type="number" value={form.acquireThreshold} onChange={e => setForm({ ...form, acquireThreshold: Number(e.target.value) })} />
            <button onClick={save} className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900">Save</button>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 p-4 bg-white/5">
          <h2 className="text-xs uppercase tracking-wide text-zinc-400 font-semibold">Collections</h2>
          {loading ? (
            <div className="text-sm text-zinc-400 mt-2">Loading...</div>
          ) : (
            <ul className="mt-3 grid gap-2">
              {(collections || []).map((c, i) => {
                const isActive = i === activeIndex;
                return (
                  <li key={c.id} className={`px-3 py-3 rounded-lg border ${isActive ? 'border-cyan-500/40 bg-cyan-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{c.name} <span className="text-xs text-zinc-500">({c.id})</span></div>
                        <div className="text-xs text-zinc-400">Slug: {c.slug}</div>
                        <div className="text-xs text-zinc-400">Acquired {c.acquiredCount || 0} / {c.acquireThreshold || 1}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => update(c.id, { active: true })} className="px-2 py-1 rounded-md border border-zinc-800 text-xs">{isActive ? 'Active' : 'Set Active'}</button>
                        <button onClick={() => update(c.id, { acquiredCount: (c.acquiredCount || 0) + 1 })} className="px-2 py-1 rounded-md border border-zinc-800 text-xs">+1 Acquired</button>
                        <button onClick={() => remove(c.id)} className="px-2 py-1 rounded-md border border-red-800 text-xs text-red-300">Delete</button>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <input className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-xs" placeholder="Name" defaultValue={c.name} onBlur={e => update(c.id, { name: e.target.value })} />
                      <input className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-xs" placeholder="Slug" defaultValue={c.slug} onBlur={e => update(c.id, { slug: e.target.value })} />
                      <input className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-xs" placeholder="Threshold" type="number" defaultValue={c.acquireThreshold || 1} onBlur={e => update(c.id, { acquireThreshold: Number(e.target.value) })} />
                      <input className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-xs" placeholder="Acquired" type="number" defaultValue={c.acquiredCount || 0} onBlur={e => update(c.id, { acquiredCount: Number(e.target.value) })} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <footer className="text-center text-xs text-zinc-500 mt-6">
        <p>Changes are in-memory for now. Hook to a database for persistence.</p>
      </footer>

      <div className={`fixed right-6 bottom-6 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-sm transition ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>{toast}</div>
    </main>
  );
} 