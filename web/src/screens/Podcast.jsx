import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from './../api.js';
import { Art, EpisodeRow, FollowButton, RowSkeletons } from './../components.jsx';
import { cleanHtml, piPodcastUrl, share } from './../utils.js';
import { useStore } from './../store.js';
import { IconChevronLeft, IconShare } from './../icons.jsx';

export default function Podcast() {
  const { feedId } = useParams();
  const nav = useNavigate();
  const showToast = useStore(s => s.showToast);
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [shown, setShown] = useState(30);

  useEffect(() => {
    let alive = true;
    setData(null); setExpanded(false); setShown(30);
    api.podcast(feedId).then(d => alive && setData(d)).catch(() => alive && setData({ feed: null, episodes: [] }));
    return () => { alive = false; };
  }, [feedId]);

  const feed = data?.feed;
  const ctx = feed ? { feedId: feed.id, feedTitle: feed.title, feedImage: feed.image || feed.artwork } : {};

  return (
    <main className="screen">
      <header className="pagehead">
        <button className="back-btn" onClick={() => nav(-1)} aria-label="Back">
          <IconChevronLeft size={22} />
        </button>
        <span className="mono-label" style={{ flex: 1 }}>Show</span>
        {feed && (
          <button className="back-btn" style={{ margin: 0 }} aria-label="Share show"
            onClick={() => share({ title: feed.title, url: piPodcastUrl(feed.id) }, showToast)}>
            <IconShare size={19} />
          </button>
        )}
      </header>

      {!data && (
        <div>
          <div className="hero">
            <div className="skeleton" style={{ width: 'min(62vw, 250px)', aspectRatio: '1', borderRadius: 18 }} />
            <div className="skeleton" style={{ height: 22, width: 220, marginTop: 18 }} />
          </div>
          <div style={{ marginTop: 28 }}><RowSkeletons n={5} /></div>
        </div>
      )}

      {data && feed && (
        <>
          <section className="hero">
            <div className="art"><Art src={feed.image || feed.artwork} /></div>
            <h1>{feed.title}</h1>
            <div className="author">{feed.author}</div>
            <div className="actions">
              <FollowButton feed={feed} />
            </div>
          </section>

          {feed.description && (
            <section className="section" style={{ marginTop: 22 }}>
              <div className={'prose' + (expanded ? '' : ' clamped')}
                dangerouslySetInnerHTML={{ __html: cleanHtml(feed.description) }} />
              <button className="more-btn" onClick={() => setExpanded(x => !x)}>
                {expanded ? 'Less' : 'More'}
              </button>
            </section>
          )}

          <section className="section">
            <div className="section-head">
              <span className="title serif">Episodes</span>
              <span className="aside mono-label">{data.episodes.length}{data.episodes.length === 300 ? '+' : ''}</span>
            </div>
            <div className="rows">
              {data.episodes.slice(0, shown).map(ep => (
                <EpisodeRow key={ep.id} ep={ep} ctx={ctx} />
              ))}
            </div>
            {shown < data.episodes.length && (
              <button className="pill" style={{ width: '100%', marginTop: 16 }}
                onClick={() => setShown(x => x + 50)}>
                Show more
              </button>
            )}
          </section>
        </>
      )}

      {data && !feed && (
        <div className="empty">
          <div className="glyph">( )*</div>
          <div className="note">This show could not be loaded.</div>
        </div>
      )}
    </main>
  );
}
