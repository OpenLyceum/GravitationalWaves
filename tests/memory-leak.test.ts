/**
 * Memory-leak regression suite (fleet standard).
 *
 * List every model/view object that links Properties, adds listeners, or owns child
 * nodes, with a factory that builds a fresh instance. The shared harness in
 * tests/helpers/memoryLeak.ts (template-owned) checks that each one is garbage
 * collected after dispose() and leaves no survivors across repeated cycles
 * (idempotentDispose: true also checks a second dispose()). Add sim-specific leak
 * tests below using forceGC().
 *
 * View nodes link to long-lived screen models; `keepAlive` holds those models while
 * each disposed instance is checked for collection.
 */

import { Node } from "scenerystack/scenery";
import { describe, expect, it, vi } from "vitest";
import { ChirpModel } from "../src/chirp/model/ChirpModel.js";
import { ChirpAudioPlayer } from "../src/chirp/view/ChirpAudioPlayer.js";
import { ChirpControlPanel } from "../src/chirp/view/ChirpControlPanel.js";
import { ChirpMatchedFilterPanel } from "../src/chirp/view/ChirpMatchedFilterPanel.js";
import { ChirpReadoutsPanel } from "../src/chirp/view/ChirpReadoutsPanel.js";
import { ChirpScreenSummaryContent } from "../src/chirp/view/ChirpScreenSummaryContent.js";
import { SpectrogramNode } from "../src/chirp/view/SpectrogramNode.js";
import { TimeModel } from "../src/common/TimeModel.js";
import { InterferometerModel } from "../src/interferometer/model/InterferometerModel.js";
import { InterferometerControlPanel } from "../src/interferometer/view/InterferometerControlPanel.js";
import { InterferometerScreenSummaryContent } from "../src/interferometer/view/InterferometerScreenSummaryContent.js";
import { MichelsonNode } from "../src/interferometer/view/MichelsonNode.js";
import { SensitivityChartNode } from "../src/interferometer/view/SensitivityChartNode.js";
import { NetworkModel } from "../src/network/model/NetworkModel.js";
import { ArrivalTracesNode } from "../src/network/view/ArrivalTracesNode.js";
import { NetworkControlPanel } from "../src/network/view/NetworkControlPanel.js";
import { NetworkReadoutsPanel } from "../src/network/view/NetworkReadoutsPanel.js";
import { NetworkScreenSummaryContent } from "../src/network/view/NetworkScreenSummaryContent.js";
import { SkyMapNode } from "../src/network/view/SkyMapNode.js";
import { WavesModel } from "../src/waves/model/WavesModel.js";
import { RealScalePanel } from "../src/waves/view/RealScalePanel.js";
import { TestMassRingNode } from "../src/waves/view/TestMassRingNode.js";
import { WavesScreenSummaryContent } from "../src/waves/view/WavesScreenSummaryContent.js";
import { describeDisposalLeaks } from "./helpers/memoryLeak.js";

const wavesModel = new WavesModel();
const interferometerModel = new InterferometerModel();
const chirpModel = new ChirpModel();
const networkModel = new NetworkModel();
const chirpAudioViewNode = new Node();
const chirpListParent = new Node();
const chirpAudioPlayer = new ChirpAudioPlayer(chirpModel, chirpAudioViewNode);

describeDisposalLeaks([
  { name: "TimeModel", create: () => new TimeModel(), idempotentDispose: true },
  { name: "WavesModel", create: () => new WavesModel() },
  { name: "InterferometerModel", create: () => new InterferometerModel() },
  { name: "ChirpModel", create: () => new ChirpModel() },
  {
    name: "TestMassRingNode",
    create: () => new TestMassRingNode(wavesModel),
    keepAlive: () => [wavesModel],
  },
  {
    name: "RealScalePanel",
    create: () => new RealScalePanel(wavesModel),
    keepAlive: () => [wavesModel],
  },
  {
    name: "WavesScreenSummaryContent",
    create: () => new WavesScreenSummaryContent(wavesModel),
    keepAlive: () => [wavesModel],
  },
  {
    name: "MichelsonNode",
    create: () => new MichelsonNode(interferometerModel),
    keepAlive: () => [interferometerModel],
  },
  {
    name: "SensitivityChartNode",
    create: () => new SensitivityChartNode(interferometerModel, 400, 280),
    keepAlive: () => [interferometerModel],
  },
  {
    name: "InterferometerControlPanel",
    create: () => new InterferometerControlPanel(interferometerModel),
    keepAlive: () => [interferometerModel],
  },
  {
    name: "InterferometerScreenSummaryContent",
    create: () => new InterferometerScreenSummaryContent(interferometerModel),
    keepAlive: () => [interferometerModel],
  },
  {
    name: "ChirpAudioPlayer",
    create: () => new ChirpAudioPlayer(chirpModel, chirpAudioViewNode),
    keepAlive: () => [chirpModel, chirpAudioViewNode],
  },
  {
    name: "ChirpControlPanel",
    create: () => new ChirpControlPanel(chirpModel, chirpListParent, chirpAudioPlayer),
    keepAlive: () => [chirpModel, chirpListParent, chirpAudioPlayer],
  },
  {
    name: "ChirpMatchedFilterPanel",
    create: () => new ChirpMatchedFilterPanel(chirpModel),
    keepAlive: () => [chirpModel],
  },
  {
    name: "ChirpReadoutsPanel",
    create: () => new ChirpReadoutsPanel(chirpModel),
    keepAlive: () => [chirpModel],
  },
  {
    name: "ChirpScreenSummaryContent",
    create: () => new ChirpScreenSummaryContent(chirpModel),
    keepAlive: () => [chirpModel],
  },
  {
    name: "SpectrogramNode",
    create: () => new SpectrogramNode(chirpModel, 420, 220),
    keepAlive: () => [chirpModel],
  },
  { name: "NetworkModel", create: () => new NetworkModel() },
  {
    name: "SkyMapNode",
    create: () => new SkyMapNode(networkModel),
    keepAlive: () => [networkModel],
  },
  {
    name: "ArrivalTracesNode",
    create: () => new ArrivalTracesNode(networkModel),
    keepAlive: () => [networkModel],
  },
  {
    name: "NetworkControlPanel",
    create: () => new NetworkControlPanel(networkModel),
    keepAlive: () => [networkModel],
  },
  {
    name: "NetworkReadoutsPanel",
    create: () => new NetworkReadoutsPanel(networkModel),
    keepAlive: () => [networkModel],
  },
  {
    name: "NetworkScreenSummaryContent",
    create: () => new NetworkScreenSummaryContent(networkModel),
    keepAlive: () => [networkModel],
  },
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
    {
      const model = new NetworkModel();
      const spy = vi.spyOn(model.timer, "dispose");
      model.dispose();
      expect(spy).toHaveBeenCalledOnce();
    }
  });
});
