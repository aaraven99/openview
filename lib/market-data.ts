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

export async function getMarketData(symbol: string, interval = "5m") {
  const cleanSymbol = symbol.toUpperCase().replace(/[^A-Z0-9:._-]/g, "").slice(0, 20) || "NVDA";
  const polygonKey = process.env.POLYGON_API_KEY;
  if (polygonKey) {
    try {
      const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(cleanSymbol)}/range/5/minute/${new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString().slice(0, 10)}/${new Date().toISOString().slice(0, 10)}?adjusted=true&sort=asc&limit=200&apiKey=${encodeURIComponent(polygonKey)}`;
      const response = await fetch(url, { next: { revalidate: 30 } });
      const payload = await response.json();
      if (response.ok && Array.isArray(payload.results) && payload.results.length > 5) {
        return { source: "Polygon", status: "delayed", candles: payload.results.map((row: { t: number; o: number; h: number; l: number; c: number; v: number }) => ({ time: Math.floor(row.t / 1000), open: row.o, high: row.h, low: row.l, close: row.c, volume: row.v })) as Candle[] };
      }
    } catch { /* fallback below keeps the UI honest */ }
  }
  const alphaKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (alphaKey && !cleanSymbol.includes(":")) {
    try {
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${encodeURIComponent(cleanSymbol)}&interval=5min&outputsize=compact&apikey=${encodeURIComponent(alphaKey)}`;
      const response = await fetch(url, { next: { revalidate: 60 } });
      const payload = await response.json();
      const series = payload["Time Series (5min)"];
      if (series) {
        const candles = Object.entries(series).reverse().map(([stamp, raw]) => { const row = raw as Record<string, string>; return { time: Math.floor(new Date(stamp).getTime() / 1000), open: Number(row["1. open"]), high: Number(row["2. high"]), low: Number(row["3. low"]), close: Number(row["4. close"]), volume: Number(row["5. volume"]) }; });
        return { source: "Alpha Vantage", status: "delayed", candles };
      }
    } catch { /* fallback below keeps the UI honest */ }
  }
  return { source: "OpenView demo feed", status: "simulated", candles: seededCandles(cleanSymbol) };
}
