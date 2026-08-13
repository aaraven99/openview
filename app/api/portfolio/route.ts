import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureSchema } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ authenticated: false, cash: 100000, equity: 100000, pnl: 0, positions: [] });
  try {
    const db = await ensureSchema();
    const [account] = await db`select starting_balance, cash_balance from paper_accounts where user_id = ${user.id} order by created_at asc limit 1`;
    const trades = await db`select symbol, side, quantity, price, created_at from paper_trades where user_id = ${user.id} order by created_at desc limit 100`;
    return NextResponse.json({ authenticated: true, cash: Number(account?.cash_balance ?? 100000), equity: Number(account?.cash_balance ?? 100000), pnl: Number(account?.cash_balance ?? 100000) - Number(account?.starting_balance ?? 100000), positions: trades });
  } catch { return NextResponse.json({ authenticated: true, cash: 100000, equity: 100000, pnl: 0, positions: [], unavailable: true }); }
}
