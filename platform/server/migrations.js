/* Schema history. Append new entries; never edit or remove old ones. */
export const MIGRATIONS = [
  {
    id: 1, name: 'accounts, monetization, vault, stats',
    sql: `
      create table if not exists users (
        id uuid primary key, username text not null, username_lc text not null unique, pass_hash text not null,
        email text, role text not null default 'user', profile jsonb not null default '{}',
        public_credits boolean not null default true, stats_public boolean not null default false, featured boolean not null default false,
        link_code text not null unique, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
      );
      create table if not exists sessions (
        token_hash text primary key, user_id uuid not null references users(id) on delete cascade,
        created_at timestamptz not null default now(), expires_at timestamptz not null
      );
      create index if not exists sessions_user_idx on sessions(user_id);
      create table if not exists config (key text primary key, value jsonb not null, updated_at timestamptz not null default now());
      create table if not exists tiers (
        id text primary key, name text not null, rank int not null, price_cents int not null default 0, currency text not null default 'USD',
        perks jsonb not null default '[]', provider_ref text, active boolean not null default true, updated_at timestamptz not null default now()
      );
      create table if not exists subscriptions (
        id uuid primary key, user_id uuid not null references users(id) on delete cascade, tier_id text not null references tiers(id),
        provider text not null, status text not null, current_period_end timestamptz, payer_ref text, test boolean not null default false,
        note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (user_id, provider)
      );
      create index if not exists subscriptions_payer_idx on subscriptions(provider, payer_ref);
      create table if not exists payment_events (
        id uuid primary key, provider text not null, event_id text not null, type text not null, status text not null,
        user_id uuid references users(id) on delete set null, amount_cents int, currency text, payload jsonb not null,
        test boolean not null default false, received_at timestamptz not null default now(), unique (provider, event_id)
      );
      create table if not exists products (
        id text primary key, name text not null, category text not null, kind text not null, description text not null default '',
        min_tier text references tiers(id), keep boolean not null default false, collection text, data jsonb not null default '{}',
        available boolean not null default true, archived boolean not null default false, sort int not null default 0,
        created_at timestamptz not null default now(), updated_at timestamptz not null default now()
      );
      create table if not exists ownership (
        user_id uuid not null references users(id) on delete cascade, product_id text not null references products(id) on delete restrict,
        source text not null, acquired_at timestamptz not null default now(), primary key (user_id, product_id)
      );
      create table if not exists sponsors (
        id uuid primary key, name text not null, contact text, website text, notes text, created_at timestamptz not null default now()
      );
      create table if not exists placements (
        id text primary key, name text not null, type text not null, enabled boolean not null default true,
        desktop boolean not null default true, mobile boolean not null default true, width int, height int, description text
      );
      create table if not exists campaigns (
        id uuid primary key, placement_id text not null references placements(id), sponsor_id uuid references sponsors(id) on delete set null,
        status text not null default 'draft', title text not null, body text not null default '', image text, dest_url text,
        label text not null default 'Sponsored', game_slug text, sponsored boolean not null default true, start_at timestamptz, end_at timestamptz,
        sample boolean not null default false, created_by uuid, approved_by uuid, approved_at timestamptz,
        created_at timestamptz not null default now(), updated_at timestamptz not null default now()
      );
      create index if not exists campaigns_placement_idx on campaigns(placement_id, status);
      create table if not exists counters (day date not null, kind text not null, target text not null, n int not null default 0, primary key (day, kind, target));
      create table if not exists plays (
        id bigserial primary key, user_id uuid not null references users(id) on delete cascade, game text not null,
        score double precision, won boolean, meta jsonb not null default '{}', at timestamptz not null default now()
      );
      create index if not exists plays_user_idx on plays(user_id, at desc);
      create table if not exists newsletter_subscribers (
        id uuid primary key, email_lc text not null unique, status text not null, token_hash text not null,
        consent_at timestamptz, confirmed_at timestamptz, created_at timestamptz not null default now()
      );
      create table if not exists newsletter_issues (
        id uuid primary key, subject text not null, status text not null default 'draft', sponsor_name text, sponsor_text text, sponsor_url text,
        notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
      );
      create table if not exists dev_notes (
        id uuid primary key, title text not null, body text not null, min_tier text references tiers(id), published boolean not null default false,
        created_at timestamptz not null default now(), updated_at timestamptz not null default now()
      );
      create table if not exists audit_log (
        id bigserial primary key, actor_id uuid, action text not null, target text, details jsonb not null default '{}', at timestamptz not null default now()
      );
      create index if not exists audit_at_idx on audit_log(at desc)
    `,
  },
];
