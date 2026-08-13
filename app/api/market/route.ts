import { NextResponse } from "next/server";
import { getMarketData } from "@/lib/market-data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol") || "NVDA";
  const interval = url.searchParams.get("interval") || "5m";
  const data = await getMarketData(symbol, interval);
  return NextResponse.json(data, { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=120" } });
}
