import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { ensureSchema } from "./db";

const COOKIE_NAME = "openview_session";

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "dev-only-openview-secret-change-me");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function setSession(user: { id: string; username: string }) {
  const token = await new SignJWT({ username: user.username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 14 });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || typeof payload.username !== "string") return null;
    return { id: payload.sub, username: payload.username };
  } catch {
    return null;
  }
}

export async function getUserFromRequest() {
  const user = await getCurrentUser();
  if (!user) return null;
  const db = await ensureSchema();
  const rows = await db`select id, username from users where id = ${user.id} limit 1`;
  return rows[0] ? { id: String(rows[0].id), username: String(rows[0].username) } : null;
}
