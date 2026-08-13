"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, Bell, BookOpen, CalendarDays, Crosshair, Eye, Grid2X2, LineChart,
  Lock, LogOut, Maximize2, Menu, PanelRight, Play, Plus, Ruler, Search,
  Settings2, SlidersHorizontal, Sparkles, Trash2, Trophy, Undo2, Watch, ZoomIn,
} from "lucide-react";
import { AuthScreen } from "./auth-screen";
import { ChartCanvas } from "./chart-canvas";
import type { Candle } from "@/lib/market-data";

type User = { id: string; username: string } | null;
type Tab = { id: string; name: string; symbol: string; color: string };
type LeaderRow = { username: string; returnPct: number; equity: number; trades: number };

const initialTabs: Tab[] = [
  { id: "main", name: "NVDA · momentum", symbol: "NVDA", color: "#54d6c5" },
  { id: "ideas", name: "Macro watch", symbol: "SPY", color: "#7196ff" },
];

const watchlist = [
  { symbol: "NVDA", name: "NVIDIA Corporation" }, { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." }, { symbol: "TSLA", name: "Tesla, Inc." },
  { symbol: "BTCUSD", name: "Bitcoin / U.S. Dollar" }, { symbol: "SPY", name: "SPDR S&P 500 ETF" },
];

const railTools = [Crosshair, LineChart, Ruler, SlidersHorizontal, Activity, Sparkles, BookOpen, ZoomIn, Lock, Eye, Trash2];

export function OpenViewApp() {
  const [user, setUser] = useState<User>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState("main");
  const [tabs, setTabs] = useState(initialTabs);
  const [symbol, setSymbol] = useState("NVDA");
  const [interval, setInterval] = useState("5m");
  const [feedInterval, setFeedInterval] = useState("5m");
  const [chartType, setChartType] = useState<"candles" | "line" | "area">("candles");
  const [grid, setGrid] = useState<1 | 2 | 4>(1);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [source, setSource] = useState("Loading market data");
  const [sidePanel, setSidePanel] = useState<"watchlist" | "alerts" | "leaderboard">("watchlist");
  const [leaderRows, setLeaderRows] = useState<LeaderRow[]>([]);
  const [tradeSide, setTradeSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("10");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((response) => response.json()).then((payload) => setUser(payload.user)).finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    fetch(`/api/market?symbol=${encodeURIComponent(symbol)}&interval=${interval}`)
      .then((response) => response.json())
      .then((payload) => {
        setCandles(payload.candles || []);
        setSource(`${payload.source} · ${payload.status}`);
        setFeedInterval(payload.interval || interval);
      })
      .catch(() => setSource("Market data unavailable"));
  }, [symbol, interval]);

  useEffect(() => {
    fetch("/api/leaderboard").then((response) => response.json()).then((payload) => setLeaderRows(payload.rows || []));
  }, []);

  const selected = useMemo(() => watchlist.find((item) => item.symbol === symbol) || { symbol, name: symbol }, [symbol]);
  const lastPrice = candles.at(-1)?.close ?? 0;
  const priorClose = candles.at(-2)?.close ?? 0;
  const changePct = priorClose ? ((lastPrice - priorClose) / priorClose) * 100 : 0;
  const changeLabel = `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`;
  const changeClass = changePct >= 0 ? "positive" : "negative";

  function changeSymbol(next: string) {
    const normalized = next.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
    if (!normalized) return;
    setSymbol(normalized);
    setTabs((current) => current.map((tab) => tab.id === activeTab ? { ...tab, symbol: normalized } : tab));
  }

  function createTab() {
    const id = `tab-${Date.now()}`;
    setTabs((current) => [...current, { id, name: "New analysis", symbol: "AAPL", color: "#e5ad59" }]);
    setActiveTab(id);
    setSymbol("AAPL");
  }

  async function placeTrade() {
    if (!user) {
      setNotice("Log in to persist paper trades.");
      return;
    }
    const response = await fetch("/api/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, side: tradeSide, quantity: Number(quantity), price: lastPrice, idempotencyKey: `${user.id}-${symbol}-${tradeSide}-${Date.now()}` }),
    });
    const payload = await response.json();
    setNotice(response.ok ? `${tradeSide.toUpperCase()} order recorded at ${lastPrice.toFixed(2)}` : payload.error || "Trade failed");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  if (!authChecked) return <div className="app-shell" />;

  return (
    <div className="app-shell">
      <header className="top-tabs">
        <div className="brand-mark">O</div>
        {tabs.map((tab) => (
          <button key={tab.id} className={`tab ${activeTab === tab.id ? "active" : ""}`} onClick={() => { setActiveTab(tab.id); setSymbol(tab.symbol); }}>
            <span><i className="tab-dot" style={{ background: tab.color }} />{tab.name}</span><span className="muted">×</span>
          </button>
        ))}
        <button className="icon-btn" onClick={createTab} aria-label="New chart tab"><Plus size={16} /></button>
        <div className="spacer" />
        <span className="status-pill">{source.toUpperCase()}</span>
        <div className="user-chip"><span className="avatar">{user ? user.username[0].toUpperCase() : "G"}</span>{user ? <><span>{user.username}</span><button className="icon-btn" onClick={logout} aria-label="Log out"><LogOut size={14} /></button></> : <span>Guest</span>}</div>
        <button className="icon-btn" aria-label="Main menu"><Menu size={18} /></button>
      </header>

      <div className="main-toolbar">
        <input className="symbol-input" value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} onKeyDown={(event) => event.key === "Enter" && changeSymbol(symbol)} aria-label="Symbol search" />
        <button className="icon-btn" onClick={() => changeSymbol(symbol)} aria-label="Search symbol"><Search size={16} /></button>
        <div className="toolbar-divider" />
        <div className="segmented">{["1m", "5m", "15m", "1h", "1D"].map((value) => <button key={value} className={interval === value ? "active" : ""} onClick={() => setInterval(value)}>{value}</button>)}</div>
        <div className="toolbar-divider" />
        <div className="segmented">{(["candles", "line", "area"] as const).map((value) => <button key={value} className={chartType === value ? "active" : ""} onClick={() => setChartType(value)}>{value === "candles" ? "Bars" : value[0].toUpperCase() + value.slice(1)}</button>)}</div>
        <button className="tool-btn"><Sparkles size={14} /> Indicators</button><button className="tool-btn"><Bell size={14} /> Alert</button><button className="tool-btn"><Play size={14} /> Replay</button><button className="tool-btn"><Undo2 size={14} /></button><button className="tool-btn"><Settings2 size={14} /></button>
        <div className="spacer" />
        <div className="segmented"><button className={grid === 1 ? "active" : ""} onClick={() => setGrid(1)}><LineChart size={14} /></button><button className={grid === 2 ? "active" : ""} onClick={() => setGrid(2)}><PanelRight size={14} /></button><button className={grid === 4 ? "active" : ""} onClick={() => setGrid(4)}><Grid2X2 size={14} /></button></div>
      </div>

      <div className="workspace">
        <aside className="left-rail">{railTools.map((Tool, index) => <button className={`icon-btn ${index === 0 ? "active" : ""}`} key={Tool.displayName || index} aria-label={`Drawing tool ${index + 1}`}><Tool size={17} /></button>)}<div className="rail-divider" /><button className="icon-btn"><Maximize2 size={16} /></button></aside>

        <main className="chart-zone">
          <div className="chart-toolbar">
            <div className="instrument-title"><span className="live-dot" /><div><strong>{selected.name}</strong><small>{symbol} · {feedInterval}{feedInterval !== interval ? ` feed for ${interval} request` : ""} · market data</small></div></div>
            <span className="mono">{lastPrice ? lastPrice.toFixed(2) : "Loading…"}</span><span className={`mono ${changeClass}`}>{changeLabel}</span>
            <div className="spacer" /><button className="tool-btn"><Watch size={14} /> Watchlist</button><button className="tool-btn"><CalendarDays size={14} /> Events</button><button className="tool-btn"><Maximize2 size={14} /> Fullscreen</button>
          </div>
          <div className={`chart-grid grid-${grid}`}>
            {Array.from({ length: grid }).map((_, index) => <section className="chart-card" key={index}><div className="chart-card-header"><span className="live-dot" /><strong>{index === 0 ? symbol : ["AAPL", "MSFT", "SPY"][index - 1]}</strong><span className="price">{index === 0 && lastPrice ? lastPrice.toFixed(2) : "—"}</span></div><div className="chart-overlay"><span>Volume</span><span>EMA 20</span><span>RSI 14</span></div><ChartCanvas candles={candles} symbol={symbol} chartType={chartType} /></section>)}
          </div>
          <div className="bottom-panel">
            <section className="bottom-card"><div className="bottom-label">OpenView paper portfolio</div><div className="metric-row"><span>Equity</span><strong>$100,000.00</strong></div><div className="metric-row"><span>Day P&amp;L</span><strong className="positive">+$0.00</strong></div><div className="metric-row"><span>Buying power</span><strong>$100,000.00</strong></div></section>
            <section className="bottom-card"><div className="bottom-label">Replay / strategy report</div><div className="metric-row"><span>Mode</span><strong className="muted">Historical practice</strong></div><div className="metric-row"><span>Trades</span><strong>0</strong></div><div className="metric-row"><span>Win rate</span><strong>—</strong></div></section>
            <section className="bottom-card"><div className="bottom-label">Data integrity</div><div className="metric-row"><span>Provider</span><strong>{source.split(" · ")[0]}</strong></div><div className="metric-row"><span>Timestamp</span><strong className="mono">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong></div><div className="metric-row"><span>Trading</span><strong className="amber">SIMULATED</strong></div></section>
          </div>
        </main>

        <aside className="right-panel">
          <div className="panel-head"><strong>{sidePanel === "watchlist" ? "Watchlist" : sidePanel === "alerts" ? "Alerts" : "Leaderboard"}</strong><button className="icon-btn" onClick={() => setSidePanel("watchlist")}><SlidersHorizontal size={14} /></button></div>
          {sidePanel === "watchlist" && <><input className="watch-search" placeholder="Search symbols…" />{watchlist.map((item) => { const active = item.symbol === symbol; return <button className={`watch-row ${active ? "selected" : ""}`} key={item.symbol} onClick={() => changeSymbol(item.symbol)}><span><span className="watch-symbol">{item.symbol}</span><span className="watch-name">{item.name}</span></span><span className={`watch-price ${active ? changeClass : "muted"}`}>{active && lastPrice ? lastPrice.toFixed(2) : "—"}<small style={{ display: "block", marginTop: 3 }}>{active && lastPrice ? changeLabel : "Select"}</small></span></button>; })}</>}
          {sidePanel === "alerts" && <div className="side-card"><h3>Price alerts</h3><p>No active alerts. Create an alert from the chart toolbar or right-click a price level.</p><button className="primary-btn">Create alert</button></div>}
          {sidePanel === "leaderboard" && <div>{leaderRows.slice(0, 8).map((row, index) => <div className="leader-row" key={row.username}><span className="rank">{index + 1}</span><span className="leader-name">{row.username}<small>{row.trades} paper trades</small></span><span className="leader-value">${row.equity.toLocaleString()}</span><span className={row.returnPct >= 0 ? "positive" : "negative"}>{row.returnPct >= 0 ? "+" : ""}{row.returnPct}%</span></div>)}</div>}
          {sidePanel === "watchlist" && <div className="side-card"><h3>Paper trading ticket</h3><div className="trade-toggle"><button className={`buy ${tradeSide === "buy" ? "active" : ""}`} onClick={() => setTradeSide("buy")}>Buy</button><button className={`sell ${tradeSide === "sell" ? "active" : ""}`} onClick={() => setTradeSide("sell")}>Sell</button></div><label className="field-label">Quantity</label><input className="field" value={quantity} onChange={(event) => setQuantity(event.target.value)} /><div className="metric-row"><span>Estimated fill</span><strong className="mono">${(Number(quantity || 0) * lastPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div><button className="primary-btn" onClick={placeTrade}>Place paper order</button>{notice && <p style={{ marginTop: 9, color: notice.includes("recorded") ? "var(--accent)" : "var(--amber)" }}>{notice}</p>}</div>}
          <div className="spacer" /><button className="tool-btn" style={{ margin: 10, textAlign: "left" }} onClick={() => setSidePanel("leaderboard")}><Trophy size={15} /> Open paper league</button>
        </aside>
      </div>
      {!user && <AuthScreen onComplete={setUser} />}
    </div>
  );
}
