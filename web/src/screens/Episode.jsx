import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from './../api.js';
import { Art } from './../components.jsx';
import { cleanHtml, fmtDate, fmtDuration, fmtTime, piEpisodeUrl, share } from './../utils.js';
import { useStore } from './../store.js';
import { playEpisode, markPlayed } from './../player.js';
import { IconChevronLeft, IconShare, IconPlay, IconPause, IconCheck, IconQueueAdd } from './../icons.jsx';

export default function Episode() {
  const { episodeId } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const passed = location.state?.ep;
  const passedCtx = location.state?.ctx || {};

  const showToast = useStore(s => s.showToast);
  const current = useStore(s => s.current);
  const playing = useStore(s => s.playing);
  const progressBy = useStore(s => s.progressBy);
  const clearRow = useStore(s => s.removeProgressRow);
  const queued = useStore(s => s.queue.some(r => r.episode_id === Number(episodeId)));
  const queueAdd = useStore(s => s.queueAdd);
  const queueRemove = useStore(s => s.queueRemove);

  const [ep, setEp] = useState(passed || null);

  useEffect(() => {
    let alive = true;
    // Always refresh from the API for full show notes; the passed episode may
    // be truncated.
    api.episode(episodeId).then(d => {
      if (alive && d.episode) setEp(prev => ({ ...prev, ...d.episode }));
    }).catch(() => {});
    return () => { alive = false; };
  }, [episodeId]);

  if (!ep) {
    return (
      <main className="screen">
        <Head nav={nav} />
        <div className="skeleton" style={{ width: 96, height: 96, borderRadius: 14 }} />
        <div className="skeleton" style={{ height: 20, width: '80%', marginTop: 14 }} />
        <div className="skeleton" style={{ height: 12, width: '50%', marginTop: 10 }} />
      </main>
    );
  }

  const feedId = ep.feedId ?? passedCtx.feedId;
  const feedTitle = ep.feedTitle || passedCtx.feedTitle || '';
  const image = ep.image || ep.feedImage || passedCtx.feedImage;
  const isThis = current?.episodeId === Number(episodeId);
  const p = progressBy[Number(episodeId)];
  const done = p?.completed;
  const pct = p && p.duration > 0 ? Math.min(100, p.position / p.duration * 100) : 0;

  const doShare = () => share({
    title: ep.title,
    url: piEpisodeUrl(feedId, episodeId)
  }, showToast);

  return (
    <main className="screen">
      <Head nav={nav} onShare={doShare} />

      <section className="ep-head">
        <div className="art"><Art src={image} /></div>
        <div style={{ flex: 1, minWidth: 0, paddingTop: 6 }}>
          {feedTitle && (
            <button className="mono-label" style={{ color: 'var(--pen)', textAlign: 'left' }}
              onClick={() => nav('/podcast/' + feedId)}>
              {feedTitle}
            </button>
          )}
          <div className="meta-line" style={{ marginTop: 6 }}>
            <span className="mono-num" style={{ color: 'var(--ink-soft)' }}>{fmtDate(ep.datePublished)}</span>
            {ep.duration ? <>
              <span className="sep">·</span>
              <span className="mono-num" style={{ color: 'var(--ink-soft)' }}>{fmtDuration(ep.duration)}</span>
            </> : null}
            {ep.episode ? <>
              <span className="sep">·</span>
              <span className="mono-num" style={{ color: 'var(--ink-soft)' }}>EP {ep.episode}</span>
            </> : null}
          </div>
        </div>
      </section>

      <h1 className="ep-title">{ep.title}</h1>

      {(pct > 0 && !done) && (
        <div style={{ marginTop: 10, maxWidth: 320 }}>
          <div className="progress-line"><b style={{ width: pct + '%' }} /></div>
          <div className="mono-label" style={{ marginTop: 5 }}>
            {fmtTime(Math.max(0, p.duration - p.position))} left
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 18 }}>
        <button className="knob signal" style={{ width: 62, height: 62 }}
          aria-label={isThis && playing ? 'Pause' : 'Play'}
          onClick={() => playEpisode(ep, { feedId, feedTitle, feedImage: image })}>
          {isThis && playing ? <IconPause size={24} /> : <IconPlay size={24} />}
        </button>
        <button className={'pill' + (queued ? ' on' : '')}
          onClick={() => queued
            ? queueRemove(Number(episodeId))
            : queueAdd(ep, { feedId, feedTitle, feedImage: image })}>
          <IconQueueAdd size={14} /> {queued ? 'Queued' : 'Queue'}
        </button>
        <button className="pill" onClick={doShare}>
          <IconShare size={14} /> Share
        </button>
        <button className={'pill' + (done ? ' on' : '')}
          onClick={() => {
            if (done) { clearRow(Number(episodeId)); api.clearProgress(episodeId).catch(() => {}); }
            else markPlayed(ep, { feedId, feedTitle, feedImage: image });
          }}>
          <IconCheck size={14} /> {done ? 'Played' : 'Mark played'}
        </button>
      </div>

      {ep.description && (
        <section className="section">
          <div className="section-head">
            <span className="title serif">Notes</span>
          </div>
          <div className="prose" dangerouslySetInnerHTML={{ __html: cleanHtml(ep.description) }} />
        </section>
      )}
    </main>
  );
}

function Head({ nav, onShare }) {
  return (
    <header className="pagehead">
      <button className="back-btn" onClick={() => nav(-1)} aria-label="Back">
        <IconChevronLeft size={22} />
      </button>
      <span className="mono-label" style={{ flex: 1 }}>Episode</span>
      {onShare && (
        <button className="back-btn" style={{ margin: 0 }} aria-label="Share" onClick={onShare}>
          <IconShare size={19} />
        </button>
      )}
    </header>
  );
}
