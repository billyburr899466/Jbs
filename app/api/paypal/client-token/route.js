import { NextResponse } from "next/server";
import {
  getBrowserSafeClientToken,
  getPublicPayPalStatus,
  publicPayPalError,
} from "../_lib/paypal";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const origin = new URL(request.url).origin;
    const token = await getBrowserSafeClientToken(origin);
    const publicStatus = getPublicPayPalStatus();

    return NextResponse.json(
      {
        accessToken: token.access_token,
        expiresIn: token.expires_in,
        environment: publicStatus.environment,
        sdkUrl: publicStatus.sdkUrl,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const safe = publicPayPalError(error);
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
