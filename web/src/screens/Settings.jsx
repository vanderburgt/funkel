import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from './../store.js';
import { api } from './../api.js';
import { applyTheme, themePref } from './../theme.js';
import { IconChevronLeft } from './../icons.jsx';

const RATES = [0.8, 1, 1.2, 1.5, 2];
const THEMES = [
  { v: 'auto', label: 'Auto' },
  { v: 'light', label: 'Light' },
  { v: 'dark', label: 'Dark' }
];

export default function Settings() {
  const nav = useNavigate();
  const username = useStore(s => s.username);
  const settings = useStore(s => s.settings);
  const privacy = useStore(s => s.privacy);
  const saveSettings = useStore(s => s.saveSettings);
  const bootstrap = useStore(s => s.bootstrap);
  const showToast = useStore(s => s.showToast);

  const [theme, setTheme] = useState(themePref);
  const [mode, setMode] = useState(null); // 'claim' | 'login' | null
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr('');
    try {
      if (mode === 'claim') await api.claim({ username: name, password: pass });
      else await api.login({ username: name, password: pass });
      await bootstrap();
      setMode(null); setName(''); setPass('');
      showToast(mode === 'claim' ? 'Account created' : 'Welcome back');
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <main className="screen">
      <header className="pagehead">
        <button className="back-btn" onClick={() => nav(-1)} aria-label="Back">
          <IconChevronLeft size={22} />
        </button>
        <h1>Settings</h1>
      </header>

      <div className="section" style={{ marginTop: 4 }}>
        <div className="section-head"><span className="title serif">Appearance</span></div>
        <div className="panel">
          <div className="p-row">
            <div>
              <div className="lbl">Theme</div>
              <div className="hint">Auto follows your device.</div>
            </div>
            <div className="seg">
              {THEMES.map(t => (
                <button key={t.v} className={theme === t.v ? 'on' : ''}
                  onClick={() => {
                    setTheme(t.v);
                    applyTheme(t.v);
                    saveSettings({ theme: t.v }).catch(() => {});
                  }}>{t.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-head"><span className="title serif">Playback</span></div>
        <div className="panel">
          <div className="p-row">
            <div>
              <div className="lbl">Default speed</div>
              <div className="hint">Applied when the app starts.</div>
            </div>
            <div className="seg">
              {RATES.map(r => (
                <button key={r} className={Number(settings.rate || 1) === r ? 'on' : ''}
                  onClick={() => saveSettings({ rate: r })}>{r}×</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-head"><span className="title serif">Privacy</span></div>
        <div className="panel">
          <div className="p-row">
            <div>
              <div className="lbl">
                <span className={'status-dot ' + (privacy?.relay ? 'ok' : 'off')} />
                Listening relay
              </div>
              <div className="hint">
                {privacy?.relay
                  ? 'Audio and artwork are fetched by this server and relayed through a residential exit, so neither your address nor the server’s reaches podcast hosts.'
                  : 'Audio and artwork are fetched by this server on your behalf. Your address never reaches podcast hosts.'}
              </div>
            </div>
          </div>
          <div className="p-row">
            <div>
              <div className="lbl"><span className="status-dot ok" />Tracker stripping</div>
              <div className="hint">Ad-measurement redirects (Podtrac, Chartable, Podsights…) are removed from every episode before it is fetched.</div>
            </div>
          </div>
          <div className="p-row">
            <div>
              <div className="lbl"><span className="status-dot ok" />No third parties</div>
              <div className="hint">No analytics, no CDNs, no embedded fonts from outside. Every request stays on this domain.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-head"><span className="title serif">Account</span></div>
        <div className="panel">
          {username ? (
            <>
              <div className="p-row">
                <div>
                  <div className="lbl">Signed in as {username}</div>
                  <div className="hint">Your library follows this name across devices.</div>
                </div>
              </div>
              <button className="p-row" onClick={async () => {
                await api.logout(); await bootstrap(); showToast('Signed out');
              }}>
                <div className="lbl" style={{ color: 'var(--signal-deep)' }}>Sign out</div>
              </button>
            </>
          ) : mode ? (
            <div className="p-row" style={{ display: 'block' }}>
              <div className="lbl" style={{ marginBottom: 10 }}>
                {mode === 'claim' ? 'Create a sync name' : 'Sign in'}
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                <input className="field" placeholder="Name" autoCapitalize="off"
                  value={name} onChange={e => setName(e.target.value)} />
                <input className="field" placeholder="Passphrase (8+ characters)" type="password"
                  value={pass} onChange={e => setPass(e.target.value)} />
                {err && <div className="hint" style={{ color: 'var(--signal-deep)' }}>{err}</div>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="pill on" onClick={submit}>
                    {mode === 'claim' ? 'Create' : 'Sign in'}
                  </button>
                  <button className="pill" onClick={() => { setMode(null); setErr(''); }}>Cancel</button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="p-row">
                <div>
                  <div className="lbl">Anonymous by default</div>
                  <div className="hint">Your library lives in this browser under a random identity — no email, no name. Add a passphrase only if you want it on other devices.</div>
                </div>
              </div>
              <button className="p-row" onClick={() => setMode('claim')}>
                <div className="lbl" style={{ color: 'var(--pen)' }}>Create sync name</div>
              </button>
              <button className="p-row" onClick={() => setMode('login')}>
                <div className="lbl" style={{ color: 'var(--pen)' }}>Sign in on this device</div>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="section">
        <div className="mono-label" style={{ textAlign: 'center', paddingTop: 8 }}>
          Funkel · data from Podcast Index
        </div>
      </div>
    </main>
  );
}
