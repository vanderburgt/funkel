import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { img } from './api.js';
import { fmtDate, fmtDuration, fmtTime } from './utils.js';
import { useStore } from './store.js';
import { playEpisode } from './player.js';
import { IconPlay, IconPause, IconCheck, IconPlus } from './icons.jsx';

// Artwork sits on the sunken paper tone and fades in only once fully
// decoded — no top-to-bottom progressive rendering.
export function Art({ src, alt = '' }) {
  const [loaded, setLoaded] = useState(false);
  return src
    ? <img src={img(src)} alt={alt} loading="lazy" decoding="async"
        className={'fade-art' + (loaded ? ' in' : '')}
        ref={el => { if (el?.complete && el.naturalWidth > 0) setLoaded(true); }}
        onLoad={() => setLoaded(true)}
        onError={e => { e.currentTarget.style.visibility = 'hidden'; }} />
    : null;
}

// A tactile play/pause dot used inside rows.
export function RowPlayButton({ ep, ctx }) {
  const current = useStore(s => s.current);
  const playing = useStore(s => s.playing);
  const isThis = current?.episodeId === Number(ep.id ?? ep.episode_id);
  return (
    <button
      className={'knob' + (isThis && playing ? ' signal' : '')}
      style={{ width: 42, height: 42, flexShrink: 0 }}
      aria-label={isThis && playing ? 'Pause' : 'Play'}
      onClick={e => { e.stopPropagation(); e.preventDefault(); playEpisode(ep, ctx); }}>
      {isThis && playing ? <IconPause size={17} /> : <IconPlay size={17} />}
    </button>
  );
}

export function EpisodeRow({ ep, ctx = {}, showFeed = false }) {
  const nav = useNavigate();
  const progressBy = useStore(s => s.progressBy);
  const p = progressBy[Number(ep.id ?? ep.episode_id)];
  const pct = p && p.duration > 0 ? Math.min(100, (p.position / p.duration) * 100) : 0;
  const done = p?.completed;

  const date = fmtDate(ep.datePublished);
  const dur = fmtDuration(ep.duration);

  return (
    <button className="row" onClick={() => nav('/episode/' + (ep.id ?? ep.episode_id), { state: { ep, ctx } })}>
      <div className="art"><Art src={ep.image || ep.feedImage || ep._feedImage || ctx.feedImage} /></div>
      <div className="body">
        <div className="kicker mono-label">
          {showFeed && (ep._feedTitle || ep.feedTitle || ctx.feedTitle)
            ? (ep._feedTitle || ep.feedTitle || ctx.feedTitle)
            : date}
          {showFeed ? ' · ' + date : ''}
        </div>
        <div className="name">{ep.title}</div>
        <div className="sub">
          {done ? 'Played' : p && pct > 0 ? `${fmtTime(Math.max(0, (p.duration - p.position)))} left` : dur}
        </div>
        {pct > 0 && !done && <div className="progress-line"><b style={{ width: pct + '%' }} /></div>}
      </div>
      <RowPlayButton ep={ep} ctx={ctx} />
    </button>
  );
}

export function CoverCard({ feed, onClick }) {
  return (
    <button className="cover" onClick={onClick}>
      <div className="art"><Art src={feed.image || feed.artwork} alt="" /></div>
      <div className="name">{feed.title}</div>
      {feed.author && <div className="sub">{feed.author}</div>}
    </button>
  );
}

export function FollowButton({ feed, small = false }) {
  const isSub = useStore(s => s.subscriptions.some(x => x.feed_id === Number(feed.id ?? feed.feed_id)));
  const toggleSubscribe = useStore(s => s.toggleSubscribe);
  return (
    <button
      className={'pill' + (isSub ? ' on' : '')}
      style={small ? { minHeight: 34, padding: '0 13px' } : undefined}
      onClick={e => { e.stopPropagation(); toggleSubscribe(feed); }}>
      {isSub ? <IconCheck size={13} /> : <IconPlus size={13} />}
      {isSub ? 'Following' : 'Follow'}
    </button>
  );
}

export function Empty({ glyph = '~ ~ ~', note, cta, to }) {
  const nav = useNavigate();
  return (
    <div className="empty">
      <div className="glyph">{glyph}</div>
      <div className="note">{note}</div>
      {cta && <button className="cta" style={{ background: 'none', border: 'none', borderBottom: '1.5px solid var(--pen)', cursor: 'pointer' }}
        onClick={() => nav(to)}>{cta}</button>}
    </div>
  );
}

export function RowSkeletons({ n = 6 }) {
  return (
    <div className="rows">
      {Array.from({ length: n }).map((_, i) => (
        <div className="row" key={i}>
          <div className="skeleton" style={{ width: 56, height: 56, borderRadius: 9, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 10, width: '38%', marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 13, width: '85%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GridSkeletons({ n = 9 }) {
  return (
    <div className="cover-grid">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i}>
          <div className="skeleton" style={{ aspectRatio: '1', borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 10, width: '70%', marginTop: 8 }} />
        </div>
      ))}
    </div>
  );
}
