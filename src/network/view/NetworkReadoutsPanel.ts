/**
 * NetworkReadoutsPanel.ts
 *
 * Compact detector / pair / sky-area readouts for the Network screen.
 */
import { DerivedProperty, Multilink } from "scenerystack/axon";
import { roundSymmetric, toFixed } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { GridBox, HBox, Rectangle, RichText, Text, VBox } from "scenerystack/scenery";
import { GravitationalWavesPanel } from "../../common/GravitationalWavesPanel.js";
import { FULL_SKY_DEG2 } from "../../common/model/SkyLocalization.js";
import { LABEL_FONT, SMALL_FONT, TITLE_FONT, VALUE_FONT } from "../../common/view/GravitationalWavesFonts.js";
import GravitationalWavesColors from "../../GravitationalWavesColors.js";
import { FULL_MOON_DEG2, NETWORK_PANEL_WIDTH, NETWORK_WHOLE_SKY_FRACTION } from "../../GravitationalWavesConstants.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { NetworkModel } from "../model/NetworkModel.js";
import { detectorColorProperty } from "./networkDetectorColors.js";

/** Group integer digits with thin spaces (e.g. 3 200). */
function formatGrouped(n: number): string {
  const rounded = roundSymmetric(n);
  const sign = rounded < 0 ? "−" : "";
  const digits = String(Math.abs(rounded));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
}

function signedFixed(value: number, places: number): string {
  const sign = value >= 0 ? "+" : "−";
  return `${sign}${toFixed(Math.abs(value), places)}`;
}

export class NetworkReadoutsPanel extends GravitationalWavesPanel {
  private readonly disposePanel: () => void;

  public constructor(model: NetworkModel) {
    const strings = StringManager.getInstance().getNetworkStrings();

    const title = new Text(strings.readoutsTitleStringProperty, {
      font: TITLE_FONT,
      fill: GravitationalWavesColors.textColorProperty,
      maxWidth: NETWORK_PANEL_WIDTH - 24,
    });

    const mutedHeader = (text: string) =>
      new Text(text, {
        font: SMALL_FONT,
        fill: GravitationalWavesColors.mutedTextColorProperty,
        maxWidth: 54,
      });

    const detectorColumn = new VBox({ spacing: 2, align: "left" });
    const pairsColumn = new VBox({ spacing: 2, align: "left" });
    const areaLine = new RichText("", {
      font: VALUE_FONT,
      fill: GravitationalWavesColors.textColorProperty,
      maxWidth: NETWORK_PANEL_WIDTH - 28,
    });
    const publishedLine = new RichText("", {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      maxWidth: NETWORK_PANEL_WIDTH - 28,
      visible: false,
    });
    const pointingLine = new Text("", {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.textColorProperty,
      maxWidth: NETWORK_PANEL_WIDTH - 28,
      visible: false,
    });

    const content = new VBox({
      spacing: 3,
      align: "left",
      excludeInvisibleChildrenFromBounds: true,
      children: [title, detectorColumn, pairsColumn, areaLine, publishedLine, pointingLine],
    });

    super(content, { xMargin: 8, yMargin: 5 });

    const areaProperty = new DerivedProperty(
      [model.skyMapProperty, strings.area90StringProperty, strings.area90WholeSkyStringProperty],
      (map, areaPattern, wholeSky) => {
        if (map.area90 >= NETWORK_WHOLE_SKY_FRACTION * FULL_SKY_DEG2) {
          return wholeSky;
        }
        return StringUtils.fillIn(areaPattern, {
          area: formatGrouped(map.area90),
          moons: formatGrouped(map.area90 / FULL_MOON_DEG2),
        });
      },
    );

    const publishedProperty = new DerivedProperty(
      [model.publishedAreaProperty, strings.publishedAreaStringProperty],
      (published, pattern) =>
        published === null ? "" : StringUtils.fillIn(pattern, { area: formatGrouped(published) }),
    );

    // With two detectors the most probable point on the ring is not meaningful; say so instead.
    const pointingProperty = new DerivedProperty(
      [
        model.pointingErrorProperty,
        model.readingsProperty,
        strings.pointingErrorStringProperty,
        strings.ringOnlyNoteStringProperty,
      ],
      (error, readings, pattern, ringOnly) => {
        if (readings.length === 2) {
          return ringOnly;
        }
        return error === null || readings.length < 2 ? "" : StringUtils.fillIn(pattern, { error: toFixed(error, 1) });
      },
    );

    const areaLink = Multilink.multilink([areaProperty], (text) => {
      areaLine.string = text;
    });
    const publishedLink = Multilink.multilink([publishedProperty], (text) => {
      publishedLine.string = text;
      publishedLine.visible = text.length > 0;
    });
    const pointingLink = Multilink.multilink([pointingProperty], (text) => {
      pointingLine.string = text;
      pointingLine.visible = text.length > 0;
    });

    const gridLink = Multilink.multilink(
      [
        model.readingsProperty,
        model.pairsProperty,
        strings.headerDetectorStringProperty,
        strings.headerArrivalStringProperty,
        strings.headerResponseStringProperty,
        strings.headerSnrStringProperty,
        strings.headerSigmaStringProperty,
        strings.emDashStringProperty,
        strings.pairDelayStringProperty,
        strings.responseValueStringProperty,
        strings.timingErrorValueStringProperty,
      ],
      (readings, pairs, hDet, hArr, hResp, hSnr, hSig, emDash, pairPattern, responsePattern, sigmaPattern) => {
        while (detectorColumn.children.length > 0) {
          const child = detectorColumn.children[0];
          if (child) {
            detectorColumn.removeChild(child);
            child.dispose();
          }
        }
        while (pairsColumn.children.length > 0) {
          const child = pairsColumn.children[0];
          if (child) {
            pairsColumn.removeChild(child);
            child.dispose();
          }
        }

        if (readings.length === 0) {
          return;
        }

        const rows = [
          [mutedHeader(hDet), mutedHeader(hArr), mutedHeader(hResp), mutedHeader(hSnr), mutedHeader(hSig)],
          ...readings.map((reading) => {
            const swatch = new HBox({
              spacing: 4,
              children: [
                new Rectangle(0, 0, 10, 10, {
                  fill: detectorColorProperty(reading.id),
                  cornerRadius: 2,
                }),
                new Text(reading.id, {
                  font: LABEL_FONT,
                  fill: GravitationalWavesColors.textColorProperty,
                  maxWidth: 28,
                }),
              ],
            });
            const arrival = new Text(signedFixed(reading.arrival * 1e3, 2), {
              font: VALUE_FONT,
              fill: GravitationalWavesColors.textColorProperty,
              maxWidth: 54,
            });
            const response =
              reading.response === null
                ? new Text(emDash, {
                    font: VALUE_FONT,
                    fill: GravitationalWavesColors.mutedTextColorProperty,
                    maxWidth: 36,
                  })
                : new Text(StringUtils.fillIn(responsePattern, { value: toFixed(reading.response, 2) }), {
                    font: VALUE_FONT,
                    fill: GravitationalWavesColors.textColorProperty,
                    maxWidth: 36,
                  });
            const snr = new Text(toFixed(reading.snr, 1), {
              font: VALUE_FONT,
              fill: GravitationalWavesColors.textColorProperty,
              maxWidth: 40,
            });
            const sigma = new Text(StringUtils.fillIn(sigmaPattern, { value: toFixed(reading.timingError * 1e3, 2) }), {
              font: VALUE_FONT,
              fill: GravitationalWavesColors.textColorProperty,
              maxWidth: 48,
            });
            return [swatch, arrival, response, snr, sigma];
          }),
        ];

        detectorColumn.addChild(
          new GridBox({
            xSpacing: 8,
            ySpacing: 2,
            xAlign: "left",
            yAlign: "center",
            rows,
          }),
        );

        for (const pair of pairs) {
          pairsColumn.addChild(
            new Text(
              StringUtils.fillIn(pairPattern, {
                a: pair.a,
                b: pair.b,
                delay: signedFixed(pair.delay * 1e3, 2),
                max: toFixed(pair.lightTravelTime * 1e3, 2),
              }),
              {
                font: SMALL_FONT,
                fill: GravitationalWavesColors.textColorProperty,
                maxWidth: NETWORK_PANEL_WIDTH - 28,
              },
            ),
          );
        }
      },
    );

    this.disposePanel = () => {
      areaLink.dispose();
      publishedLink.dispose();
      pointingLink.dispose();
      gridLink.dispose();
      areaProperty.dispose();
      publishedProperty.dispose();
      pointingProperty.dispose();
      content.disposeSubtree();
    };
  }

  public override dispose(): void {
    this.disposePanel();
    super.dispose();
  }
}
