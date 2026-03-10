/**
 * moduleUpdates.ts
 *
 * Module refresh/update checking system.
 * Fetches a remote module registry manifest and compares against locally
 * installed modules to detect new translations and version updates.
 *
 * The registry manifest is a JSON file hosted at a configurable URL
 * (default: GitHub raw content from the BibleReader repo).
 */

import { scanAndLoadModules } from './persistence';
import type { BrbMod } from '../types/brbmod';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single entry in the remote module registry. */
export interface RegistryModule {
  abbreviation: string;
  name: string;
  language: string;
  format: 'plain' | 'tagged';
  version: number;
  sizeBytes: number;
  description?: string;
  downloadUrl: string;
  sha256?: string;
}

/** The full remote manifest. */
export interface ModuleRegistry {
  schemaVersion: number;
  updatedAt: string; // ISO 8601
  modules: RegistryModule[];
}

/** Result of comparing remote registry against local modules. */
export interface UpdateCheckResult {
  /** Modules available remotely that are not installed locally. */
  newModules: RegistryModule[];
  /** Modules where remote version > local version. */
  updatedModules: {
    remote: RegistryModule;
    localVersion: number;
  }[];
  /** Modules that are up to date. */
  upToDate: RegistryModule[];
  /** Timestamp of this check. */
  checkedAt: number;
  /** Raw registry for reference. */
  registry: ModuleRegistry;
}

// ---------------------------------------------------------------------------
// Registry URL
// ---------------------------------------------------------------------------

const DEFAULT_REGISTRY_URL =
  'https://raw.githubusercontent.com/danielruuth/BibleReader/main/modules/registry.json';

let _registryUrl = DEFAULT_REGISTRY_URL;

export function setRegistryUrl(url: string): void {
  _registryUrl = url;
}

export function getRegistryUrl(): string {
  return _registryUrl;
}

// ---------------------------------------------------------------------------
// Fetch + validate registry
// ---------------------------------------------------------------------------

/** Fetch the remote module registry manifest. */
export async function fetchRegistry(url?: string): Promise<ModuleRegistry> {
  const targetUrl = url ?? _registryUrl;
  console.log(`[moduleUpdates] fetching registry from ${targetUrl}`);

  const response = await fetch(targetUrl, {
    headers: { Accept: 'application/json' },
    cache: 'no-cache',
  });

  if (!response.ok) {
    throw new Error(`Registry fetch failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return validateRegistry(data);
}

function validateRegistry(data: unknown): ModuleRegistry {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Registry is not a JSON object');
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.schemaVersion !== 'number') {
    throw new Error('Registry missing schemaVersion');
  }
  if (typeof obj.updatedAt !== 'string') {
    throw new Error('Registry missing updatedAt');
  }
  if (!Array.isArray(obj.modules)) {
    throw new Error('Registry missing modules array');
  }

  // Validate each module entry minimally
  for (const m of obj.modules) {
    if (typeof m !== 'object' || m === null) {
      throw new Error('Registry contains non-object module entry');
    }
    const mod = m as Record<string, unknown>;
    if (typeof mod.abbreviation !== 'string') throw new Error('Module missing abbreviation');
    if (typeof mod.name !== 'string') throw new Error('Module missing name');
    if (typeof mod.version !== 'number') throw new Error('Module missing version');
    if (typeof mod.downloadUrl !== 'string') throw new Error('Module missing downloadUrl');
  }

  return data as ModuleRegistry;
}

// ---------------------------------------------------------------------------
// Diff: remote vs local
// ---------------------------------------------------------------------------

/** Compare the remote registry against locally installed modules. */
export async function checkForUpdates(registry?: ModuleRegistry): Promise<UpdateCheckResult> {
  const reg = registry ?? await fetchRegistry();

  // Load local modules
  let localModules: BrbMod[] = [];
  try {
    localModules = await scanAndLoadModules();
  } catch (err) {
    console.warn('[moduleUpdates] scanAndLoadModules failed, treating as empty:', err);
  }

  // Build a map of local abbreviation → version
  const localMap = new Map<string, number>();
  for (const mod of localModules) {
    localMap.set(mod.meta.abbreviation.toUpperCase(), mod.meta.version ?? 1);
  }

  const newModules: RegistryModule[] = [];
  const updatedModules: { remote: RegistryModule; localVersion: number }[] = [];
  const upToDate: RegistryModule[] = [];

  for (const remote of reg.modules) {
    const key = remote.abbreviation.toUpperCase();
    const localVersion = localMap.get(key);

    if (localVersion === undefined) {
      newModules.push(remote);
    } else if (remote.version > localVersion) {
      updatedModules.push({ remote, localVersion });
    } else {
      upToDate.push(remote);
    }
  }

  console.log(
    `[moduleUpdates] check complete: ${newModules.length} new, ${updatedModules.length} updates, ${upToDate.length} up-to-date`
  );

  return {
    newModules,
    updatedModules,
    upToDate,
    checkedAt: Date.now(),
    registry: reg,
  };
}

// ---------------------------------------------------------------------------
// Download a module from the registry
// ---------------------------------------------------------------------------

export interface DownloadProgress {
  phase: 'downloading' | 'validating' | 'saving' | 'done' | 'error';
  bytesReceived?: number;
  totalBytes?: number;
  error?: string;
}

/**
 * Download a module from its registry URL.
 * Returns the raw parsed JSON (BrbMod envelope).
 */
export async function downloadModule(
  entry: RegistryModule,
  onProgress?: (progress: DownloadProgress) => void
): Promise<unknown> {
  onProgress?.({ phase: 'downloading', bytesReceived: 0, totalBytes: entry.sizeBytes });

  const response = await fetch(entry.downloadUrl, { cache: 'no-cache' });
  if (!response.ok) {
    const msg = `Download failed: ${response.status} ${response.statusText}`;
    onProgress?.({ phase: 'error', error: msg });
    throw new Error(msg);
  }

  // Read the response as text (modules are JSON)
  const text = await response.text();
  onProgress?.({ phase: 'downloading', bytesReceived: text.length, totalBytes: entry.sizeBytes });

  // Parse and validate
  onProgress?.({ phase: 'validating' });
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const msg = 'Downloaded file is not valid JSON';
    onProgress?.({ phase: 'error', error: msg });
    throw new Error(msg);
  }

  onProgress?.({ phase: 'done' });
  return parsed;
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

/** Human-readable file size. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
