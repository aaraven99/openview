import { NextResponse } from "next/server";
import { setSession, verifyPassword } from "@/lib/auth";
import { ensureSchema } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { username?: string; password?: string };
    const username = body.username?.trim().toLowerCase() || "";
    const password = body.password || "";
    const db = await ensureSchema();
    const [user] = await db`select id, username, password_hash from users where username = ${username} limit 1`;
    if (!user || !(await verifyPassword(password, String(user.password_hash)))) return NextResponse.json({ error: "Username or password is incorrect." }, { status: 401 });
    await setSession({ id: String(user.id), username: String(user.username) });
    return NextResponse.json({ user: { id: String(user.id), username: String(user.username) } });
  } catch (error) {
    console.error("login_failed", error);
    return NextResponse.json({ error: "Log in could not reach the database. Check DATABASE_URL and run the migration." }, { status: 503 });
  }
}
