/**
 * eventLibrary.ts
 *
 * Bundled GWOSC catalog plus on-demand whitened strain. The catalog ships in the
 * main chunk; each event's H1/L1 samples are a separate Vite chunk that
 * `loadEvent` imports once and caches.
 */

import { type CatalogEvent, EVENT_SAMPLE_RATE, type EventStrainData, type LoadedEvent } from "./dataTypes.js";
import { EVENT_CATALOG } from "./generated/eventCatalog.js";

const LOADERS: Readonly<Record<string, () => Promise<EventStrainData>>> = {
  GW150914: async () => (await import("./generated/events/GW150914.js")).EVENT_STRAIN,
  GW170814: async () => (await import("./generated/events/GW170814.js")).EVENT_STRAIN,
  GW170817: async () => (await import("./generated/events/GW170817.js")).EVENT_STRAIN,
  GW190521: async () => (await import("./generated/events/GW190521.js")).EVENT_STRAIN,
  GW200129_065458: async () => (await import("./generated/events/GW200129_065458.js")).EVENT_STRAIN,
};

const loaded = new Map<string, LoadedEvent>();
const pending = new Map<string, Promise<LoadedEvent>>();

/** All catalog events. */
export function catalogEvents(): readonly CatalogEvent[] {
  return EVENT_CATALOG;
}

/** Detector-frame masses m(1+z) for overlaying the model on redshifted data. */
export function detectorFrameMasses(event: CatalogEvent): { readonly m1: number; readonly m2: number } {
  const stretch = 1 + event.redshift;
  return {
    m1: event.m1Source * stretch,
    m2: event.m2Source * stretch,
  };
}

/** Loads (once) and returns the event with H1 and L1 strain. */
export function loadEvent(id: string): Promise<LoadedEvent> {
  const cached = loaded.get(id);
  if (cached) {
    return Promise.resolve(cached);
  }
  const inFlight = pending.get(id);
  if (inFlight !== undefined) {
    return inFlight;
  }
  const summary = EVENT_CATALOG.find((event) => event.id === id);
  if (!summary) {
    return Promise.reject(new Error(`Unknown event id: ${id}`));
  }
  const loader = LOADERS[id];
  if (!loader) {
    return Promise.reject(new Error(`No strain bundled for ${id}`));
  }
  const promise = loader()
    .then((strain) => {
      if (strain.H1.sampleRate !== EVENT_SAMPLE_RATE || strain.L1.sampleRate !== EVENT_SAMPLE_RATE) {
        throw new Error(`${id}: expected sampleRate ${EVENT_SAMPLE_RATE}`);
      }
      const event: LoadedEvent = { ...summary, H1: strain.H1, L1: strain.L1 };
      loaded.set(id, event);
      return event;
    })
    .finally(() => pending.delete(id));
  pending.set(id, promise);
  return promise;
}
