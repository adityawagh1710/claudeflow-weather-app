import { NextResponse } from "next/server";

export const revalidate = 600;

const DEFAULT_LOCATION = {
  latitude: 51.5072,
  longitude: -0.1276,
  name: "London",
};

type IpApiResponse = {
  latitude?: number;
  longitude?: number;
  city?: string;
  error?: boolean;
};

export async function GET(): Promise<NextResponse> {
  try {
    const res = await fetch("https://ipapi.co/json/", {
      next: { revalidate: 600 },
    });
    if (!res.ok) {
      return NextResponse.json(DEFAULT_LOCATION);
    }
    const data = (await res.json()) as IpApiResponse;
    if (
      data.error ||
      typeof data.latitude !== "number" ||
      typeof data.longitude !== "number"
    ) {
      return NextResponse.json(DEFAULT_LOCATION);
    }
    return NextResponse.json({
      latitude: data.latitude,
      longitude: data.longitude,
      name: data.city ?? "Current location",
    });
  } catch {
    return NextResponse.json(DEFAULT_LOCATION);
  }
}
