
import "server-only";

import {
  createHmac,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";

const scrypt = promisify(scryptCallback);

const COOKIE_NAME = "bbj_admin_session";
const SESSION_DURATION_SECONDS = 8 * 60 * 60;

type SessionPayload = {
  expiresAt: number;
};

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET must be set to a strong secret of at least 32 characters.",
    );
  }

  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", getAuthSecret())
    .update(value)
    .digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
}

export async function verifyAdminPassword(
  password: string,
): Promise<boolean> {
  const storedHash = process.env.ADMIN_PASSWORD_HASH;

  if (!storedHash || !storedHash.startsWith("scrypt$")) {
    return false;
  }

  const [, salt, expectedHex] = storedHash.split("$");

  if (!salt || !expectedHex || !/^[a-f0-9]{128}$/i.test(expectedHex)) {
    return false;
  }

  const derived = (await scrypt(password, salt, 64)) as Buffer;

  return safeEqual(derived.toString("hex"), expectedHex);
}

export async function createAdminSession(): Promise<void> {
  const expiresAt =
    Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;

  const payload = Buffer.from(
    JSON.stringify({ expiresAt } satisfies SessionPayload),
  ).toString("base64url");

  const token = `${payload}.${sign(payload)}`;
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;

  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payload, signature] = parts;

  try {
    if (!safeEqual(signature, sign(payload))) return false;

    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    const session = JSON.parse(decoded) as SessionPayload;

    return (
      Number.isSafeInteger(session.expiresAt) &&
      session.expiresAt > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

export async function destroyAdminSession(): Promise<void> {
  (await cookies()).set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
