/** Generate whitened GWOSC strain chunks and the H1 ASD overlay. */
import { readdirSync, rmSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import type { CatalogEvent } from "../src/common/data/dataTypes.js";
import type { EventSpec } from "./data/buildEvent.js";
import config from "./data/events.json" with { type: "json" };

// Node executes these TypeScript tools directly. Resolve the same .js specifiers as the app build.
registerHooks({
  resolve(specifier, context, nextResolve) {
    const path = specifier.startsWith(".") && specifier.endsWith(".js") ? `${specifier.slice(0, -3)}.ts` : specifier;
    return nextResolve(path, context);
  },
});

const { buildEvent } = await import("./data/buildEvent.js");
const { interpolate, logGrid } = await import("./data/dsp.js");
const { numberArray, writeGeneratedModule } = await import("./data/emit.js");

const GENERATED = "src/common/data/generated";
const EVENT_LIMIT_BYTES = 60_000;

function toCatalog(spec: EventSpec): CatalogEvent {
  return {
    id: spec.id,
    name: spec.name,
    catalog: spec.catalog,
    gps: spec.gps,
    m1Source: spec.m1Source,
    m2Source: spec.m2Source,
    chirpMassSource: spec.chirpMassSource,
    distanceMpc: spec.distanceMpc,
    redshift: spec.redshift,
    networkSnr: spec.networkSnr,
    detectors: ["H1", "L1"],
  };
}

function emitDetector(
  label: string,
  strain: { sampleRate: number; startOffset: number; scale: number; samples: readonly number[] },
): string {
  return `  ${label}: {
    sampleRate: ${strain.sampleRate},
    startOffset: ${strain.startOffset},
    scale: ${strain.scale},
    samples: ${numberArray(strain.samples)},
  }`;
}

async function build(): Promise<void> {
  const specs = config as EventSpec[];
  rmSync(`${GENERATED}/events`, { recursive: true, force: true });

  const built = [];
  for (const spec of specs) {
    console.log(`building ${spec.id}`);
    built.push(await buildEvent(spec));
  }

  writeGeneratedModule(
    `${GENERATED}/eventCatalog.ts`,
    "GWOSC event catalog (source-frame masses). Strain loads per event under events/.",
    `import type { CatalogEvent } from "../dataTypes.js";\n\nexport const EVENT_CATALOG: readonly CatalogEvent[] = [\n${built
      .map((event) => `  ${JSON.stringify(toCatalog(event.spec))},`)
      .join("\n")}\n];`,
  );

  for (const event of built) {
    const body = `import type { EventStrainData } from "../../dataTypes.js";\n\nexport const EVENT_STRAIN: EventStrainData = {\n${emitDetector(
      "H1",
      event.data.H1,
    )},\n${emitDetector("L1", event.data.L1)},\n};`;
    writeGeneratedModule(
      `${GENERATED}/events/${event.spec.id}.ts`,
      `Whitened, band-passed H1/L1 strain for ${event.spec.id} (2048 Hz, Int16).`,
      body,
    );
  }

  const gw150914 = built.find((event) => event.spec.id === "GW150914");
  if (!gw150914?.h1Welch) {
    throw new Error("Expected Welch ASD for GW150914 H1");
  }
  const { f: welchF, asd: welchAsd } = gw150914.h1Welch;
  const grid = logGrid(10, 2000, 200);
  const asdOnGrid = Float64Array.from({ length: grid.length }, (_, i) => interpolate(welchF, welchAsd, grid[i]!));

  // Sanity: minimum ASD in 100–300 Hz should be ~(5–10)×10^{-24}.
  let minAsd = Number.POSITIVE_INFINITY;
  let minF = 0;
  for (let i = 0; i < grid.length; i++) {
    const freq = grid[i]!;
    if (freq >= 100 && freq <= 300) {
      const value = asdOnGrid[i]!;
      if (value < minAsd) {
        minAsd = value;
        minF = freq;
      }
    }
  }
  console.log(`H1 ASD minimum near 100–300 Hz: ${minAsd.toExponential(3)} at ${minF.toFixed(1)} Hz`);

  writeGeneratedModule(
    `${GENERATED}/ligoAsd.ts`,
    "LIGO Hanford ASD measured from 32 s around GW150914 (Welch, log grid 10 Hz–2 kHz).",
    `import type { LigoAsdCurve } from "../dataTypes.js";\n\nexport const LIGO_H1_ASD: LigoAsdCurve = {\n  f: ${numberArray([...grid])},\n  asd: ${numberArray([...asdOnGrid])},\n};`,
  );

  console.table(
    built.map((event) => ({
      event: event.spec.id,
      postMerger: event.postMerger,
      h1Peak: Number(event.h1PeakOffset.toFixed(3)),
      l1Peak: Number(event.l1PeakOffset.toFixed(3)),
      H1samples: event.data.H1.samples.length,
      L1samples: event.data.L1.samples.length,
      bytes: statSync(`${GENERATED}/events/${event.spec.id}.ts`).size,
    })),
  );

  for (const event of built) {
    const size = statSync(`${GENERATED}/events/${event.spec.id}.ts`).size;
    if (size > EVENT_LIMIT_BYTES) {
      throw new Error(`${event.spec.id} is ${size} bytes (limit ${EVENT_LIMIT_BYTES})`);
    }
  }

  const generatedFiles = readdirSync(GENERATED).filter((file) => file.endsWith(".ts"));
  console.log(`generated root files: ${generatedFiles.join(", ")}`);
}

await build();
