import { NextResponse } from "next/server";
import { getWeather } from "@/lib/weatherClient";
import { parseLatLon } from "@/lib/validation";
import { ProviderError, ValidationError } from "@/lib/types";

export const revalidate = 600;

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  try {
    const { lat, lon } = parseLatLon(searchParams);
    const name = searchParams.get("name") ?? undefined;
    const snapshot = await getWeather(lat, lon, name);
    return NextResponse.json(snapshot);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof ProviderError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Unexpected error fetching weather" },
      { status: 500 },
    );
  }
}
