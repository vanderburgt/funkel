import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './../api.js';
import { CoverCard, GridSkeletons, Empty } from './../components.jsx';

const CATS = [
  { label: 'All', cat: '' },
  { label: 'News', cat: 'News' },
  { label: 'Comedy', cat: 'Comedy' },
  { label: 'Society', cat: 'Society' },
  { label: 'True Crime', cat: 'True Crime' },
  { label: 'Technology', cat: 'Technology' },
  { label: 'Science', cat: 'Science' },
  { label: 'History', cat: 'History' },
  { label: 'Business', cat: 'Business' },
  { label: 'Arts', cat: 'Arts' },
  { label: 'Music', cat: 'Music' },
  { label: 'Sports', cat: 'Sports' }
];

export default function Discover() {
  const nav = useNavigate();
  const [cat, setCat] = useState('');
  const [feeds, setFeeds] = useState(null);

  useEffect(() => {
    let alive = true;
    setFeeds(null);
    api.trending(cat).then(d => alive && setFeeds(d.feeds)).catch(() => alive && setFeeds([]));
    return () => { alive = false; };
  }, [cat]);

  return (
    <main className="screen">
      <header className="pagehead">
        <h1>Discover</h1>
      </header>

      <div className="strip" style={{ paddingBottom: 14 }}>
        {CATS.map(c => (
          <button key={c.label}
            className={'chip' + (cat === c.cat ? ' on' : '')}
            onClick={() => setCat(c.cat)}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="section" style={{ marginTop: 4 }}>
        <div className="section-head">
          <span className="title serif">Trending now</span>
          <span className="aside mono-label">via Podcast Index</span>
        </div>
        {feeds === null ? <GridSkeletons /> : feeds.length === 0 ? (
          <Empty glyph="≈" note="Nothing trending in this category right now." />
        ) : (
          <div className="cover-grid">
            {feeds.map(f => (
              <CoverCard key={f.id} feed={f} onClick={() => nav('/podcast/' + f.id)} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
