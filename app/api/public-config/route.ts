import { NextResponse } from "next/server";

import { env } from "@/lib/env";

/** Runtime values the browser needs that are not secrets (read at request time, not baked in at build). */
export function GET() {
  return NextResponse.json(
    { discordUrl: env.MANAR_DISCORD_URL ?? null },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
