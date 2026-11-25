/**
 * MichelsonNode.ts
 *
 * Schematic Michelson interferometer: laser, beam splitter, arms, Fabry–Pérot
 * cavities, photodetector, and amplitude readouts in a 2-column GridBox.
 */
import { DerivedProperty, Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { Circle, Color, GridBox, Line, Node, Rectangle, RichText, Text } from "scenerystack/scenery";
import { FABRY_PEROT_GAIN } from "../../common/model/Interferometer.js";
import { LABEL_FONT, SMALL_FONT } from "../../common/view/GravitationalWavesFonts.js";
import { formatScientific } from "../../common/view/scientificFormat.js";
import GravitationalWavesColors from "../../GravitationalWavesColors.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { InterferometerModel } from "../model/InterferometerModel.js";

const ARM_PX = 140;
const MIRROR_HALF = 14;
const BEAM_WIDTH = 3;
const CAVITY_WIDTH = 5;
const FP_INSET = 40;

export class MichelsonNode extends Node {
  private readonly disposeMichelson: () => void;

  public constructor(model: InterferometerModel) {
    super({ pickable: false });
    const strings = StringManager.getInstance().getInterferometerStrings();

    const laser = new Rectangle(-90, -12, 40, 24, {
      cornerRadius: 3,
      fill: GravitationalWavesColors.laserBoxColorProperty,
      stroke: GravitationalWavesColors.apparatusColorProperty,
    });
    const splitter = new Line(-18, -18, 18, 18, {
      stroke: GravitationalWavesColors.apparatusColorProperty,
      lineWidth: 3,
    });

    // Thin beam segments (never stair-stepped multi-pass Paths).
    const beamIn = new Line(-50, 0, 0, 0, {
      stroke: GravitationalWavesColors.laserBeamColorProperty,
      lineWidth: BEAM_WIDTH,
    });
    const beamX = new Line(0, 0, ARM_PX, 0, {
      stroke: GravitationalWavesColors.laserBeamColorProperty,
      lineWidth: BEAM_WIDTH,
    });
    const beamY = new Line(0, 0, 0, -ARM_PX, {
      stroke: GravitationalWavesColors.laserBeamColorProperty,
      lineWidth: BEAM_WIDTH,
    });
    const beamOut = new Line(0, 0, 0, 70, {
      stroke: GravitationalWavesColors.laserBeamColorProperty,
      lineWidth: BEAM_WIDTH,
    });

    // Brighter, slightly wider cavity segments (input mirror ↔ end mirror).
    const cavityX = new Line(FP_INSET, 0, ARM_PX, 0, {
      stroke: GravitationalWavesColors.laserBeamColorProperty,
      lineWidth: CAVITY_WIDTH,
      opacity: 0.95,
    });
    const cavityY = new Line(0, -FP_INSET, 0, -ARM_PX, {
      stroke: GravitationalWavesColors.laserBeamColorProperty,
      lineWidth: CAVITY_WIDTH,
      opacity: 0.95,
    });
    const cavityLabelX = new Text("", {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.accentColorProperty,
    });
    const cavityLabelY = new Text("", {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.accentColorProperty,
    });

    const mirrorX = new Rectangle(0, -MIRROR_HALF, 6, 2 * MIRROR_HALF, {
      fill: GravitationalWavesColors.apparatusColorProperty,
    });
    const mirrorY = new Rectangle(-MIRROR_HALF, 0, 2 * MIRROR_HALF, 6, {
      fill: GravitationalWavesColors.apparatusColorProperty,
    });
    const massX = new Circle(8, { fill: GravitationalWavesColors.testMassColorProperty });
    const massY = new Circle(8, { fill: GravitationalWavesColors.testMassColorProperty });

    const fpX = new Rectangle(FP_INSET, -MIRROR_HALF, 4, 2 * MIRROR_HALF, {
      fill: GravitationalWavesColors.apparatusColorProperty,
    });
    const fpY = new Rectangle(-MIRROR_HALF, -FP_INSET, 2 * MIRROR_HALF, 4, {
      fill: GravitationalWavesColors.apparatusColorProperty,
    });

    const detector = new Rectangle(-14, 70, 28, 18, {
      cornerRadius: 2,
      fill: GravitationalWavesColors.photodetectorColorProperty,
      stroke: GravitationalWavesColors.apparatusColorProperty,
    });

    const labelNode = (property: TReadOnlyProperty<string>) =>
      new Text(property, {
        font: SMALL_FONT,
        fill: GravitationalWavesColors.mutedTextColorProperty,
        maxWidth: 140,
      });
    const valueNode = (property: TReadOnlyProperty<string>) =>
      new RichText(property, {
        font: LABEL_FONT,
        fill: GravitationalWavesColors.textColorProperty,
        maxWidth: 160,
      });

    const deltaLTextProperty = new DerivedProperty(
      [model.deltaLAmplitudeProperty, strings.deltaLValueStringProperty],
      (v, pattern) => StringUtils.fillIn(pattern, { value: formatScientific(v, 2) }),
    );
    const deltaPhiTextProperty = new DerivedProperty(
      [model.deltaPhiAmplitudeProperty, strings.deltaPhiValueStringProperty],
      (v, pattern) => StringUtils.fillIn(pattern, { value: formatScientific(v, 2) }),
    );
    const fPlusTextProperty = new DerivedProperty(
      [model.fPlusProperty, strings.antennaValueStringProperty],
      (v, pattern) => StringUtils.fillIn(pattern, { value: toFixed(v, 3) }),
    );
    const fCrossTextProperty = new DerivedProperty(
      [model.fCrossProperty, strings.antennaValueStringProperty],
      (v, pattern) => StringUtils.fillIn(pattern, { value: toFixed(v, 3) }),
    );
    const responseTextProperty = new DerivedProperty(
      [model.detectorResponseProperty, strings.responseValueStringProperty],
      (v, pattern) => StringUtils.fillIn(pattern, { value: toFixed(v, 3) }),
    );

    const colon = (label: TReadOnlyProperty<string>) => new DerivedProperty([label], (s) => `${s}:`);

    const deltaLColon = colon(strings.deltaLStringProperty);
    const deltaPhiColon = colon(strings.deltaPhiStringProperty);
    const fPlusColon = colon(strings.fPlusStringProperty);
    const fCrossColon = colon(strings.fCrossStringProperty);
    const responseColon = colon(strings.responseStringProperty);

    const blindNote = new Text(strings.blindSpotNoteStringProperty, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.accentColorProperty,
      maxWidth: 220,
      visibleProperty: model.isBlindSpotProperty,
    });

    const readoutGrid = new GridBox({
      xSpacing: 24,
      ySpacing: 6,
      xAlign: "left",
      rows: [
        [labelNode(deltaLColon), valueNode(deltaLTextProperty)],
        [labelNode(deltaPhiColon), valueNode(deltaPhiTextProperty)],
        [labelNode(fPlusColon), valueNode(fPlusTextProperty)],
        [labelNode(fCrossColon), valueNode(fCrossTextProperty)],
        [labelNode(responseColon), valueNode(responseTextProperty)],
      ],
    });
    readoutGrid.centerX = ARM_PX / 2;
    readoutGrid.top = 100;
    blindNote.centerX = ARM_PX / 2;
    blindNote.top = readoutGrid.bottom + 6;

    const apparatus = new Node({
      children: [
        laser,
        beamIn,
        beamX,
        beamY,
        cavityX,
        cavityY,
        beamOut,
        splitter,
        fpX,
        fpY,
        mirrorX,
        mirrorY,
        massX,
        massY,
        detector,
        cavityLabelX,
        cavityLabelY,
      ],
    });

    this.children = [apparatus, readoutGrid, blindNote];

    const beamAlphaProperty = new DerivedProperty(
      [model.powerRatioProperty, GravitationalWavesColors.laserBeamColorProperty],
      (ratio, color) => {
        const c = color instanceof Color ? color : new Color(color as string);
        return c.withAlpha(Math.max(0.08, Math.min(1, ratio)));
      },
    );
    beamOut.stroke = beamAlphaProperty as never;

    const gainLabelProperty = new DerivedProperty([strings.fabryGainLabelStringProperty], (pattern) =>
      StringUtils.fillIn(pattern, { gain: FABRY_PEROT_GAIN }),
    );
    cavityLabelX.string = gainLabelProperty.value;
    cavityLabelY.string = gainLabelProperty.value;
    const gainListener = (s: string) => {
      cavityLabelX.string = s;
      cavityLabelY.string = s;
    };
    gainLabelProperty.link(gainListener);

    const multilink = Multilink.multilink(
      [
        model.deltaLProperty,
        model.exaggerationProperty,
        model.fabryPerotProperty,
        model.armLengthMProperty,
        gainLabelProperty,
      ],
      (deltaL, exaggeration, fabry, L) => {
        const visual = Math.max(-28, Math.min(28, ((deltaL * exaggeration) / Math.max(L, 1)) * ARM_PX));
        const xPos = ARM_PX + visual;
        const yPos = -(ARM_PX - visual);
        mirrorX.centerX = xPos;
        mirrorX.centerY = 0;
        massX.centerX = xPos + 14;
        massX.centerY = 0;
        mirrorY.centerX = 0;
        mirrorY.centerY = yPos;
        massY.centerX = 0;
        massY.centerY = yPos - 14;

        fpX.visible = fabry;
        fpY.visible = fabry;
        cavityX.visible = fabry;
        cavityY.visible = fabry;
        cavityLabelX.visible = fabry;
        cavityLabelY.visible = fabry;

        if (fabry) {
          // Thin feeder to the input mirror; cavity alone covers input → end (no double stroke).
          beamX.setPoint2(FP_INSET, 0);
          beamY.setPoint2(0, -FP_INSET);
          cavityX.setPoint1(FP_INSET, 0);
          cavityX.setPoint2(xPos, 0);
          cavityY.setPoint1(0, -FP_INSET);
          cavityY.setPoint2(0, yPos);
        } else {
          beamX.setPoint2(xPos, 0);
          beamY.setPoint2(0, yPos);
        }

        cavityLabelX.centerX = (FP_INSET + xPos) / 2;
        cavityLabelX.bottom = -8;
        cavityLabelY.left = 10;
        cavityLabelY.centerY = (-FP_INSET + yPos) / 2;
      },
    );

    this.disposeMichelson = () => {
      multilink.dispose();
      beamAlphaProperty.dispose();
      gainLabelProperty.unlink(gainListener);
      gainLabelProperty.dispose();
      const children = this.children.slice();
      for (const child of children) {
        if (!child.isDisposed) {
          child.disposeSubtree();
        }
      }
      deltaLColon.dispose();
      deltaPhiColon.dispose();
      fPlusColon.dispose();
      fCrossColon.dispose();
      responseColon.dispose();
      deltaLTextProperty.dispose();
      deltaPhiTextProperty.dispose();
      fPlusTextProperty.dispose();
      fCrossTextProperty.dispose();
      responseTextProperty.dispose();
    };
  }

  public override dispose(): void {
    this.disposeMichelson();
    super.dispose();
  }
}
