/* How a profile looks anywhere on the site. Everything shown here comes from the server. */
import React from 'react';
import { Heart, Sprout, Zap, FlaskConical, Crown, Gem, Cake, Trophy, Ghost, Star } from 'lucide-react';

const ICONS = { heart: Heart, sprout: Sprout, bolt: Zap, flask: FlaskConical, crown: Crown, gem: Gem, cake: Cake, trophy: Trophy, pumpkin: Ghost, star: Star };
export function BadgeIcon({ badge, size = 18 }) {
  if (!badge) return null;
  if (badge.icon === 'og') return <span className={`badge-og ${badge.animated ? 'anim' : ''}`} style={{ '--bc': badge.color }} title={badge.name}>OG</span>;
  const I = ICONS[badge.icon] || Star;
  return <span className={`badge-ico ${badge.animated ? 'anim' : ''}`} style={{ '--bc': badge.color }} title={badge.name}><I size={size} strokeWidth={2.4} /></span>;
}

export function ProfileCard({ card, compact }) {
  if (!card) return null;
  const deco = card.decoration || {};
  return (
    <div className={`pcard ${compact ? 'compact' : ''} border-${deco.border || 'plain'} pattern-${deco.pattern || 'none'}`} data-theme={card.theme || 'paper'} style={{ '--acc': card.accent || '#141414' }}>
      <div className="pcard-head">
        <span className="pcard-avatar" aria-hidden="true">{card.username.slice(0, 1).toUpperCase()}</span>
        <div className="pcard-who">
          <b>{card.username} <BadgeIcon badge={card.badge} size={compact ? 14 : 17} /></b>
          {card.title ? <span className="pcard-title">{card.title}</span> : <span className="pcard-title none">No title yet</span>}
        </div>
      </div>
      {!compact && <div className="pcard-foot">{card.supporter ? <span className="pcard-sup">{card.supporter.name}</span> : <span className="pcard-free">oddball player</span>}</div>}
    </div>
  );
}

/* Little previews used by Vault cards. */
export function ItemPreview({ item, base }) {
  const card = { username: base || 'you', title: null, badge: null, accent: null, decoration: null, theme: null };
  if (item.kind === 'title') card.title = item.data.text;
  if (item.kind === 'badge') card.badge = { name: item.name, ...item.data };
  if (item.kind === 'accent') card.accent = item.data.color;
  if (item.kind === 'decoration') card.decoration = item.data;
  if (item.kind === 'theme') card.theme = item.data.theme;
  if (item.kind === 'trail') return <div className={`trail-prev t-${item.data.trail}`} aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>;
  return <ProfileCard card={card} compact />;
}
