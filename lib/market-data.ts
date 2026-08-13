export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };

const seedPrices: Record<string, number> = { NVDA: 224.13, AAPL: 229.78, MSFT: 528.43, TSLA: 329.65, AMZN: 231.48, BTCUSD: 118420, SPY: 644.22 };

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
    return { time: Math.floor(Date.now() / 1000) - (count - index) * 300, open, high, low, close, volume: 80000 + (index * 1731) % 90000 };
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

export async function getMarketData(symbol: string, interval = "5m") {
  const cleanSymbol = symbol.toUpperCase().replace(/[^A-Z0-9:._-]/g, "").slice(0, 20) || "NVDA";
  const polygonKey = process.env.POLYGON_API_KEY;
  if (polygonKey) {
    try {
      const { multiplier, timespan, lookbackDays } = polygonInterval(interval);
      const now = new Date();
      const from = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const to = now.toISOString().slice(0, 10);
      const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(cleanSymbol)}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=500&apiKey=${encodeURIComponent(polygonKey)}`;
      const response = await fetch(url, { next: { revalidate: 30 } });
      const payload = await response.json();
      if (response.ok && Array.isArray(payload.results) && payload.results.length > 5) {
        const candles = payload.results.map((row: { t: number; o: number; h: number; l: number; c: number; v: number }) => ({ time: Math.floor(row.t / 1000), open: row.o, high: row.h, low: row.l, close: row.c, volume: row.v })) as Candle[];
        const latestBarAge = Date.now() - candles[candles.length - 1].time * 1000;
        if (latestBarAge <= 72 * 60 * 60 * 1000) {
          return { source: "Polygon", status: payload.status === "DELAYED" ? "delayed" : "real-time", interval, candles };
        }
      }
    } catch { /* fallback below keeps the UI honest */ }
  }
  const alphaKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (alphaKey && !cleanSymbol.includes(":")) {
    try {
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(cleanSymbol)}&outputsize=compact&apikey=${encodeURIComponent(alphaKey)}`;
      const response = await fetch(url, { next: { revalidate: 60 } });
      const payload = await response.json();
      const series = payload["Time Series (Daily)"];
      if (series) {
        const candles = Object.entries(series).sort(([left], [right]) => left.localeCompare(right)).map(([stamp, raw]) => { const row = raw as Record<string, string>; return { time: Math.floor(new Date(`${stamp}T00:00:00Z`).getTime() / 1000), open: Number(row["1. open"]), high: Number(row["2. high"]), low: Number(row["3. low"]), close: Number(row["4. close"]), volume: Number(row["5. volume"]) }; });
        return { source: "Alpha Vantage", status: "end-of-day", interval: "1D", candles };
      }
    } catch { /* fallback below keeps the UI honest */ }
  }
  return { source: "OpenView demo feed", status: "simulated", interval, candles: seededCandles(cleanSymbol) };
}
