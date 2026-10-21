
import { NextRequest, NextResponse } from "next/server";
import { destroyAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  try {
    if (new URL(origin).host !== host) {
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  await destroyAdminSession();
  return NextResponse.json({ success: true });
}