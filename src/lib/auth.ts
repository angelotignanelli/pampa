import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

export { hashPassword, verifyPassword } from "@/lib/password";

const COOKIE = "cd_session";
const SECRET = process.env.AUTH_SECRET ?? "dev-secret-cambiar-en-produccion";

// --- Session cookie (userId firmado con HMAC) ---

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

export async function createSession(userId: string) {
  const token = `${userId}.${sign(userId)}`;
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  farmId: string | null;
};

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const [userId, sig] = token.split(".");
  if (!userId || !sig) return null;
  const expected = sign(userId);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role, farmId: user.farmId };
}

/** Lanza si no hay sesión. Para usar al inicio de cada server action. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw new Error("No autenticado");
  return user;
}

/** Dueño y encargado pueden gestionar (crear lotes, borrar, etc.). El peón solo carga datos. */
export function canManage(role: string): boolean {
  return role === "OWNER" || role === "MANAGER";
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
