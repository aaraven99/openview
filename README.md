# OpenView

OpenView is an open-source market charting and paper-trading workspace inspired by professional charting workflows. It is an independent project and is not affiliated with TradingView.

## What is included in this first vertical slice

- Username/password-only sign up and log in with an HTTP-only signed session cookie.
- Server-side Polygon and Alpha Vantage adapters with visible delayed/simulated provider labels.
- Interactive candlestick/line chart canvas, symbol search, intervals, chart type controls, multi-chart layouts, tabs, watchlist, alerts surface, drawing rail, replay surface, and trading panel.
- Persistent paper trades with idempotency keys and a database-backed leaderboard query.
- PostgreSQL schema at `db/migrations/001_openview.sql`; the app also creates the same tables lazily on first database request.

## Local setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL`, `AUTH_SECRET`, and provider keys. The current checkout already has the provider keys and database URL, but it does not yet have `AUTH_SECRET`.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:3000`.

For Supabase, use the Postgres connection string in `DATABASE_URL`. This implementation intentionally uses a server-side PostgreSQL adapter rather than exposing a Supabase browser key. If you want Supabase Auth or Row Level Security later, add `SUPABASE_URL` and `SUPABASE_ANON_KEY` and migrate the custom username auth deliberately; username-only auth is not the default Supabase Auth flow.

## Vercel checklist

- Connect the GitHub repository `https://github.com/aaraven99/openview.git` to Vercel.
- Add `DATABASE_URL`, `AUTH_SECRET`, `POLYGON_API_KEY`, and `ALPHA_VANTAGE_API_KEY` as server-side environment variables for Preview and Production.
- Use a pooled Supabase connection string where available and keep `prepare: false` enabled for serverless connections.
- Run a production smoke test for signup, login, provider status, paper order persistence, logout, and leaderboard visibility after the first deployment.

## Known boundaries

- Provider limits or invalid keys intentionally fall back to a simulated chart feed instead of pretending it is live.
- The current paper accounting records fills and cash movements, but portfolio mark-to-market, short-sale validation, fees/slippage, seasonal leaderboard rules, and server-side authorization/RLS need a follow-up hardening pass before public competition use.
- Broker execution is not connected; all orders are simulated.
