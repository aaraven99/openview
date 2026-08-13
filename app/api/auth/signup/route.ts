import { NextResponse } from "next/server";
import { hashPassword, setSession } from "@/lib/auth";
import { ensureSchema } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { username?: string; password?: string };
    const username = body.username?.trim().toLowerCase() || "";
    const password = body.password || "";
    if (!/^[a-z0-9_]{3,24}$/.test(username)) return NextResponse.json({ error: "Username must be 3–24 characters using letters, numbers, or underscores." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    const db = await ensureSchema();
    const existing = await db`select id from users where username = ${username} limit 1`;
    if (existing.length) return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    const hash = await hashPassword(password);
    const result = await db.begin(async (tx) => {
      const [user] = await tx`insert into users (username, password_hash) values (${username}, ${hash}) returning id, username`;
      await tx`insert into paper_accounts (user_id, name, starting_balance, cash_balance) values (${user.id}, 'OpenView Primary', 100000, 100000)`;
      return user;
    });
    await setSession({ id: String(result.id), username: String(result.username) });
    return NextResponse.json({ user: { id: String(result.id), username: String(result.username) } });
  } catch (error) {
    console.error("signup_failed", error);
    return NextResponse.json({ error: "Sign up could not reach the database. Check DATABASE_URL and run the migration." }, { status: 503 });
  }
}
