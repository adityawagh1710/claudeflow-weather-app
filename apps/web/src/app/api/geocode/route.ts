import { NextResponse } from "next/server";
import { geocode } from "@/lib/weatherClient";
import { parseQuery } from "@/lib/validation";
import { ProviderError, ValidationError } from "@/lib/types";

export const revalidate = 600;

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  try {
    const q = parseQuery(searchParams.get("q"));
    const results = await geocode(q);
    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof ProviderError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Unexpected error during geocoding" },
      { status: 500 },
    );
  }
}
