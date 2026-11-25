/**
 * NetworkScreenView.ts
 *
 * Left: sky map + arrival traces. Right: source combo, controls, readouts,
 * time control and Reset All (never scaled below 1).
 */
import { DerivedProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { StringUtils } from "scenerystack/phetcommon";
import { HBox, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { ComboBox } from "scenerystack/sun";
import {
  FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  GRAVITATIONAL_WAVES_COMBO_BOX_OPTIONS,
  LIGHT_SURFACE_TEXT_FILL,
  TIME_CONTROL_SPEED_RADIO_OPTIONS,
} from "../../common/GravitationalWavesButtonOptions.js";
import { LABEL_FONT, SMALL_FONT } from "../../common/view/GravitationalWavesFonts.js";
import GravitationalWavesColors from "../../GravitationalWavesColors.js";
import {
  NETWORK_PANEL_WIDTH,
  NETWORK_SLOW_MOTION,
  SCREEN_VIEW_MARGIN,
  STEP_DT,
} from "../../GravitationalWavesConstants.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { NetworkModel, NetworkSourceId } from "../model/NetworkModel.js";
import { ArrivalTracesNode } from "./ArrivalTracesNode.js";
import { NetworkControlPanel } from "./NetworkControlPanel.js";
import { NetworkReadoutsPanel } from "./NetworkReadoutsPanel.js";
import { NetworkScreenSummaryContent } from "./NetworkScreenSummaryContent.js";
import { SkyMapNode } from "./SkyMapNode.js";

export type NetworkScreenViewOptions = ScreenViewOptions;

const PRESET_DATES: Readonly<Record<string, string>> = {
  GW150914: "2015-09-14",
  GW170814: "2017-08-14",
  GW170817: "2017-08-17",
};

export class NetworkScreenView extends ScreenView {
  public readonly sourceCombo: ComboBox<NetworkSourceId>;
  private readonly disposeView: () => void;

  public constructor(model: NetworkModel, providedOptions?: NetworkScreenViewOptions) {
    const options = optionize<NetworkScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      {
        screenSummaryContent: new NetworkScreenSummaryContent(model),
      },
      providedOptions,
    );
    super(options);

    const strings = StringManager.getInstance().getNetworkStrings();
    const a11y = StringManager.getInstance().getNetworkA11yStrings();

    const backgroundRect = new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
      fill: GravitationalWavesColors.backgroundColorProperty,
    });
    this.addChild(backgroundRect);

    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        this.interruptSubtreeInput();
        model.reset();
        this.reset();
      },
      accessibleName: a11y.controls.resetAllStringProperty,
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });

    const skyMap = new SkyMapNode(model);
    skyMap.left = SCREEN_VIEW_MARGIN;
    skyMap.top = 8;
    this.addChild(skyMap);

    const traces = new ArrivalTracesNode(model);
    traces.left = SCREEN_VIEW_MARGIN;
    traces.top = skyMap.bottom + 4;
    this.addChild(traces);

    const sourceLabel = new Text(strings.sourceStringProperty, {
      font: LABEL_FONT,
      fill: GravitationalWavesColors.textColorProperty,
      maxWidth: 200,
    });

    const comboItems = [
      {
        value: "custom" as NetworkSourceId,
        accessibleName: strings.customSourceStringProperty,
        createNode: () =>
          new Text(strings.customSourceStringProperty, {
            font: SMALL_FONT,
            fill: LIGHT_SURFACE_TEXT_FILL,
            maxWidth: 280,
          }),
      },
      {
        value: "GW150914" as NetworkSourceId,
        accessibleName: strings.presetGW150914StringProperty,
        createNode: () =>
          new Text(strings.presetGW150914StringProperty, {
            font: SMALL_FONT,
            fill: LIGHT_SURFACE_TEXT_FILL,
            maxWidth: 280,
          }),
      },
      {
        value: "GW170814" as NetworkSourceId,
        accessibleName: strings.presetGW170814StringProperty,
        createNode: () =>
          new Text(strings.presetGW170814StringProperty, {
            font: SMALL_FONT,
            fill: LIGHT_SURFACE_TEXT_FILL,
            maxWidth: 280,
          }),
      },
      {
        value: "GW170817" as NetworkSourceId,
        accessibleName: strings.presetGW170817StringProperty,
        createNode: () =>
          new Text(strings.presetGW170817StringProperty, {
            font: SMALL_FONT,
            fill: LIGHT_SURFACE_TEXT_FILL,
            maxWidth: 280,
          }),
      },
    ];

    const sourceCombo = new ComboBox(model.sourceProperty, comboItems, this, {
      ...GRAVITATIONAL_WAVES_COMBO_BOX_OPTIONS,
      accessibleName: a11y.controls.sourceStringProperty,
      listPosition: "below",
      maxWidth: NETWORK_PANEL_WIDTH,
    });
    this.sourceCombo = sourceCombo;

    const presetInfoProperty = new DerivedProperty(
      [model.sourceProperty, strings.presetInfoStringProperty],
      (source, pattern) => {
        const preset = model.presets.find((p) => p.id === source);
        if (!preset) {
          return "";
        }
        return StringUtils.fillIn(pattern, {
          date: PRESET_DATES[preset.id] ?? "",
          detectors: preset.detectors.join(", "),
        });
      },
    );
    // Leaf <p> with innerContent — avoids sortChildren assertions with dynamic accessibleParagraph.
    const presetInfo = new Text(presetInfoProperty, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      maxWidth: NETWORK_PANEL_WIDTH,
      tagName: "p",
      innerContent: presetInfoProperty,
    });
    const presetVisibleListener = (source: NetworkSourceId) => {
      presetInfo.visible = source !== "custom";
    };
    model.sourceProperty.link(presetVisibleListener);

    const controlPanel = new NetworkControlPanel(model);
    const readoutsPanel = new NetworkReadoutsPanel(model);

    const slowCaptionProperty = new DerivedProperty([strings.slowMotionStringProperty], (pattern) =>
      StringUtils.fillIn(pattern, { factor: toFixed(NETWORK_SLOW_MOTION, 0) }),
    );
    const slowCaption = new Text(slowCaptionProperty, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      maxWidth: 110,
    });

    const timeControl = new TimeControlNode(model.timer.isPlayingProperty, {
      timeSpeedProperty: model.timer.timeSpeedProperty,
      timeSpeeds: [...model.timer.timeSpeeds],
      speedRadioButtonGroupPlacement: "right",
      flowBoxSpacing: 10,
      playPauseStepButtonOptions: {
        ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
        stepForwardButtonOptions: {
          ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS.stepForwardButtonOptions,
          listener: () => model.stepOnce(STEP_DT),
        },
      },
      ...TIME_CONTROL_SPEED_RADIO_OPTIONS,
    });

    const bottomRow = new HBox({
      spacing: 10,
      align: "center",
      children: [timeControl, slowCaption, resetAllButton],
    });
    bottomRow.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    bottomRow.bottom = this.layoutBounds.maxY - SCREEN_VIEW_MARGIN;
    this.addChild(bottomRow);

    const rightColumn = new VBox({
      spacing: 4,
      align: "left",
      children: [sourceLabel, sourceCombo, presetInfo, controlPanel, readoutsPanel],
    });
    rightColumn.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    rightColumn.top = SCREEN_VIEW_MARGIN;
    this.addChild(rightColumn);

    this.disposeView = () => {
      model.sourceProperty.unlink(presetVisibleListener);
      presetInfoProperty.dispose();
      slowCaptionProperty.dispose();
      skyMap.dispose();
      traces.dispose();
      controlPanel.dispose();
      readoutsPanel.dispose();
      sourceCombo.dispose();
      timeControl.dispose();
      resetAllButton.dispose();
    };

    this.addChild(
      new Node({
        pdomOrder: [
          sourceCombo,
          controlPanel.detectorCheckboxes.H1,
          controlPanel.detectorCheckboxes.L1,
          controlPanel.detectorCheckboxes.V1,
          controlPanel.detectorCheckboxes.K1,
          controlPanel.snrControl,
          controlPanel.measurementNoiseCheckbox,
          controlPanel.newNoiseButton,
          controlPanel.showRingsCheckbox,
          controlPanel.showTruthCheckbox,
          skyMap,
          timeControl,
          resetAllButton,
        ],
      }),
    );
  }

  public reset(): void {
    // View state is driven by the model.
  }

  public override step(_dt: number): void {
    // Map / traces refresh via Multilink on model Properties (including playhead).
  }

  public override dispose(): void {
    this.disposeView();
    super.dispose();
  }
}
