import { NextResponse } from "next/server";
import { createPayPalOrder, publicPayPalError } from "../_lib/paypal";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const order = await createPayPalOrder(body);
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    const safe = publicPayPalError(error);
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
