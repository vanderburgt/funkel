import { useStore } from './../store.js';
import { Art, Empty } from './../components.jsx';
import { fmtDuration, fmtTime } from './../utils.js';
import { playEpisode } from './../player.js';
import { IconPlay, IconChevronUp, IconChevronDown, IconX } from './../icons.jsx';

export default function Queue() {
  const queue = useStore(s => s.queue);
  const queueRemove = useStore(s => s.queueRemove);
  const queueMove = useStore(s => s.queueMove);

  const total = queue.reduce((sum, r) => sum + (r.duration || 0), 0);

  const play = row => {
    queueRemove(row.episode_id, true);
    playEpisode(row);
  };

  return (
    <main className="screen">
      <header className="pagehead">
        <h1>Queue</h1>
        {queue.length > 0 && (
          <span className="mono-label" style={{ marginLeft: 'auto' }}>
            {queue.length} · {total ? fmtTime(total) : '—'}
          </span>
        )}
      </header>

      {queue.length === 0 ? (
        <Empty
          glyph="→ → →"
          note="Nothing lined up. Queue episodes and they play here in order, one after another."
          cta="Find something to hear"
          to="/new"
        />
      ) : (
        <div className="rows" style={{ marginTop: 6 }}>
          {queue.map((row, i) => (
            <div key={row.episode_id} className="row qrow">
              <button className="knob" style={{ width: 42, height: 42, flexShrink: 0 }}
                aria-label="Play now" onClick={() => play(row)}>
                <IconPlay size={17} />
              </button>
              <div className="art"><Art src={row.image} /></div>
              <div className="body" role="button" tabIndex={0} onClick={() => play(row)}
                onKeyDown={e => e.key === 'Enter' && play(row)} style={{ cursor: 'pointer' }}>
                <div className="kicker mono-label">
                  {[i === 0 ? 'Up next' : null, row.feed_title, fmtDuration(row.duration)]
                    .filter(Boolean).join(' · ')}
                </div>
                <div className="name">{row.episode_title}</div>
              </div>
              <div className="q-ctl">
                <button aria-label="Move up" disabled={i === 0}
                  onClick={() => queueMove(row.episode_id, -1)}>
                  <IconChevronUp size={16} />
                </button>
                <button aria-label="Move down" disabled={i === queue.length - 1}
                  onClick={() => queueMove(row.episode_id, 1)}>
                  <IconChevronDown size={16} />
                </button>
                <button aria-label="Remove from queue"
                  onClick={() => queueRemove(row.episode_id)}>
                  <IconX size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
