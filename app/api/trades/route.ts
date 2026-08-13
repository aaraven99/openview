import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureSchema } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Log in to place paper trades." }, { status: 401 });
  try {
    const body = await request.json() as { symbol?: string; side?: string; quantity?: number; price?: number; orderType?: string; idempotencyKey?: string };
    const symbol = body.symbol?.toUpperCase().replace(/[^A-Z0-9:._-]/g, "").slice(0, 20);
    const side = body.side === "sell" ? "sell" : "buy";
    const quantity = Number(body.quantity);
    const price = Number(body.price);
    if (!symbol || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0) return NextResponse.json({ error: "Enter a valid symbol, quantity, and price." }, { status: 400 });
    const db = await ensureSchema();
    const key = body.idempotencyKey || crypto.randomUUID();
    const [trade] = await db`insert into paper_trades (user_id, symbol, side, quantity, price, order_type, idempotency_key) values (${user.id}, ${symbol}, ${side}, ${quantity}, ${price}, ${body.orderType || "market"}, ${key}) on conflict (idempotency_key) do nothing returning id, symbol, side, quantity, price, created_at`;
    if (!trade) return NextResponse.json({ ok: true, duplicate: true });
    await db`update paper_accounts set cash_balance = cash_balance + ${side === "buy" ? -quantity * price : quantity * price}, updated_at = now() where id = (select id from paper_accounts where user_id = ${user.id} order by created_at asc limit 1)`;
    return NextResponse.json({ ok: true, trade });
  } catch (error) { console.error("trade_failed", error); return NextResponse.json({ error: "Paper trade could not be saved. Check the database migration." }, { status: 503 }); }
}
