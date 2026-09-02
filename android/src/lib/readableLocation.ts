import { useEffect, useState } from "react";

const clean = (value?: string | null) => value?.trim().replace(/\s+/g, " ") || "";
const cache = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();
const coordinatePattern = /^\s*(?:lat\s*:\s*)?(-?\d+(?:\.\d+)?)\s*(?:,|\s+lng\s*:\s*)\s*(?:lng\s*:\s*)?(-?\d+(?:\.\d+)?)\s*$/i;

export const parseCoordinates = (value?: string | null) => {
  const match = clean(value).match(coordinatePattern);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
};

export const resolveReadableLocation = async (fields: { address?: string | null; city?: string | null; state?: string | null; latitude?: number; longitude?: number } = {}) => {
  const existing = [fields.address, [fields.city, fields.state].filter(Boolean).join(", ")].map(clean).find(value => value && !parseCoordinates(value));
  if (existing) return existing;
  const coordinates = fields.latitude != null && fields.longitude != null ? { latitude: fields.latitude, longitude: fields.longitude } : parseCoordinates(fields.address);
  if (!coordinates) return clean(fields.address) || "Location unavailable";
  const key = `${coordinates.latitude.toFixed(5)},${coordinates.longitude.toFixed(5)}`;
  const stored = cache.get(key) || sessionStorage.getItem(`bookme-location:${key}`);
  if (stored) return stored;
  if (pending.has(key)) return pending.get(key)!;
  const request = fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${coordinates.latitude}&lon=${coordinates.longitude}`, { headers: { Accept: "application/json" } }).then(async response => {
    if (!response.ok) return null;
    const result = await response.json();
    const a = result.address || {};
    const readable = [a.neighbourhood || a.suburb || a.quarter, a.city || a.town || a.village || a.municipality, a.county || a.state_district, a.state].map(clean).filter(Boolean).filter((v: string, i: number, all: string[]) => all.indexOf(v) === i).join(", ") || clean(result.display_name);
    if (readable) { cache.set(key, readable); try { sessionStorage.setItem(`bookme-location:${key}`, readable); } catch { /* optional cache */ } }
    return readable || null;
  }).catch(() => null).finally(() => pending.delete(key));
  pending.set(key, request);
  return (await request) || `${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`;
};

export const useReadableLocation = (fields: { address?: string | null; city?: string | null; state?: string | null; latitude?: number | null; longitude?: number | null } = {}) => {
  const [location, setLocation] = useState("");
  useEffect(() => { let active = true; resolveReadableLocation(fields as any).then(value => { if (active) setLocation(value); }); return () => { active = false; }; }, [fields.address, fields.city, fields.state, fields.latitude, fields.longitude]);
  return location || "Location unavailable";
};

