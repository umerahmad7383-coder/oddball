import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Support, Vault, Me, Login, Supporters, Advertise, Privacy, Notes, NewsletterPage, PublicProfile, Loading, useMe } from './pages.jsx';
import { Admin } from './admin.jsx';
import { BadgeIcon } from './profile.jsx';
import { Mark } from './mark.jsx';
import { initCosmetics } from '../client/cosmetics.js';
import '../client/themes.css';
import './site.css';

initCosmetics();
const TITLES = { support: 'Support oddball', vault: 'Supporter Vault', me: 'Your profile', login: 'Sign in', supporters: 'Supporters', advertise: 'Advertise', privacy: 'Privacy', notes: 'Dev notes', newsletter: 'Newsletter', admin: 'Admin', u: 'Profile' };

function App() {
  const [me] = useMe();
  const parts = window.location.pathname.split('/').filter(Boolean);
  const page = parts[0] || 'support';
  useEffect(() => { document.title = `${TITLES[page] || 'oddball'} — oddball`; }, [page]);
  let body;
  switch (page) {
    case 'support': body = <Support />; break;
    case 'vault': body = <Vault />; break;
    case 'me': body = <Me />; break;
    case 'login': body = <div className="narrow"><Login /></div>; break;
    case 'supporters': body = <Supporters />; break;
    case 'advertise': body = <Advertise />; break;
    case 'privacy': body = <Privacy />; break;
    case 'notes': body = <Notes />; break;
    case 'newsletter': body = <NewsletterPage />; break;
    case 'u': body = <PublicProfile name={parts[1] || ''} />; break;
    case 'admin': body = me === undefined ? <Loading /> : <Admin me={me} />; break;
    default: body = <p className="pad">Nothing here. <a className="link" href="/">Back to the games</a></p>;
  }
  const card = me && me.profile.card;
  return (
    <div className={`site ${page === 'admin' ? 'wide' : ''}`}>
      <header className="sbar">
        <a href="/" className="sbrand"><Mark className="sbrand-mark" />oddball</a>
        <nav aria-label="Site">
          <a href="/">games</a>
          <a href="/notes" className={page === 'notes' ? 'on' : ''}>notes</a>
          <a href="/support" className={['support', 'vault', 'supporters'].includes(page) ? 'on' : ''}>support</a>
          {card ? <a href="/me" className={`me-chip ${page === 'me' ? 'on' : ''}`} style={{ '--acc': card.accent || 'var(--ink)' }}>{card.badge && <BadgeIcon badge={card.badge} size={14} />}{card.username}</a> : me === null ? <a href="/login">sign in</a> : null}
        </nav>
      </header>
      <main className="smain">{body}</main>
      <footer className="sfoot"><a href="/">oddball</a><a href="/notes">notes</a><a href="/vault">vault</a><a href="/supporters">supporters</a><a href="/privacy">privacy</a></footer>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
