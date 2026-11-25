/**
 * Memory-leak regression suite (fleet standard).
 *
 * List every model/view object that links Properties, adds listeners, or owns child
 * nodes, with a factory that builds a fresh instance. The shared harness in
 * tests/helpers/memoryLeak.ts (template-owned) checks that each one is garbage
 * collected after dispose() and leaves no survivors across repeated cycles
 * (idempotentDispose: true also checks a second dispose()). Add sim-specific leak
 * tests below using forceGC().
 */

import { describe, expect, it, vi } from "vitest";
import { ChirpModel } from "../src/chirp/model/ChirpModel.js";
import { TimeModel } from "../src/common/TimeModel.js";
import { InterferometerModel } from "../src/interferometer/model/InterferometerModel.js";
import { WavesModel } from "../src/waves/model/WavesModel.js";
import { describeDisposalLeaks } from "./helpers/memoryLeak.js";

describeDisposalLeaks([
  { name: "TimeModel", create: () => new TimeModel(), idempotentDispose: true },
  { name: "WavesModel", create: () => new WavesModel() },
  { name: "InterferometerModel", create: () => new InterferometerModel() },
  { name: "ChirpModel", create: () => new ChirpModel() },
]);

describe("composed TimeModel disposal", () => {
  it("screen models dispose their owned timer", () => {
    {
      const model = new WavesModel();
      const spy = vi.spyOn(model.timer, "dispose");
      model.dispose();
      expect(spy).toHaveBeenCalledOnce();
    }
    {
      const model = new InterferometerModel();
      const spy = vi.spyOn(model.timer, "dispose");
      model.dispose();
      expect(spy).toHaveBeenCalledOnce();
    }
    {
      const model = new ChirpModel();
      const spy = vi.spyOn(model.timer, "dispose");
      model.dispose();
      expect(spy).toHaveBeenCalledOnce();
    }
  });
});
