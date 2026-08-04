import { useNavigate } from 'react-router-dom';
import { useStore } from './../store.js';
import { todayLine, fmtTime } from './../utils.js';
import { Art, CoverCard, Empty } from './../components.jsx';
import { playEpisode } from './../player.js';
import { IconSettings, IconPlay } from './../icons.jsx';

export default function Home() {
  const nav = useNavigate();
  const loaded = useStore(s => s.loaded);
  const subscriptions = useStore(s => s.subscriptions);
  const progress = useStore(s => s.progress);

  const resumable = progress.filter(p => !p.completed && p.position > 5 && p.enclosure_url);

  return (
    <main className="screen">
      <header className="masthead">
        <span className="wordmark">Funkel<span className="dot" /></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="mono-label">{todayLine()}</span>
          <button className="back-btn" style={{ margin: 0 }} aria-label="Settings"
            onClick={() => nav('/settings')}>
            <IconSettings size={20} />
          </button>
        </div>
      </header>

      {loaded && subscriptions.length === 0 && (
        <Empty
          glyph="→ ↘ ↗ ←"
          note="Nothing here yet. Follow a few shows and their new episodes will gather on this page."
          cta="Find your first show"
          to="/search"
        />
      )}

      {resumable.length > 0 && (
        <section className="section" style={{ marginTop: 10 }}>
          <div className="section-head">
            <span className="title serif">Continue</span>
            <span className="aside mono-label">{resumable.length} in progress</span>
          </div>
          <div className="strip">
            {resumable.slice(0, 12).map(p => (
              <button key={p.episode_id} className="resume-card" onClick={() => playEpisode(p)}>
                <div className="art">
                  <Art src={p.image} />
                </div>
                <div className="body">
                  <div className="kicker mono-label" style={{ marginBottom: 3 }}>
                    {fmtTime(Math.max(0, p.duration - p.position))} left
                  </div>
                  <div className="name">{p.episode_title}</div>
                  <div className="progress-line">
                    <b style={{ width: (p.duration ? Math.min(100, p.position / p.duration * 100) : 0) + '%' }} />
                  </div>
                </div>
                <span className="knob" style={{ width: 36, height: 36, flexShrink: 0 }}>
                  <IconPlay size={15} />
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {subscriptions.length > 0 && (
        <section className="section">
          <div className="section-head">
            <span className="title serif">Shows</span>
            <span className="aside mono-label">{subscriptions.length}</span>
          </div>
          <div className="cover-grid">
            {subscriptions.map(s => (
              <CoverCard key={s.feed_id}
                feed={{ id: s.feed_id, title: s.title, author: s.author, image: s.image }}
                onClick={() => nav('/podcast/' + s.feed_id)} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
