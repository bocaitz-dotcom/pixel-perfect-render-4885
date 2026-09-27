import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { NICHES } from "./niches";

const inputSchema = z.object({
  niche: z.string().trim().min(2).max(60),
  country: z.string().trim().min(2).max(60),
  state: z.string().trim().max(60).optional().default(""),
  city: z.string().trim().min(1).max(80),
  district: z.string().trim().max(80).optional().default(""),
  radiusKm: z.number().int().min(1).max(50),
  limit: z.number().int().min(10).max(200).optional().default(120),
});

export type SearchInput = z.infer<typeof inputSchema>;

export type SearchResult = {
  source: string;
  source_id: string;
  name: string;
  category: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours: string | null;
  maps_url: string | null;
  has_website: boolean;
  opportunity_score: number;
};

const UA = "ProspectSite/1.0 (prospeccao comercial; contato via app)";

function scoreOpportunity(hasWebsite: boolean, hasPhone: boolean): number {
  let score = 0;
  if (!hasWebsite) score += 60;
  if (hasPhone) score += 25;
  if (hasWebsite) score += 10;
  return Math.min(score, 100);
}

function buildAddress(tags: Record<string, string>): string | null {
  const parts = [
    [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(", "),
    tags["addr:suburb"] ?? tags["addr:neighbourhood"],
  ].filter(Boolean);
  return parts.length ? parts.join(" - ") : null;
}

export const searchCompanies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const locationQuery = [data.district, data.city, data.state, data.country]
      .filter((part) => part && part.length > 0)
      .join(", ");

    const geoUrl =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
      encodeURIComponent(locationQuery);

    const geoRes = await fetch(geoUrl, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!geoRes.ok) {
      return { ok: false as const, error: "Não foi possível localizar a região informada.", results: [] };
    }
    const geo = (await geoRes.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!geo.length) {
      return { ok: false as const, error: "Localidade não encontrada. Confira cidade, estado e país.", results: [] };
    }

    const lat = Number(geo[0]!.lat);
    const lon = Number(geo[0]!.lon);

    const niche = NICHES.find((n) => n.label.toLowerCase() === data.niche.toLowerCase());
    const filters = niche
      ? niche.filters
      : [`["name"~"${data.niche.replace(/[^\p{L}\p{N}\s]/gu, "").slice(0, 40)}",i]`];

    const radius = data.radiusKm * 1000;
    const body =
      `[out:json][timeout:40];(` +
      filters.map((f) => `nwr${f}(around:${radius},${lat},${lon});`).join("") +
      `);out center tags ${data.limit};`;

    const endpoints = [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.private.coffee/api/interpreter",
      "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
    ];
    let overpassRes: Response | null = null;
    let busy = false;
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": UA,
            Accept: "application/json",
          },
          body: "data=" + encodeURIComponent(body),
        });
        const ct = res.headers.get("content-type") ?? "";
        if (res.ok && ct.includes("json")) {
          overpassRes = res;
          break;
        }
        if (res.status === 429 || res.status === 504) busy = true;
        console.error(`[overpass] ${url} -> ${res.status} ${ct}`);
      } catch (err) {
        console.error(`[overpass] ${url} failed`, err);
      }
    }

    if (!overpassRes) {
      return {
        ok: false as const,
        error: busy
          ? "A fonte de dados está ocupada no momento. Tente novamente em alguns segundos."
          : "Falha ao consultar a fonte de dados. Tente novamente.",
        results: [],
      };
    }

    const payload = (await overpassRes.json()) as {
      elements: Array<{
        type: string;
        id: number;
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: Record<string, string>;
      }>;
    };

    const seen = new Set<string>();
    const results: SearchResult[] = [];

    for (const el of payload.elements ?? []) {
      const tags = el.tags ?? {};
      const name = tags["name"];
      if (!name) continue;

      const phone =
        tags["phone"] ??
        tags["contact:phone"] ??
        tags["contact:mobile"] ??
        tags["contact:whatsapp"] ??
        tags["mobile"] ??
        null;
      const website = tags["website"] ?? tags["contact:website"] ?? null;
      const dedupeKey = `${name.toLowerCase().trim()}|${phone ?? ""}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const latitude = el.lat ?? el.center?.lat ?? null;
      const longitude = el.lon ?? el.center?.lon ?? null;

      results.push({
        source: "openstreetmap",
        source_id: `${el.type}/${el.id}`,
        name,
        category: tags["amenity"] ?? tags["shop"] ?? tags["office"] ?? tags["leisure"] ?? tags["tourism"] ?? data.niche,
        phone,
        website,
        address: buildAddress(tags),
        city: tags["addr:city"] ?? data.city,
        state: tags["addr:state"] ?? (data.state || null),
        country: data.country,
        latitude,
        longitude,
        opening_hours: tags["opening_hours"] ?? null,
        maps_url:
          latitude && longitude ? `https://www.openstreetmap.org/${el.type}/${el.id}` : null,
        has_website: Boolean(website),
        opportunity_score: scoreOpportunity(Boolean(website), Boolean(phone)),
      });
    }

    results.sort((a, b) => b.opportunity_score - a.opportunity_score);

    return { ok: true as const, error: null, results, center: { lat, lon } };
  });
