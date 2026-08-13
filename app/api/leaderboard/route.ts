import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db";

const demo = [
  { username: "chartsmith", returnPct: 18.42, equity: 118420, trades: 42 },
  { username: "candlecraft", returnPct: 12.71, equity: 112710, trades: 31 },
  { username: "northstar", returnPct: 8.96, equity: 108960, trades: 19 },
  { username: "openrange", returnPct: 4.28, equity: 104280, trades: 15 },
  { username: "newtrader", returnPct: -1.14, equity: 98860, trades: 8 },
];

export async function GET() {
  try {
    const db = await ensureSchema();
    const rows = await db`
      with traded as (select user_id, count(*)::int as trades from paper_trades group by user_id)
      select u.username, round(((a.cash_balance - a.starting_balance) / a.starting_balance * 100)::numeric, 2) as "returnPct", round(a.cash_balance::numeric, 2) as equity, coalesce(t.trades, 0)::int as trades
      from users u join lateral (select cash_balance, starting_balance from paper_accounts where user_id = u.id order by created_at asc limit 1) a on true left join traded t on t.user_id = u.id order by "returnPct" desc limit 50
    `;
    return NextResponse.json({ rows: rows.map(row => ({ username: String(row.username), returnPct: Number(row.returnPct), equity: Number(row.equity), trades: Number(row.trades) })), source: "database" });
  } catch { return NextResponse.json({ rows: demo, source: "demo" }); }
}
