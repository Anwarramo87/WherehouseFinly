import { NextResponse } from "next/server";
import { createAdminAccount } from "@/lib/create-admin";

export async function POST() {
  const result = await createAdminAccount();
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
