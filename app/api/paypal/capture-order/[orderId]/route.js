import { NextResponse } from "next/server";
import { capturePayPalOrder, publicPayPalError } from "../../_lib/paypal";

export const dynamic = "force-dynamic";

export async function POST(_request, context) {
  try {
    const { orderId } = await context.params;
    const receipt = await capturePayPalOrder(orderId);
    return NextResponse.json(receipt);
  } catch (error) {
    const safe = publicPayPalError(error);
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
