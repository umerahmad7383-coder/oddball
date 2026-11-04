import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { Curate, Credits } from './Curate.jsx';
import { initCosmetics } from '../../../platform/client/cosmetics.js';
import './styles.css';

initCosmetics({ themes: false });
const path = window.location.pathname.replace(/\/+$/, '');
const Page = path.endsWith('/curate') ? Curate : path.endsWith('/credits') ? Credits : App;

/* If anything unexpected breaks, say so and offer a way back. The game in progress is saved and can be resumed. */
class Safety extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { console.error('[macro-micro]', err); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="mm"><main className="menu"><h1 className="cur-h">Something went wrong.</h1>
        <p className="mm-note">Sorry about that. Your game is saved: reload and choose “Carry on”.</p>
        <button className="btn-main" onClick={() => window.location.reload()}>Reload</button></main></div>
    );
  }
}
createRoot(document.getElementById('root')).render(<Safety><Page /></Safety>);
