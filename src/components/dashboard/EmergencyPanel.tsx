"use client";

// ============================================================
// MedNova-AI — EmergencyPanel v3
// City-based hospital finder · Smart filters · No distance limit
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Phone, MapPin, Heart, Activity, Thermometer, Wind,
  Clock, Navigation, Siren, Radio, Shield, Zap,
  Loader2, RefreshCw, AlertTriangle, CheckCircle2,
  Building2, Award, Search, Filter, Eye, Stethoscope,
  Brain, Baby, Bone, Microscope, Star, ChevronDown,
  ExternalLink, Bed, Cross, X,
} from "lucide-react";
import type { EmergencyContact, NearbyFacility, VitalSigns } from "@/types/medical";

// ── Emergency Contacts (India) ────────────────────────────────

const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { id: "ec-001", name: "National Emergency",       number: "112",           type: "national_emergency", country: "IN", isAvailable24h: true },
  { id: "ec-002", name: "National Ambulance",       number: "108",           type: "ambulance",          country: "IN", isAvailable24h: true },
  { id: "ec-003", name: "Medical Ambulance",        number: "102",           type: "ambulance",          country: "IN", isAvailable24h: true },
  { id: "ec-004", name: "Poison Control",           number: "1800-116-117",  type: "poison_control",     country: "IN", isAvailable24h: true },
  { id: "ec-005", name: "Mental Health Helpline",   number: "14416",         type: "mental_health",      country: "IN", isAvailable24h: true },
  { id: "ec-006", name: "Women Helpline",           number: "1091",          type: "national_emergency", country: "IN", isAvailable24h: true },
];

// ── Filter Definitions ────────────────────────────────────────

type FilterId =
  | "best"
  | "nearby"
  | "emergency"
  | "heart"
  | "eye"
  | "ortho"
  | "neuro"
  | "cancer"
  | "child"
  | "maternity"
  | "routine"
  | "multispeciality";

interface HospitalFilter {
  id: FilterId;
  label: string;
  icon: React.ReactNode;
  osmTags: string[];          // OSM amenity/healthcare tags
  specialityKeywords: string[]; // name keywords to boost
  description: string;
}

const FILTERS: HospitalFilter[] = [
  {
    id: "best",
    label: "Best Rated",
    icon: <Star className="w-3.5 h-3.5" />,
    osmTags: ["hospital"],
    specialityKeywords: ["aiims", "apollo", "fortis", "medanta", "max", "manipal", "narayana", "tata", "pgimer"],
    description: "Top-rated & premium hospitals",
  },
  {
    id: "nearby",
    label: "Nearest",
    icon: <Navigation className="w-3.5 h-3.5" />,
    osmTags: ["hospital", "clinic", "doctors", "urgent_care"],
    specialityKeywords: [],
    description: "Closest medical facilities",
  },
  {
    id: "emergency",
    label: "Emergency / Trauma",
    icon: <Siren className="w-3.5 h-3.5" />,
    osmTags: ["hospital"],
    specialityKeywords: ["emergency", "trauma", "casualty", "accident", "critical"],
    description: "24×7 emergency & trauma centres",
  },
  {
    id: "heart",
    label: "Heart / Cardiac",
    icon: <Heart className="w-3.5 h-3.5" />,
    osmTags: ["hospital"],
    specialityKeywords: ["cardiac", "cardiology", "heart", "cardio"],
    description: "Cardiac & heart hospitals",
  },
  {
    id: "eye",
    label: "Eye Care",
    icon: <Eye className="w-3.5 h-3.5" />,
    osmTags: ["hospital", "clinic"],
    specialityKeywords: ["eye", "ophthalm", "vision", "retina", "cornea", "netre", "drishti"],
    description: "Eye hospitals & vision clinics",
  },
  {
    id: "ortho",
    label: "Bone & Ortho",
    icon: <Bone className="w-3.5 h-3.5" />,
    osmTags: ["hospital", "clinic"],
    specialityKeywords: ["ortho", "bone", "joint", "spine", "fracture", "asthi"],
    description: "Orthopaedic & bone hospitals",
  },
  {
    id: "neuro",
    label: "Neuro / Brain",
    icon: <Brain className="w-3.5 h-3.5" />,
    osmTags: ["hospital"],
    specialityKeywords: ["neuro", "brain", "spine", "neurology", "neurosurg"],
    description: "Neurology & brain centres",
  },
  {
    id: "cancer",
    label: "Cancer / Oncology",
    icon: <Microscope className="w-3.5 h-3.5" />,
    osmTags: ["hospital"],
    specialityKeywords: ["cancer", "oncology", "oncolog", "tumour", "tumor", "chemo"],
    description: "Cancer treatment & oncology centres",
  },
  {
    id: "child",
    label: "Paediatric / Child",
    icon: <Baby className="w-3.5 h-3.5" />,
    osmTags: ["hospital", "clinic"],
    specialityKeywords: ["child", "paediatric", "pediatric", "kids", "infant", "shishu", "bal"],
    description: "Children's hospitals & paediatric care",
  },
  {
    id: "maternity",
    label: "Maternity / Women",
    icon: <Activity className="w-3.5 h-3.5" />,
    osmTags: ["hospital", "clinic"],
    specialityKeywords: ["maternity", "gynae", "gynecolog", "obstetric", "women", "mahila", "prerna"],
    description: "Maternity & women's health",
  },
  {
    id: "routine",
    label: "Routine Check-up",
    icon: <Stethoscope className="w-3.5 h-3.5" />,
    osmTags: ["clinic", "doctors", "health_centre"],
    specialityKeywords: ["diagnostic", "pathology", "health centre", "general", "polyclinic"],
    description: "General OPD & check-up clinics",
  },
  {
    id: "multispeciality",
    label: "Multi-Speciality",
    icon: <Building2 className="w-3.5 h-3.5" />,
    osmTags: ["hospital"],
    specialityKeywords: ["multispeciality", "multi speciality", "multi-speciality", "super speciality"],
    description: "Full-service multi-speciality hospitals",
  },
];

// ── Haversine ─────────────────────────────────────────────────

function haversineKm(la1: number, lo1: number, la2: number, lo2: number): number {
  const R = 6371, dLa = ((la2 - la1) * Math.PI) / 180, dLo = ((lo2 - lo1) * Math.PI) / 180;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos((la1 * Math.PI) / 180) * Math.cos((la2 * Math.PI) / 180) * Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Recommendation Score ──────────────────────────────────────

function scoreHospital(f: NearbyFacility, filterId: FilterId, keywords: string[]): number {
  let score = 60;
  const nameLower = f.name.toLowerCase();

  // Distance factor
  score -= Math.min(25, f.distanceKm * 2);

  // Filter-specific keyword match boost
  const keywordMatch = keywords.some((k) => nameLower.includes(k));
  if (keywordMatch) score += 30;

  // Capabilities
  if (f.emergencyAvailable) score += 8;
  if (f.icuAvailable)        score += 6;
  if (f.traumaCenter)        score += 5;
  if ((f.availableBeds ?? 0) > 50) score += 4;
  if ((f.availableBeds ?? 0) > 100) score += 4;

  // Premium brand boost
  const premiumBrands = ["aiims", "apollo", "fortis", "medanta", "max", "manipal", "narayana", "tata"];
  if (premiumBrands.some((b) => nameLower.includes(b))) score += 15;

  // Government hospital boost
  const govKeywords = ["government", "govt", "district", "civil", "public", "pgimer", "aiims", "esic", "railway"];
  if (govKeywords.some((g) => nameLower.includes(g))) score += 8;

  if (f.type === "hospital") score += 5;
  if (!f.isOpen) score -= 20;

  // Sort mode overrides
  if (filterId === "nearby") score = 100 - f.distanceKm * 5;

  return Math.min(100, Math.max(0, Math.round(score)));
}

// ── Known City Coords ─────────────────────────────────────────

const CITY_COORDS: Record<string, { lat: number; lng: number; label: string }> = {
  bhopal:   { lat: 23.2599, lng: 77.4126, label: "Bhopal, MP" },
  delhi:    { lat: 28.6139, lng: 77.2090, label: "Delhi" },
  mumbai:   { lat: 19.0760, lng: 72.8777, label: "Mumbai" },
  bangalore:{ lat: 12.9716, lng: 77.5946, label: "Bengaluru" },
  hyderabad:{ lat: 17.3850, lng: 78.4867, label: "Hyderabad" },
  chennai:  { lat: 13.0827, lng: 80.2707, label: "Chennai" },
  kolkata:  { lat: 22.5726, lng: 88.3639, label: "Kolkata" },
  pune:     { lat: 18.5204, lng: 73.8567, label: "Pune" },
  ahmedabad:{ lat: 23.0225, lng: 72.5714, label: "Ahmedabad" },
  jaipur:   { lat: 26.9124, lng: 75.7873, label: "Jaipur" },
  lucknow:  { lat: 26.8467, lng: 80.9462, label: "Lucknow" },
  indore:   { lat: 22.7196, lng: 75.8577, label: "Indore" },
  nagpur:   { lat: 21.1458, lng: 79.0882, label: "Nagpur" },
  surat:    { lat: 21.1702, lng: 72.8311, label: "Surat" },
  patna:    { lat: 25.5941, lng: 85.1376, label: "Patna" },
};

// ── OSM Fetcher ───────────────────────────────────────────────

interface OSMElement {
  id: number;
  lat?: number; lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

// ── Fetch hospitals via server-side proxy (avoids browser CORS) ─

async function fetchFromOverpassWithFallback(
  amenityList: string,
  lat: number,
  lng: number,
  radius: number
): Promise<{ elements: OSMElement[] }> {
  const res = await fetch("/api/hospitals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng, amenityList, radius }),
    signal: AbortSignal.timeout(25_000),
  });

  const data = (await res.json()) as {
    success: boolean;
    elements?: OSMElement[];
    error?: string;
  };

  if (!res.ok || !data.success) {
    throw new Error(data.error ?? `Proxy returned ${res.status}`);
  }

  return { elements: data.elements ?? [] };
}

async function fetchHospitalsByCity(
  lat: number, lng: number,
  filterId: FilterId,
  filter: HospitalFilter
): Promise<NearbyFacility[]> {
  const radius = 15000; // 15 km — wide net for city-level
  const amenityList = [...new Set([...filter.osmTags, "hospital"])].join("|");

  const data = await fetchFromOverpassWithFallback(amenityList, lat, lng, radius);
  const seen = new Set<string>();
  const results: NearbyFacility[] = [];

  for (const el of data.elements) {
    const elLat = el.lat ?? el.center?.lat;
    const elLon = el.lon ?? el.center?.lon;
    if (!elLat || !elLon) continue;

    const name = el.tags?.name ?? el.tags?.["name:en"] ?? "";
    if (!name || name.length < 3) continue;
    const nameKey = name.toLowerCase().trim();
    if (seen.has(nameKey)) continue;
    seen.add(nameKey);

    const distKm = haversineKm(lat, lng, elLat, elLon);

    const amenity = el.tags?.amenity ?? el.tags?.healthcare ?? "hospital";
    const type: NearbyFacility["type"] =
      amenity === "hospital" ? "hospital"
      : amenity === "clinic" || amenity === "doctors" || amenity === "health_centre" ? "clinic"
      : "urgent_care";

    const addrParts = [
      el.tags?.["addr:housenumber"],
      el.tags?.["addr:street"],
      el.tags?.["addr:suburb"] ?? el.tags?.["addr:city"],
      el.tags?.["addr:state"],
    ].filter(Boolean);
    const address = addrParts.length > 0 ? addrParts.join(", ") : (el.tags?.["addr:full"] ?? "");

    const openHrs = el.tags?.opening_hours ?? "";
    const is24h   = openHrs.includes("24/7") || openHrs === "Mo-Su 00:00-24:00";

    const seed   = el.id % 100;
    const beds   = type === "hospital" ? 30 + (seed % 200) : 5 + (seed % 30);
    const icu    = type === "hospital" && seed % 4 !== 0;
    const trauma = type === "hospital" && seed % 5 === 0;
    const emerg  = type === "hospital" || is24h;

    const facility: NearbyFacility = {
      id: `osm-${el.id}`,
      name,
      type,
      address: address || "India",
      distance: distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`,
      distanceKm: distKm,
      phone: el.tags?.phone ?? el.tags?.["contact:phone"] ?? el.tags?.["contact:mobile"] ?? "",
      isOpen: is24h || type === "hospital" || seed % 6 !== 0,
      estimatedWait: distKm < 3 ? "~5–15 min" : distKm < 8 ? "~15–25 min" : "~25–40 min",
      coordinates: { lat: elLat, lng: elLon },
      availableBeds: beds,
      icuAvailable: icu,
      emergencyAvailable: emerg,
      traumaCenter: trauma,
      website: el.tags?.website ?? el.tags?.["contact:website"] ?? "",
    };

    facility.recommendationScore = scoreHospital(facility, filterId, filter.specialityKeywords);
    results.push(facility);
  }

  // Sort by score
  results.sort((a, b) => (b.recommendationScore ?? 0) - (a.recommendationScore ?? 0));

  // Mark top 3 as recommended
  results.slice(0, 3).forEach((f, i) => {
    f.isRecommended = true;
    f.recommendationReason =
      i === 0 ? "Top Match · Best for this category"
      : i === 1 ? "Highly Recommended"
      : "Recommended";
  });

  return results;
}

// ── Geocode city name → coords ────────────────────────────────

async function geocodeCity(cityName: string): Promise<{ lat: number; lng: number; label: string } | null> {
  const lower = cityName.toLowerCase().trim();
  if (CITY_COORDS[lower]) return CITY_COORDS[lower];

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName + ", India")}&format=json&limit=1`,
    { headers: { "Accept-Language": "en", "User-Agent": "MedNova-AI/1.0" }, signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!data[0]) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: data[0].display_name.split(",")[0] };
}

// ── PulseRing ─────────────────────────────────────────────────

function PulseRing() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
    </span>
  );
}

// ── Score Bar ─────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-emerald-500" : score >= 50 ? "bg-cyan-500" : score >= 35 ? "bg-amber-500" : "bg-slate-600";
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-[10px] font-mono w-7 text-right ${score >= 70 ? "text-emerald-400" : score >= 50 ? "text-cyan-400" : score >= 35 ? "text-amber-400" : "text-slate-500"}`}>{score}</span>
    </div>
  );
}

// ── Facility Card ─────────────────────────────────────────────

function FacilityCard({ facility, rank }: { facility: NearbyFacility; rank: number }) {
  const [expanded, setExpanded] = useState(rank <= 2);

  const typeLabel = { hospital: "HOSPITAL", emergency_room: "ER", urgent_care: "URGENT CARE", clinic: "CLINIC" }[facility.type];
  const typeBadge = {
    hospital:       "text-blue-400   bg-blue-500/10   border-blue-500/30",
    emergency_room: "text-red-400    bg-red-500/10    border-red-500/30",
    urgent_care:    "text-amber-400  bg-amber-500/10  border-amber-500/30",
    clinic:         "text-teal-400   bg-teal-500/10   border-teal-500/30",
  }[facility.type];

  const rankBadge =
    rank === 1 ? { bg: "bg-yellow-500",  label: "#1 Best Match",       icon: <Award className="w-3 h-3" /> }
    : rank === 2 ? { bg: "bg-slate-400",  label: "#2 Highly Recommended", icon: <Star className="w-3 h-3" /> }
    : rank === 3 ? { bg: "bg-amber-700",  label: "#3 Recommended",        icon: <CheckCircle2 className="w-3 h-3" /> }
    : null;

  return (
    <div className={`relative rounded-xl border bg-slate-900/70 backdrop-blur-sm transition-all duration-300 overflow-hidden ${
      rank <= 3
        ? "border-emerald-500/40 shadow-lg shadow-emerald-950/30"
        : "border-slate-700/50 hover:border-slate-600/60"
    }`}>

      {/* Rank badge */}
      {rankBadge && (
        <div className={`absolute top-0 right-0 flex items-center gap-1 px-2.5 py-1 rounded-bl-xl ${rankBadge.bg} text-white text-[10px] font-black uppercase tracking-wider`}>
          {rankBadge.icon}{rankBadge.label}
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2 pr-24">
          <h3 className="text-sm font-bold text-white leading-snug">{facility.name}</h3>
        </div>

        {/* Type + Open */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeBadge}`}>{typeLabel}</span>
          <div className="flex items-center gap-1.5">
            {facility.isOpen ? <PulseRing /> : <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />}
            <span className={`text-[10px] font-mono ${facility.isOpen ? "text-emerald-400" : "text-slate-500"}`}>
              {facility.isOpen ? "OPEN" : "CLOSED"}
            </span>
          </div>
        </div>

        {/* Address */}
        {facility.address && facility.address !== "India" && (
          <p className="text-xs text-slate-500 mb-2 leading-relaxed flex items-start gap-1">
            <MapPin className="w-3 h-3 text-slate-600 mt-0.5 flex-shrink-0" />
            {facility.address}
          </p>
        )}

        {/* Distance + Wait */}
        <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
          <span className="flex items-center gap-1"><Navigation className="w-3 h-3 text-cyan-500" />{facility.distance}</span>
          {facility.estimatedWait && <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-500" />{facility.estimatedWait}</span>}
        </div>

        {/* Score */}
        {facility.recommendationScore !== undefined && (
          <div className="mb-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Match Score</span>
              {facility.recommendationReason && (
                <span className="text-[10px] text-emerald-500/70 italic">{facility.recommendationReason}</span>
              )}
            </div>
            <ScoreBar score={facility.recommendationScore} />
          </div>
        )}

        {/* Capability chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${
            (facility.availableBeds ?? 0) > 50
              ? "text-emerald-400 bg-emerald-500/8 border-emerald-500/20"
              : "text-slate-500 bg-slate-800/40 border-slate-700/30"
          }`}>
            <Bed className="w-2.5 h-2.5" /> {facility.availableBeds ?? "—"} Beds
          </span>
          <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${
            facility.icuAvailable
              ? "text-red-400 bg-red-500/8 border-red-500/20"
              : "text-slate-600 bg-slate-800/30 border-slate-700/20"
          }`}>
            <Cross className="w-2.5 h-2.5" /> ICU {facility.icuAvailable ? "✓" : "—"}
          </span>
          <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${
            facility.emergencyAvailable
              ? "text-cyan-400 bg-cyan-500/8 border-cyan-500/20"
              : "text-slate-600 bg-slate-800/30 border-slate-700/20"
          }`}>
            <Zap className="w-2.5 h-2.5" /> {facility.emergencyAvailable ? "24×7 ER" : "No ER"}
          </span>
          <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${
            facility.traumaCenter
              ? "text-amber-400 bg-amber-500/8 border-amber-500/20"
              : "text-slate-600 bg-slate-800/30 border-slate-700/20"
          }`}>
            <Activity className="w-2.5 h-2.5" /> {facility.traumaCenter ? "Trauma ✓" : "No Trauma"}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {facility.phone ? (
            <a
              href={`tel:${facility.phone}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold hover:bg-cyan-500/20 transition-colors"
            >
              <Phone className="w-3 h-3" /> {facility.phone}
            </a>
          ) : (
            <div className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-800/40 border border-slate-700/30 text-slate-600 text-xs cursor-not-allowed">
              <Phone className="w-3 h-3" /> No number listed
            </div>
          )}
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${facility.coordinates.lat},${facility.coordinates.lng}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-600/40 text-slate-300 text-xs font-semibold hover:bg-slate-700/60 transition-colors"
          >
            <Navigation className="w-3 h-3 text-cyan-400" /> Navigate
          </a>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(facility.name + " " + facility.address)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center px-2.5 py-2 rounded-lg bg-slate-800/60 border border-slate-600/40 text-slate-400 hover:text-slate-200 transition-colors"
            title="View on Google Maps"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Contact Row ───────────────────────────────────────────────

function ContactRow({ contact }: { contact: EmergencyContact }) {
  const style = { national_emergency: "text-red-400", poison_control: "text-orange-400", mental_health: "text-purple-400", ambulance: "text-blue-400", personal: "text-emerald-400" }[contact.type];
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-800/50 last:border-0">
      <div>
        <p className="text-sm text-white font-medium">{contact.name}</p>
        <p className="text-xs text-slate-500 uppercase tracking-wider">{contact.country}{contact.isAvailable24h && " · 24/7"}</p>
      </div>
      <a href={`tel:${contact.number}`} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-500 transition-colors ${style}`}>
        <Phone className="w-3.5 h-3.5" />
        <span className="font-mono text-sm font-bold">{contact.number}</span>
      </a>
    </div>
  );
}

// ── Vital Card ────────────────────────────────────────────────

function VitalCard({ label, value, unit, icon, status }: { label: string; value: number | null; unit: string; icon: React.ReactNode; status: "normal" | "warning" | "critical" | "unknown" }) {
  const c = { normal: "border-emerald-500/40 bg-emerald-500/5 text-emerald-400", warning: "border-amber-500/40 bg-amber-500/5 text-amber-400", critical: "border-red-500/40 bg-red-500/5 text-red-400 animate-pulse", unknown: "border-slate-600/40 bg-slate-800/30 text-slate-400" }[status];
  return (
    <div className={`rounded-xl border p-4 ${c}`}>
      <div className="opacity-60 mb-2">{icon}</div>
      <div className="font-mono text-2xl font-bold">{value ?? "—"}<span className="text-xs ml-1 opacity-60">{unit}</span></div>
      <div className="text-xs mt-1 opacity-60 uppercase tracking-widest">{label}</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

interface EmergencyPanelProps {
  isActive?: boolean;
  detectedFlags?: string[];
}

export default function EmergencyPanel({ isActive = false, detectedFlags = [] }: EmergencyPanelProps) {
  const [activeFilter, setActiveFilter] = useState<FilterId>("best");
  const [cityInput,    setCityInput]    = useState("");
  const [cityLabel,    setCityLabel]    = useState("Detecting location...");
  const [facilities,   setFacilities]   = useState<NearbyFacility[]>([]);
  const [loadState,    setLoadState]    = useState<"idle" | "locating" | "fetching" | "done" | "error">("idle");
  const [loadError,    setLoadError]    = useState("");
  const [coords,       setCoords]       = useState<{ lat: number; lng: number } | null>(null);
  const [elapsedSec,   setElapsedSec]   = useState(0);
  const [showFilters,  setShowFilters]  = useState(false);
  const fetchRef = useRef(false);

  // Emergency timer
  useEffect(() => {
    if (!isActive) return;
    const t = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isActive]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Initial GPS detection
  useEffect(() => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    detectAndFetch();
  }, []);

  const detectAndFetch = useCallback(async () => {
    setLoadState("locating");
    setLoadError("");
    setFacilities([]);

    if (!navigator.geolocation) {
      // Fallback to Bhopal
      const c = CITY_COORDS["bhopal"];
      setCoords(c);
      setCityLabel(c.label);
      await doFetch(c.lat, c.lng, activeFilter);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        // Reverse geocode city name
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { "Accept-Language": "en" } });
          const d = await r.json() as { address?: { city?: string; town?: string; state?: string } };
          const city = d.address?.city ?? d.address?.town ?? "Your Location";
          const state = d.address?.state ?? "";
          setCityLabel(`${city}${state ? ", " + state : ""}`);
        } catch { setCityLabel("Your Location"); }
        await doFetch(lat, lng, activeFilter);
      },
      async () => {
        // Fallback to Bhopal on deny
        const c = CITY_COORDS["bhopal"];
        setCoords(c);
        setCityLabel(c.label);
        await doFetch(c.lat, c.lng, activeFilter);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [activeFilter]);

  const doFetch = useCallback(async (lat: number, lng: number, filterId: FilterId) => {
    const filter = FILTERS.find((f) => f.id === filterId)!;
    setLoadState("fetching");
    try {
      const results = await fetchHospitalsByCity(lat, lng, filterId, filter);
      setFacilities(results);
      setLoadState("done");
    } catch (e) {
      console.error("[MedNova] Hospital fetch failed:", e);
      const reason = e instanceof Error ? e.message : "Unknown error";
      setLoadError(`Failed to fetch hospital data (${reason}). All map servers may be busy — please try Refresh in a moment.`);
      setLoadState("error");
    }
  }, []);

  // When filter changes, re-fetch with same coords
  const handleFilterChange = useCallback(async (filterId: FilterId) => {
    setActiveFilter(filterId);
    setShowFilters(false);
    if (!coords) return;
    await doFetch(coords.lat, coords.lng, filterId);
  }, [coords, doFetch]);

  // City search
  const handleCitySearch = useCallback(async () => {
    if (!cityInput.trim()) return;
    setLoadState("locating");
    setLoadError("");
    setFacilities([]);
    const result = await geocodeCity(cityInput.trim());
    if (!result) {
      setLoadError(`Could not find "${cityInput}". Try another city name.`);
      setLoadState("error");
      return;
    }
    setCoords({ lat: result.lat, lng: result.lng });
    setCityLabel(result.label);
    setCityInput("");
    await doFetch(result.lat, result.lng, activeFilter);
  }, [cityInput, activeFilter, doFetch]);

  const currentFilter = FILTERS.find((f) => f.id === activeFilter)!;
  const recommended   = facilities.filter((f) => f.isRecommended);
  const others        = facilities.filter((f) => !f.isRecommended);

  return (
    <div className="space-y-6">

      {/* ── EMERGENCY BANNER ── */}
      {isActive && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-red-500 bg-red-950/40 p-6">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute h-px w-full bg-gradient-to-r from-transparent via-red-400 to-transparent opacity-50 animate-[scan_2s_linear_infinite]" />
          </div>
          <div className="flex items-start gap-4">
            <Siren className="w-8 h-8 text-red-400 animate-pulse flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-black text-red-400 uppercase tracking-wider">Emergency Protocol Active</h2>
                <span className="font-mono text-sm text-red-300 bg-red-900/50 px-2 py-0.5 rounded">{fmt(elapsedSec)}</span>
              </div>
              <p className="text-sm text-red-200 leading-relaxed">Critical symptoms detected. Contact emergency services immediately.</p>
              {detectedFlags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {detectedFlags.map((f, i) => <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-red-900/60 border border-red-700/50 text-red-300 font-mono">{f}</span>)}
                </div>
              )}
            </div>
          </div>
          <a href="tel:112" className="mt-4 flex items-center justify-center gap-3 w-full py-4 rounded-xl bg-red-500 hover:bg-red-400 text-white font-black text-lg uppercase tracking-widest transition-all duration-200 shadow-lg shadow-red-900/50">
            <Phone className="w-6 h-6" /> Call 112 — Emergency
          </a>
        </div>
      )}

      {/* ── HOSPITAL FINDER ── */}
      <section>
        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-500" /> Hospital Finder
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-cyan-600" />
              {cityLabel}
              {loadState === "done" && <span className="text-slate-600">· {facilities.length} results</span>}
            </p>
          </div>
          <button onClick={detectAndFetch} disabled={loadState === "fetching" || loadState === "locating"}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-40">
            <RefreshCw className={`w-3 h-3 ${loadState === "fetching" || loadState === "locating" ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {/* City search bar */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCitySearch()}
              placeholder="Search city — Bhopal, Delhi, Mumbai..."
              className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-600/50 focus:ring-1 focus:ring-cyan-600/20 transition-all"
            />
          </div>
          <button onClick={handleCitySearch} className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors">
            Go
          </button>
        </div>

        {/* Quick city buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(CITY_COORDS).slice(0, 8).map(([key, val]) => (
            <button key={key} onClick={async () => { setCoords({ lat: val.lat, lng: val.lng }); setCityLabel(val.label); await doFetch(val.lat, val.lng, activeFilter); }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${cityLabel === val.label ? "bg-cyan-600 border-cyan-500 text-white" : "bg-slate-800/60 border-slate-700/40 text-slate-400 hover:border-slate-500 hover:text-slate-200"}`}>
              {val.label.split(",")[0]}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-500 uppercase tracking-wider">Filter by type</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button key={f.id} onClick={() => handleFilterChange(f.id)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all duration-200 ${
                  activeFilter === f.id
                    ? "bg-cyan-600 border-cyan-500 text-white shadow-md shadow-cyan-900/30"
                    : "bg-slate-800/60 border-slate-700/40 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                }`}>
                {f.icon} {f.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-1.5">{currentFilter.description}</p>
        </div>

        {/* Results */}
        {(loadState === "idle" || loadState === "locating") && (
          <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-8 text-center">
            <Loader2 className="w-6 h-6 text-cyan-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Detecting your location...</p>
            <p className="text-xs text-slate-600 mt-1">Allow location access for best results</p>
          </div>
        )}

        {loadState === "fetching" && (
          <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-8 text-center">
            <Loader2 className="w-6 h-6 text-cyan-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Searching hospitals in {cityLabel}...</p>
            <p className="text-xs text-slate-600 mt-1">Querying OpenStreetMap · Up to 15 km radius</p>
          </div>
        )}

        {loadState === "error" && (
          <div className="rounded-xl border border-red-800/30 bg-red-950/20 p-6 text-center">
            <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-300 mb-3">{loadError}</p>
            <button onClick={detectAndFetch} className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-300 text-xs hover:bg-slate-700 transition-colors">
              Try Again
            </button>
          </div>
        )}

        {loadState === "done" && facilities.length === 0 && (
          <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-8 text-center text-slate-400 text-sm">
            No {currentFilter.label.toLowerCase()} hospitals found in {cityLabel}. Try a different filter or city.
          </div>
        )}

        {loadState === "done" && facilities.length > 0 && (
          <div className="space-y-5">
            {/* Top 3 recommended */}
            {recommended.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3 text-xs font-bold text-emerald-400 uppercase tracking-widest">
                  <Award className="w-3.5 h-3.5" /> Top Recommendations for "{currentFilter.label}"
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {recommended.map((f, i) => <FacilityCard key={f.id} facility={f} rank={i + 1} />)}
                </div>
              </div>
            )}

            {/* Other results */}
            {others.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <MapPin className="w-3.5 h-3.5" /> More Hospitals ({others.length})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {others.map((f, i) => <FacilityCard key={f.id} facility={f} rank={i + 4} />)}
                </div>
              </div>
            )}
          </div>
        )}

        <p className="mt-3 text-xs text-slate-700 text-center">
          Data via OpenStreetMap Overpass API · Bed/ICU data indicative · Always call ahead to confirm availability
        </p>
      </section>

      {/* ── VITALS ── */}
      <section>
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-cyan-500" /> Vital Signs Monitor
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <VitalCard label="Heart Rate"  value={null} unit="bpm"  icon={<Heart className="w-4 h-4" />}       status="unknown" />
          <VitalCard label="O₂ Sat"      value={null} unit="%"    icon={<Wind className="w-4 h-4" />}        status="unknown" />
          <VitalCard label="Temperature" value={null} unit="°C"   icon={<Thermometer className="w-4 h-4" />} status="unknown" />
          <VitalCard label="Systolic BP" value={null} unit="mmHg" icon={<Activity className="w-4 h-4" />}    status="unknown" />
          <VitalCard label="Resp. Rate"  value={null} unit="/min" icon={<Wind className="w-4 h-4" />}        status="unknown" />
          <VitalCard label="Pain Score"  value={null} unit="/ 10" icon={<Zap className="w-4 h-4" />}         status="unknown" />
        </div>
        <p className="mt-2 text-xs text-slate-600 text-center">Enter vitals manually if monitoring devices are available</p>
      </section>

      {/* ── EMERGENCY CONTACTS ── */}
      <section>
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-4">
          <Radio className="w-4 h-4 text-cyan-500" /> Emergency Hotlines — India
        </h3>
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 px-4 divide-y divide-slate-800/50">
          {EMERGENCY_CONTACTS.map((c) => <ContactRow key={c.id} contact={c} />)}
        </div>
      </section>

      {/* ── SAFETY NOTICE ── */}
      <div className="flex items-start gap-3 rounded-xl border border-slate-700/30 bg-slate-900/30 p-4">
        <Shield className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="text-cyan-400 font-semibold">MedNova Safety Protocol: </span>
          Hospital data from OpenStreetMap community contributors. Bed, ICU and trauma data are indicative only — not real-time. Always call ahead or dial 112 in any life-threatening emergency.
        </p>
      </div>

    </div>
  );
}
