"use client";

import { useEffect, useRef } from "react";
import { CandlestickSeries, ColorType, HistogramSeries, createChart } from "lightweight-charts";
import type { Candle } from "@/lib/market-data";

export function ChartCanvas({ candles, symbol, chartType }: { candles: Candle[]; symbol: string; chartType: "candles" | "line" | "area" }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !candles.length) return;
    const chart = createChart(ref.current, { layout: { background: { type: ColorType.Solid, color: "#0c0f14" }, textColor: "#7f8797" }, grid: { vertLines: { color: "#171c25" }, horzLines: { color: "#171c25" } }, rightPriceScale: { borderColor: "#242a36" }, timeScale: { borderColor: "#242a36", timeVisible: true, secondsVisible: false }, crosshair: { vertLine: { color: "#4b596d", labelBackgroundColor: "#293243" }, horzLine: { color: "#4b596d", labelBackgroundColor: "#293243" } } });
    chart.applyOptions({ width: ref.current.clientWidth, height: ref.current.clientHeight });
    const data = candles.map(c => ({ time: c.time as never, open: c.open, high: c.high, low: c.low, close: c.close }));
    if (chartType === "candles") { const series = chart.addSeries(CandlestickSeries, { upColor: "#54d6c5", downColor: "#ff6b79", borderVisible: false, wickUpColor: "#54d6c5", wickDownColor: "#ff6b79" }); series.setData(data); }
    else { const series = chart.addSeries(HistogramSeries, { color: "#54d6c5", priceFormat: { type: "price", precision: 2, minMove: 0.01 }, priceScaleId: "" }); series.setData(candles.map(c => ({ time: c.time as never, value: c.close, color: c.close >= c.open ? "#54d6c5" : "#ff6b79" }))); }
    chart.timeScale().fitContent();
    const resize = () => { if (ref.current) chart.applyOptions({ width: ref.current.clientWidth, height: ref.current.clientHeight }); };
    window.addEventListener("resize", resize); return () => { window.removeEventListener("resize", resize); chart.remove(); };
  }, [candles, chartType, symbol]);
  return <div ref={ref} className="chart-container" aria-label={`${symbol} interactive ${chartType} chart`} />;
}
