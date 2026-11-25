/**
 * screenViews.test.ts
 *
 * Constructs each ScreenView in the Vitest DOM environment. Catches the
 * "used `this` before `super()`" mistake that fails here before any browser run.
 */

import { describe, expect, it } from "vitest";
import { ChirpModel } from "../src/chirp/model/ChirpModel.js";
import { ChirpScreenView } from "../src/chirp/view/ChirpScreenView.js";
import { InterferometerModel } from "../src/interferometer/model/InterferometerModel.js";
import { InterferometerScreenView } from "../src/interferometer/view/InterferometerScreenView.js";
import { NetworkModel } from "../src/network/model/NetworkModel.js";
import { NetworkScreenView } from "../src/network/view/NetworkScreenView.js";
import { WavesModel } from "../src/waves/model/WavesModel.js";
import { WavesScreenView } from "../src/waves/view/WavesScreenView.js";

describe("ScreenViews construct", () => {
  it("WavesScreenView", () => {
    const view = new WavesScreenView(new WavesModel());
    expect(view).toBeDefined();
  });

  it("InterferometerScreenView", () => {
    const view = new InterferometerScreenView(new InterferometerModel());
    expect(view).toBeDefined();
  });

  it("ChirpScreenView", () => {
    const view = new ChirpScreenView(new ChirpModel());
    expect(view).toBeDefined();
  });

  it("NetworkScreenView", () => {
    const view = new NetworkScreenView(new NetworkModel());
    expect(view).toBeDefined();
  });
});
