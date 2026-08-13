# Market data sources

OpenView routes requests by freshness and compatible interval. It does **not** round-robin providers: switching between feeds mid-session can mix delayed, real-time, adjusted, and end-of-day prices.

## Active adapters

1. **Polygon** — first choice when its aggregate result is fresh for the requested interval. The application exposes the provider's `real-time` or `delayed` response status.
2. **Financial Modeling Prep** — server-side daily OHLCV fallback. The configured plan has been verified for current quotes and end-of-day historical prices; its 1-minute and 5-minute historical endpoints returned plan-restricted responses during integration.
3. **Yahoo Finance public chart feed** — enabled as the intraday fallback unless `MARKET_DATA_ENABLE_YAHOO_FALLBACK=false`. This is the public upstream commonly consumed by Python's `yfinance`; it is not a licensed streaming exchange feed. OpenView labels it `unofficial` and it must not be represented as live, redistributed, or relied upon for trading without confirming the applicable terms and display rights.
4. **Alpha Vantage** — daily end-of-day fallback.
5. **OpenView demo feed** — only when all configured providers fail. It is visibly labelled `simulated`.

All keys are server-only. Do not use `NEXT_PUBLIC_` or `VITE_` prefixes for any provider key.

## Optional streaming providers

These are reasonable additions once you create the respective account and add the server-only secret to both local `.env` and Vercel. They are intentionally not enabled merely by adding blank keys, because plans, exchange coverage, and display rights vary.

| Provider | Useful free or entry-level capability | Required variables | Important boundary |
| --- | --- | --- | --- |
| Alpaca | Live IEX exchange WebSocket for free accounts | `ALPACA_API_KEY`, `ALPACA_API_SECRET` | Free stream is IEX only, not consolidated SIP. |
| Twelve Data | REST data and limited WebSocket testing on entry tiers | `TWELVE_DATA_API_KEY` | Subscription and symbol limits depend on plan; do not call it universally free streaming. |
| Finnhub | Quote and WebSocket API options | `FINNHUB_API_KEY` | Verify your plan, exchange, and display permissions before enabling a public UI. |
| yfinance | Python library backed by Yahoo Finance | a separately deployed `YFINANCE_SERVICE_URL` if used | It cannot run as a dependable Vercel streaming service; prefer a dedicated worker and label it unofficial. |

Before adding any new provider to the automatic router, validate a symbol, a live-session timestamp, entitlement response, and the permitted user-facing display use. The source/status badge must remain accurate.

## Hugging Face OHLCV-1m reference

OpenView pins the external dataset rather than copying it into this repository:

- Source: [`mito0o852/OHLCV-1m`](https://huggingface.co/datasets/mito0o852/OHLCV-1m)
- Pinned revision: `776328445b7ac6e7815ef3a483e9c8ded1eb6d56` (checked 2026-08-12)
- Format: monthly Parquet files with `timestamp`, `open`, `high`, `low`, `close`, `volume`, and `ticker`.
- Coverage claimed by the dataset card: U.S. one-minute OHLCV, 1992–2026.
- Storage: one recent monthly object is about 443 MiB; this is unsuitable for a normal Git repository and would unnecessarily download data to contributors' machines.
- License: no license is declared in the dataset metadata/card as checked. Do not mirror, redistribute, or train on it through OpenView until the dataset owner supplies a license compatible with your intended use.

It is deliberately **not** downloaded, installed, added as a Git submodule, or served from Vercel. If licensing is clarified, the appropriate next step is an on-demand historical-data worker that reads only a requested month/symbol range from the Hub (or a separately licensed object store), with caching and provenance metadata.
