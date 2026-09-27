import { NextResponse } from "next/server";
import { getPublicPayPalStatus } from "../_lib/paypal";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getPublicPayPalStatus(), {
    headers: { "Cache-Control": "no-store" },
  });
}
