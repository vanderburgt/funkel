import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './../api.js';
import { Art, CoverCard, FollowButton, GridSkeletons, RowSkeletons, Empty } from './../components.jsx';
import { IconSearch } from './../icons.jsx';

export default function Search() {
  const nav = useNavigate();
  const [q, setQ] = useState(() => sessionStorage.getItem('funkel.q') || '');
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const timer = useRef(null);
  const [popular, setPopular] = useState(null);

  // With no query, the page offers what's being listened to right now.
  useEffect(() => {
    let alive = true;
    api.trending().then(d => alive && setPopular(d.feeds)).catch(() => alive && setPopular([]));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!q) inputRef.current?.focus();
  }, []); // eslint-disable-line

  useEffect(() => {
    sessionStorage.setItem('funkel.q', q);
    clearTimeout(timer.current);
    if (!q.trim()) { setResults(null); setBusy(false); return; }
    setBusy(true);
    timer.current = setTimeout(async () => {
      try {
        const d = await api.search(q.trim());
        setResults(d.feeds);
      } catch {
        setResults([]);
      } finally {
        setBusy(false);
      }
    }, 350);
    return () => clearTimeout(timer.current);
  }, [q]);

  return (
    <main className="screen">
      <header className="pagehead">
        <h1>Search</h1>
      </header>

      <div className="search-box">
        <IconSearch size={18} />
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder="Shows, people, subjects…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        {q && <button className="mono-label" style={{ color: 'var(--pen)' }}
          onClick={() => { setQ(''); inputRef.current?.focus(); }}>Clear</button>}
      </div>

      <div style={{ marginTop: 18 }}>
        {busy && <RowSkeletons n={4} />}
        {!busy && results && results.length === 0 && (
          <Empty glyph="( )*" note={`Nothing found for “${q}”. Try another spelling or fewer words.`} />
        )}
        {!busy && results && results.length > 0 && (
          <div className="rows">
            {results.map(f => (
              <div key={f.id} className="row" role="button" tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => nav('/podcast/' + f.id)}
                onKeyDown={e => e.key === 'Enter' && nav('/podcast/' + f.id)}>
                <div className="art"><Art src={f.image || f.artwork} /></div>
                <div className="body">
                  <div className="name">{f.title}</div>
                  <div className="sub">{f.author}</div>
                </div>
                <FollowButton feed={f} small />
              </div>
            ))}
          </div>
        )}
        {!busy && !results && (
          <section className="section" style={{ marginTop: 0 }}>
            <div className="section-head">
              <span className="title serif">Popular now</span>
            </div>
            {popular === null ? <GridSkeletons n={9} /> : popular.length === 0 ? (
              <div className="empty" style={{ border: 'none', background: 'transparent' }}>
                <div className="glyph">⌕</div>
                <div className="note">Search the open podcast index — four million shows, no gatekeeper.</div>
              </div>
            ) : (
              <div className="cover-grid">
                {popular.slice(0, 12).map(f => (
                  <CoverCard key={f.id} feed={f} onClick={() => nav('/podcast/' + f.id)} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
