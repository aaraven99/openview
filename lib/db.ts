import postgres from "postgres";

let sql: ReturnType<typeof postgres> | null = null;
let schemaReady: Promise<void> | null = null;

const schema = `
create extension if not exists pgcrypto;
create table if not exists users (id uuid primary key default gen_random_uuid(), username text not null unique, password_hash text not null, created_at timestamptz not null default now());
create table if not exists paper_accounts (id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade, name text not null default 'OpenView Primary', starting_balance numeric(18,2) not null default 100000, cash_balance numeric(18,2) not null default 100000, commission numeric(18,2) not null default 0, slippage_bps numeric(10,4) not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table paper_accounts add column if not exists name text default 'OpenView Primary';
alter table paper_accounts add column if not exists starting_balance numeric(18,2) default 100000;
alter table paper_accounts add column if not exists cash_balance numeric(18,2) default 100000;
alter table paper_accounts add column if not exists commission numeric(18,2) default 0;
alter table paper_accounts add column if not exists slippage_bps numeric(10,4) default 0;
update paper_accounts set name = coalesce(name, 'OpenView Primary'), starting_balance = coalesce(starting_balance, 100000), cash_balance = coalesce(cash_balance, 100000);
alter table paper_accounts alter column name set not null;
alter table paper_accounts alter column starting_balance set not null;
alter table paper_accounts alter column cash_balance set not null;
create table if not exists paper_trades (id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade, symbol text not null, side text not null check (side in ('buy', 'sell')), quantity numeric(18,6) not null check (quantity > 0), price numeric(18,6) not null check (price > 0), order_type text not null default 'market', idempotency_key text not null unique, created_at timestamptz not null default now());
create index if not exists paper_trades_user_created_idx on paper_trades(user_id, created_at desc);
create table if not exists watchlists (id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade, name text not null default 'Main watchlist', symbols jsonb not null default '[]'::jsonb, created_at timestamptz not null default now(), unique(user_id, name));
`;

export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  if (!process.env.DATABASE_URL) return null;
  if (!sql) {
    sql = postgres(process.env.DATABASE_URL, {
      max: 3,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return sql;
}

export async function ensureSchema() {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not configured");
  if (!schemaReady) {
    schemaReady = db.unsafe(schema).then(() => undefined).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
  return db;
}
