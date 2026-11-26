import { NextResponse } from "next/server";
import { integrationStatus } from "@/lib/env";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(integrationStatus());
}
