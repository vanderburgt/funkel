import { useEffect, useState } from 'react';
import { useStore } from './../store.js';
import { api } from './../api.js';
import { EpisodeRow, Empty, RowSkeletons } from './../components.jsx';

// Every recent episode from the shows you follow, newest first.
export default function New() {
  const loaded = useStore(s => s.loaded);
  const subscriptions = useStore(s => s.subscriptions);
  const [episodes, setEpisodes] = useState(null);

  useEffect(() => {
    if (!loaded) return;
    if (subscriptions.length === 0) { setEpisodes([]); return; }
    let alive = true;
    api.inbox().then(d => alive && setEpisodes(d.episodes)).catch(() => alive && setEpisodes([]));
    return () => { alive = false; };
  }, [loaded, subscriptions.length]);

  return (
    <main className="screen">
      <header className="pagehead">
        <h1>New</h1>
        {episodes?.length > 0 && (
          <span className="mono-label" style={{ marginLeft: 'auto' }}>
            {episodes.length} episodes
          </span>
        )}
      </header>

      {loaded && subscriptions.length === 0 ? (
        <Empty
          glyph="( )*"
          note="New episodes from the shows you follow arrive here, newest first."
          cta="Find shows to follow"
          to="/search"
        />
      ) : episodes === null ? (
        <RowSkeletons n={8} />
      ) : episodes.length === 0 ? (
        <Empty glyph="( )*" note="No recent episodes from the shows you follow." />
      ) : (
        <div className="rows" style={{ marginTop: 6 }}>
          {episodes.map(ep => <EpisodeRow key={ep.id} ep={ep} showFeed />)}
        </div>
      )}
    </main>
  );
}
