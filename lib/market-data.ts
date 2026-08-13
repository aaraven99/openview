export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type MarketData = {
  source: string;
  status: "real-time" | "delayed" | "end-of-day" | "unofficial" | "simulated";
  interval: string;
  candles: Candle[];
};

const seedPrices: Record<string, number> = {
  NVDA: 224.13,
  AAPL: 229.78,
  MSFT: 528.43,
  TSLA: 329.65,
  AMZN: 231.48,
  BTCUSD: 118420,
  SPY: 644.22,
};

function seededCandles(symbol: string, count = 90): Candle[] {
  const base = seedPrices[symbol.toUpperCase()] ?? 100;
  let value = base * 0.94;
  return Array.from({ length: count }, (_, index) => {
    const wave = Math.sin(index / 6) * base * 0.008;
    const drift = base * 0.0006;
    const open = value;
    const close = Math.max(0.01, value + wave + drift);
    const high = Math.max(open, close) + base * (0.002 + (index % 3) * 0.0007);
    const low = Math.min(open, close) - base * (0.002 + (index % 4) * 0.0005);
    value = close;
    return {
      time: Math.floor(Date.now() / 1000) - (count - index) * 300,
      open,
      high,
      low,
      close,
      volume: 80000 + (index * 1731) % 90000,
    };
  });
}

function polygonInterval(interval: string) {
  switch (interval) {
    case "1m": return { multiplier: 1, timespan: "minute", lookbackDays: 14 };
    case "15m": return { multiplier: 15, timespan: "minute", lookbackDays: 21 };
    case "1h": return { multiplier: 1, timespan: "hour", lookbackDays: 90 };
    case "1D": return { multiplier: 1, timespan: "day", lookbackDays: 730 };
    default: return { multiplier: 5, timespan: "minute", lookbackDays: 14 };
  }
}

function yahooInterval(interval: string) {
  switch (interval) {
    case "1m": return { interval: "1m", range: "5d" };
    case "15m": return { interval: "15m", range: "1mo" };
    case "1h": return { interval: "1h", range: "3mo" };
    case "1D": return { interval: "1d", range: "5y" };
    default: return { interval: "5m", range: "1mo" };
  }
}

function isFresh(candles: Candle[], maxAgeMs: number) {
  return candles.length > 5 && Date.now() - candles[candles.length - 1].time * 1000 <= maxAgeMs;
}

function validCandle(candle: Candle) {
  return [candle.open, candle.high, candle.low, candle.close, candle.volume].every(Number.isFinite)
    && candle.close > 0;
}

async function getPolygonData(symbol: string, interval: string): Promise<MarketData | null> {
  const polygonKey = process.env.POLYGON_API_KEY;
  if (!polygonKey) return null;

  try {
    const { multiplier, timespan, lookbackDays } = polygonInterval(interval);
    const now = new Date();
    const from = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const to = now.toISOString().slice(0, 10);
    const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=500&apiKey=${encodeURIComponent(polygonKey)}`;
    const response = await fetch(url, { next: { revalidate: 30 } });
    const payload = await response.json();
    if (!response.ok || !Array.isArray(payload.results)) return null;

    const candles = payload.results
      .map((row: { t: number; o: number; h: number; l: number; c: number; v: number }) => ({
        time: Math.floor(row.t / 1000), open: row.o, high: row.h, low: row.l, close: row.c, volume: row.v,
      }))
      .filter(validCandle) as Candle[];

    if (!isFresh(candles, 72 * 60 * 60 * 1000)) return null;
    return {
      source: "Polygon",
      status: payload.status === "DELAYED" ? "delayed" : "real-time",
      interval,
      candles,
    };
  } catch {
    return null;
  }
}

async function getYahooFinanceData(symbol: string, interval: string): Promise<MarketData | null> {
  if (process.env.MARKET_DATA_ENABLE_YAHOO_FALLBACK === "false" || symbol.includes(":")) return null;

  try {
    const request = yahooInterval(interval);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${request.range}&interval=${request.interval}&includePrePost=false`;
    const response = await fetch(url, {
      headers: { "User-Agent": "OpenView/0.1 (open-source charting workspace)" },
      next: { revalidate: 60 },
    });
    const payload = await response.json();
    const result = payload?.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    if (!response.ok || !Array.isArray(result?.timestamp) || !quote) return null;

    const candles = result.timestamp.map((time: number, index: number) => ({
      time,
      open: Number(quote.open?.[index]),
      high: Number(quote.high?.[index]),
      low: Number(quote.low?.[index]),
      close: Number(quote.close?.[index]),
      volume: Number(quote.volume?.[index] ?? 0),
    })).filter(validCandle) as Candle[];

    if (candles.length <= 5) return null;
    return {
      source: "Yahoo Finance public chart feed",
      status: "unofficial",
      interval,
      candles,
    };
  } catch {
    return null;
  }
}

async function getFinancialModelingPrepData(symbol: string): Promise<MarketData | null> {
  const key = process.env.FINANCIAL_MODELING_PREP ?? process.env.FINANCIAL_MODELING_PREP_API_KEY;
  if (!key || symbol.includes(":")) return null;

  try {
    const url = `https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`;
    const response = await fetch(url, { next: { revalidate: 60 } });
    const payload = await response.json();
    if (!response.ok || !Array.isArray(payload)) return null;

    const candles = payload.map((row: Record<string, unknown>) => ({
      time: Math.floor(new Date(`${String(row.date)}T00:00:00Z`).getTime() / 1000),
      open: Number(row.open), high: Number(row.high), low: Number(row.low), close: Number(row.close), volume: Number(row.volume),
    })).filter(validCandle).sort((left, right) => left.time - right.time) as Candle[];

    if (candles.length <= 5) return null;
    return { source: "Financial Modeling Prep", status: "end-of-day", interval: "1D", candles };
  } catch {
    return null;
  }
}

async function getAlphaVantageData(symbol: string): Promise<MarketData | null> {
  const alphaKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!alphaKey || symbol.includes(":")) return null;

  try {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=compact&apikey=${encodeURIComponent(alphaKey)}`;
    const response = await fetch(url, { next: { revalidate: 60 } });
    const payload = await response.json();
    const series = payload["Time Series (Daily)"];
    if (!response.ok || !series) return null;

    const candles = Object.entries(series).sort(([left], [right]) => left.localeCompare(right)).map(([stamp, raw]) => {
      const row = raw as Record<string, string>;
      return {
        time: Math.floor(new Date(`${stamp}T00:00:00Z`).getTime() / 1000),
        open: Number(row["1. open"]), high: Number(row["2. high"]), low: Number(row["3. low"]),
        close: Number(row["4. close"]), volume: Number(row["5. volume"]),
      };
    }).filter(validCandle) as Candle[];

    return candles.length > 5 ? { source: "Alpha Vantage", status: "end-of-day", interval: "1D", candles } : null;
  } catch {
    return null;
  }
}

/**
 * Uses the freshest compatible licensed feed first, then degrades explicitly.
 * We do not round-robin responses: a provider may be live while another is delayed,
 * rate-limited, or returning a different adjusted-price methodology.
 */
export async function getMarketData(symbol: string, interval = "5m"): Promise<MarketData> {
  const cleanSymbol = symbol.toUpperCase().replace(/[^A-Z0-9:._-]/g, "").slice(0, 20) || "NVDA";
  const polygon = await getPolygonData(cleanSymbol, interval);
  if (polygon) return polygon;

  // FMP is the primary EOD source for daily charts. Yahoo's public endpoint is an
  // best-effort intraday fallback (the upstream commonly used by yfinance).
  if (interval === "1D") {
    const fmp = await getFinancialModelingPrepData(cleanSymbol);
    if (fmp) return fmp;
  }

  const yahoo = await getYahooFinanceData(cleanSymbol, interval);
  if (yahoo) return yahoo;

  const fmp = await getFinancialModelingPrepData(cleanSymbol);
  if (fmp) return fmp;

  const alpha = await getAlphaVantageData(cleanSymbol);
  if (alpha) return alpha;

  return { source: "OpenView demo feed", status: "simulated", interval, candles: seededCandles(cleanSymbol) };
}
