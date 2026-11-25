import { expect, it } from "vitest";
import { catalogEvents, loadEvent } from "../src/common/data/eventLibrary.js";

it("catalog has 5 events", () => {
  expect(catalogEvents()).toHaveLength(5);
});

it.each(catalogEvents().map((event) => event.id))(
  "%s loads H1 and L1 with 3072 finite samples and non-zero peak",
  async (id) => {
    const event = await loadEvent(id);
    for (const detector of [event.H1, event.L1] as const) {
      expect(detector.sampleRate).toBe(2048);
      expect(detector.samples).toHaveLength(3072);
      let maxAbs = 0;
      for (const sample of detector.samples) {
        expect(Number.isFinite(sample)).toBe(true);
        maxAbs = Math.max(maxAbs, Math.abs(sample));
      }
      expect(maxAbs).toBeGreaterThan(0);
    }
  },
);
