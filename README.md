# OpenView

OpenView is an open-source market charting and paper-trading workspace inspired by professional charting workflows. It is an independent project and is not affiliated with TradingView.

## What is included in this first vertical slice

- Username/password-only sign up and log in with an HTTP-only signed session cookie.
- Server-side provider router: Polygon, Financial Modeling Prep, a Yahoo Finance public-chart fallback, and Alpha Vantage. Every response has a visible real-time, delayed, end-of-day, unofficial, or simulated label.
- Interactive candlestick/line chart canvas, symbol search, intervals, chart type controls, multi-chart layouts, tabs, watchlist, alerts surface, drawing rail, replay surface, and trading panel.
- Persistent paper trades with idempotency keys and a database-backed leaderboard query.
- PostgreSQL schema at `db/migrations/001_openview.sql`; the app also creates the same tables lazily on first database request.

## Local setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL`, `AUTH_SECRET`, `POLYGON_API_KEY`, `ALPHA_VANTAGE_API_KEY`, and `FINANCIAL_MODELING_PREP`. Keep `.env` private.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:3000`.

For Supabase, use the Postgres connection string in `DATABASE_URL`. This implementation intentionally uses a server-side PostgreSQL adapter rather than exposing a Supabase browser key. If you want Supabase Auth or Row Level Security later, add `SUPABASE_URL` and `SUPABASE_ANON_KEY` and migrate the custom username auth deliberately; username-only auth is not the default Supabase Auth flow.

## Vercel checklist

- Connect the GitHub repository `https://github.com/aaraven99/openview.git` to Vercel.
- Add `DATABASE_URL`, `AUTH_SECRET`, `POLYGON_API_KEY`, `ALPHA_VANTAGE_API_KEY`, `FINANCIAL_MODELING_PREP`, and `MARKET_DATA_ENABLE_YAHOO_FALLBACK` as server-side environment variables for Preview and Production.
- `AUTH_SECRET` is mandatory in production. The application deliberately refuses the development fallback there.
- Use a pooled Supabase connection string where available and keep `prepare: false` enabled for serverless connections.
- Run a production smoke test for signup, login, provider status, paper order persistence, logout, and leaderboard visibility after the first deployment.

## Known boundaries

- Provider limits or invalid keys intentionally fall back through the documented router and, only as a last resort, a simulated chart feed instead of pretending it is live. Read [`docs/data-sources.md`](docs/data-sources.md) before enabling another provider or relying on free/unofficial data in a public deployment.
- The current paper accounting records fills and cash movements, but portfolio mark-to-market, short-sale validation, fees/slippage, seasonal leaderboard rules, and server-side authorization/RLS need a follow-up hardening pass before public competition use.
- Broker execution is not connected; all orders are simulated.
