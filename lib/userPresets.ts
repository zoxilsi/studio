/**
 * User preset library — the user's own saved designs, persisted locally.
 *
 * Saved designs round-trip through the same serializable `MeshDoc` the
 * built-in presets use, so applying one is just `applyDoc(doc)`. Storage is
 * `localStorage` (the same place the theme lives); every access is guarded so
 * SSR and private-mode browsers degrade to an empty library instead of throwing.
 */

import type { MeshDoc } from "@/types/gradient";

const STORAGE_KEY = "zoxilsi-presets";
const MAX_PRESETS = 50;

export interface UserPreset {
  id: string;
  name: string;
  doc: MeshDoc;
  createdAt: number;
}

function safeParse(raw: string | null): UserPreset[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (p): p is UserPreset => !!p && typeof p.id === "string" && !!p.doc
    );
  } catch {
    return [];
  }
}

/** Read the saved library. Empty (never throws) when storage is unavailable. */
export function loadUserPresets(): UserPreset[] {
  if (typeof window === "undefined") return [];
  try {
    return safeParse(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

function persist(presets: UserPreset[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // Quota or privacy mode — the in-memory list still works this session.
  }
}

/**
 * Snapshot `doc` into the library under `name`. Clones the doc so later edits
 * never mutate a saved preset. Newest first; capped so storage stays bounded.
 */
export function saveUserPreset(doc: MeshDoc, name: string): UserPreset {
  const preset: UserPreset = {
    id: `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    name: name.trim() || "Untitled",
    doc: structuredClone(doc),
    createdAt: Date.now(),
  };
  const next = [preset, ...loadUserPresets()].slice(0, MAX_PRESETS);
  persist(next);
  return preset;
}

/** Remove a saved preset by id. No-op if it isn't there. */
export function deleteUserPreset(id: string): void {
  persist(loadUserPresets().filter((p) => p.id !== id));
}
