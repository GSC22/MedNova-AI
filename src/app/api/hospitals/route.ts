// ============================================================
// MedNova-AI — /api/hospitals Route Handler
// Server-side proxy for OpenStreetMap Overpass API
// Bypasses browser CORS restrictions by fetching server-to-server
// ============================================================

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

interface OSMElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

async function fetchFromOverpassWithFallback(
  query: string
): Promise<{ elements: OSMElement[] }> {
  let lastError: Error | null = null;

  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(mirror, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(20_000),
      });

      if (!res.ok) {
        lastError = new Error(`Mirror ${mirror} returned ${res.status}`);
        continue;
      }

      const data = (await res.json()) as { elements: OSMElement[] };
      return data;
    } catch (err) {
      lastError =
        err instanceof Error ? err : new Error(`Mirror ${mirror} failed`);
      continue;
    }
  }

  throw lastError ?? new Error("All Overpass mirrors failed");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON in request body." },
      { status: 400 }
    );
  }

  const { lat, lng, amenityList, radius } = body as {
    lat?: number;
    lng?: number;
    amenityList?: string;
    radius?: number;
  };

  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    typeof amenityList !== "string" ||
    typeof radius !== "number"
  ) {
    return NextResponse.json(
      { success: false, error: "Missing or invalid parameters." },
      { status: 400 }
    );
  }

  const query = `
    [out:json][timeout:20];
    (
      node["amenity"~"${amenityList}"](around:${radius},${lat},${lng});
      way["amenity"~"${amenityList}"](around:${radius},${lat},${lng});
      relation["amenity"~"${amenityList}"](around:${radius},${lat},${lng});
      node["healthcare"~"hospital|clinic"](around:${radius},${lat},${lng});
      way["healthcare"~"hospital|clinic"](around:${radius},${lat},${lng});
    );
    out center tags;
  `;

  try {
    const data = await fetchFromOverpassWithFallback(query);
    return NextResponse.json(
      { success: true, elements: data.elements },
      {
        status: 200,
        headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=300" },
      }
    );
  } catch (err) {
    console.error("[MedNova] All Overpass mirrors failed:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to fetch hospital data right now. Map servers may be busy — please try again shortly.",
      },
      { status: 503 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { status: "operational", service: "MedNova Hospitals Proxy" },
    { status: 200 }
  );
}
