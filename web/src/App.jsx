import { useEffect, useRef, useState } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from './store.js';
import { toggle, seekTo, skip, setRate, cycleSleep } from './player.js';
import { fmtTime, piEpisodeUrl, share } from './utils.js';
import { Art } from './components.jsx';
import {
  IconPlay, IconPause, IconBack15, IconFwd30, IconSearch, IconLibrary,
  IconAntenna, IconShare, IconChevronDown, IconMoon
} from './icons.jsx';
import Home from './screens/Home.jsx';
import Discover from './screens/Discover.jsx';
import Search from './screens/Search.jsx';
import Podcast from './screens/Podcast.jsx';
import Episode from './screens/Episode.jsx';
import Settings from './screens/Settings.jsx';

export default function App() {
  const bootstrap = useStore(s => s.bootstrap);
  useEffect(() => { bootstrap(); }, [bootstrap]);

  return (
    <div className="shell">
      <ScrollRestorer />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/search" element={<Search />} />
        <Route path="/podcast/:feedId" element={<Podcast />} />
        <Route path="/episode/:episodeId" element={<Episode />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <MiniPlayer />
      <TabBar />
      <PlayerSheet />
      <Toast />
    </div>
  );
}

function ScrollRestorer() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function TabBar() {
  const tabs = [
    { to: '/', label: 'Library', icon: <IconLibrary size={21} /> },
    { to: '/discover', label: 'Discover', icon: <IconAntenna size={21} /> },
    { to: '/search', label: 'Search', icon: <IconSearch size={21} /> }
  ];
  return (
    <nav className="tabbar">
      <div className="inner">
        {tabs.map(t => (
          <NavLink key={t.to} to={t.to} end={t.to === '/'}
            className={({ isActive }) => 'tab' + (isActive ? ' on' : '')}>
            {t.icon}
            <span className="lbl">{t.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function MiniPlayer() {
  const current = useStore(s => s.current);
  const playing = useStore(s => s.playing);
  const buffering = useStore(s => s.buffering);
  const position = useStore(s => s.position);
  const duration = useStore(s => s.duration);
  const openSheet = useStore(s => s.openSheet);

  if (!current) return null;
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  return (
    <div className="miniplayer" role="button" tabIndex={0} onClick={openSheet}
      onKeyDown={e => e.key === 'Enter' && openSheet()}>
      <div className="bar"><b style={{ width: pct + '%' }} /></div>
      <div className="art"><Art src={current.image} /></div>
      <div className="body">
        <div className="name">{current.title}</div>
        <div className="kicker mono-label" style={{ color: 'var(--night-soft)' }}>
          {buffering ? 'Loading…' : current.feedTitle || fmtTime(position)}
        </div>
      </div>
      <button className="knob night" style={{ width: 44, height: 44 }}
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={e => { e.stopPropagation(); toggle(); }}>
        {playing ? <IconPause size={18} /> : <IconPlay size={18} />}
      </button>
    </div>
  );
}

const RATES = [0.8, 1, 1.1, 1.2, 1.5, 1.75, 2];

function PlayerSheet() {
  const current = useStore(s => s.current);
  const playing = useStore(s => s.playing);
  const buffering = useStore(s => s.buffering);
  const position = useStore(s => s.position);
  const duration = useStore(s => s.duration);
  const rate = useStore(s => s.rate);
  const sleepLeft = useStore(s => s.sleepLeft);
  const open = useStore(s => s.sheetOpen);
  const closeSheet = useStore(s => s.closeSheet);
  const showToast = useStore(s => s.showToast);
  const nav = useNavigate();

  // swipe-down to dismiss
  const sheetRef = useRef(null);
  const drag = useRef(null);
  const onTouchStart = e => {
    drag.current = { y: e.touches[0].clientY, dy: 0 };
  };
  const onTouchMove = e => {
    if (!drag.current) return;
    const dy = Math.max(0, e.touches[0].clientY - drag.current.y);
    drag.current.dy = dy;
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
      sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  };
  const onTouchEnd = () => {
    const dy = drag.current?.dy || 0;
    drag.current = null;
    if (sheetRef.current) {
      sheetRef.current.style.transition = '';
      sheetRef.current.style.transform = '';
    }
    if (dy > 90) closeSheet();
  };

  if (!current) return null;
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  const doShare = () => share({
    title: current.title,
    url: piEpisodeUrl(current.feedId, current.episodeId)
  }, showToast);

  const nextRate = () => {
    const i = RATES.indexOf(rate);
    setRate(RATES[(i + 1) % RATES.length] ?? 1);
  };

  return (
    <div ref={sheetRef} className={'player-sheet' + (open ? '' : ' closed')}
      aria-hidden={!open}>
      <div className="player-inner">
        <div className="grabber" onTouchStart={onTouchStart} onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd} onClick={closeSheet}>
          <i />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="aux-btn" style={{ border: 'none', minWidth: 44 }} onClick={closeSheet}
            aria-label="Close player">
            <IconChevronDown size={20} />
          </button>
          <span className="mono-label" style={{ color: 'var(--night-soft)' }}>
            {buffering ? 'Buffering' : playing ? 'Now playing' : 'Paused'}
          </span>
          <button className="aux-btn" style={{ border: 'none', minWidth: 44 }} onClick={doShare}
            aria-label="Share episode">
            <IconShare size={18} />
          </button>
        </div>

        <div className="player-art-wrap"
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <div className={'player-art' + (playing ? '' : ' paused')}>
            <Art src={current.image} />
          </div>
        </div>

        <div className="player-titles">
          <div className="kicker mono-label" style={{ color: 'var(--night-soft)', cursor: 'pointer' }}
            onClick={() => { closeSheet(); nav('/podcast/' + current.feedId); }}>
            {current.feedTitle || 'Episode'}
          </div>
          <div className="name">{current.title}</div>
        </div>

        <Scrubber pct={pct} position={position} duration={duration} />

        <div className="transport">
          <button className="knob night skip" onClick={() => skip(-15)} aria-label="Back 15 seconds">
            <IconBack15 size={32} />
          </button>
          <button className="knob signal playpause" onClick={toggle}
            aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <IconPause size={30} /> : <IconPlay size={30} />}
          </button>
          <button className="knob night skip" onClick={() => skip(30)} aria-label="Forward 30 seconds">
            <IconFwd30 size={32} />
          </button>
        </div>

        <div className="player-aux">
          <button className="aux-btn" onClick={nextRate} aria-label="Playback speed">
            {rate}×
          </button>
          <button className={'aux-btn' + (sleepLeft ? ' lit' : '')} onClick={cycleSleep}
            aria-label="Sleep timer">
            <IconMoon size={16} />
            {sleepLeft ? fmtTime(sleepLeft) : ''}
          </button>
          <button className="aux-btn" onClick={() => {
            closeSheet();
            nav('/episode/' + current.episodeId);
          }}>
            Notes
          </button>
        </div>
      </div>
    </div>
  );
}

function Scrubber({ pct, position, duration }) {
  const [dragPct, setDragPct] = useState(null);
  const trackRef = useRef(null);

  const pctFromEvent = e => {
    const rect = trackRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    return Math.min(1, Math.max(0, x / rect.width));
  };

  const start = e => {
    if (!duration) return;
    setDragPct(pctFromEvent(e) * 100);
  };
  const move = e => {
    if (dragPct === null) return;
    setDragPct(pctFromEvent(e) * 100);
  };
  const end = e => {
    if (dragPct === null) return;
    seekTo((dragPct / 100) * duration);
    setDragPct(null);
  };

  const shown = dragPct ?? pct;
  const shownTime = dragPct !== null ? (dragPct / 100) * duration : position;

  return (
    <div className="scrubber">
      <div ref={trackRef}
        className={'scrub-track' + (dragPct !== null ? ' active' : '')}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); start(e); }}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={() => setDragPct(null)}>
        <div className="rail-line"><b style={{ width: shown + '%' }} /></div>
        <div className="thumb" style={{ left: shown + '%' }} />
      </div>
      <div className="scrub-times">
        <span className="mono-num">{fmtTime(shownTime)}</span>
        <span className="mono-num">−{fmtTime(Math.max(0, duration - shownTime))}</span>
      </div>
    </div>
  );
}

function Toast() {
  const toast = useStore(s => s.toast);
  if (!toast) return null;
  return <div className="toast">{toast}</div>;
}
