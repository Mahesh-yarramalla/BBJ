
import { NextRequest, NextResponse } from "next/server";
import {
  createAdminSession,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const attempts = new Map<
  string,
  { count: number; resetAt: number }
>();

function getClientKey(request: NextRequest): string {
  // Use the first proxy-provided address when deployed behind a trusted proxy.
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function hasSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  const key = getClientKey(request);
  const now = Date.now();
  const current = attempts.get(key);

  if (current && current.resetAt > now && current.count >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again in 15 minutes." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((current.resetAt - now) / 1000)) },
      },
    );
  }

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 0, resetAt: now + WINDOW_MS });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const password =
    typeof body === "object" &&
    body !== null &&
    "password" in body &&
    typeof body.password === "string"
      ? body.password
      : "";

  if (!password || password.length > 1024) {
    return NextResponse.json(
      { error: "Enter a valid password." },
      { status: 400 },
    );
  }

  let valid = false;

  try {
    valid = await verifyAdminPassword(password);
  } catch {
    return NextResponse.json(
      { error: "Authentication is temporarily unavailable." },
      { status: 500 },
    );
  }

  if (!valid) {
    const entry = attempts.get(key) ?? {
      count: 0,
      resetAt: now + WINDOW_MS,
    };

    entry.count += 1;
    attempts.set(key, entry);

    return NextResponse.json(
      { error: "Invalid password." },
      { status: 401 },
    );
  }

  attempts.delete(key);
  await createAdminSession();

  return NextResponse.json({ success: true });
}
