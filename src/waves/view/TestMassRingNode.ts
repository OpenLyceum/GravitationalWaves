/**
 * TestMassRingNode.ts
 *
 * Ring of free test masses, deformable spacetime grid, arm length guides, and a
 * propagation-direction icon.
 */
import { Multilink } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { Circle, Line, Node, Path, Text } from "scenerystack/scenery";
import { SMALL_FONT } from "../../common/view/GravitationalWavesFonts.js";
import GravitationalWavesColors from "../../GravitationalWavesColors.js";
import {
  CENTRE_MASS_RADIUS,
  DEFORM_GRID_LINES,
  TEST_MASS_COUNT,
  TEST_MASS_RADIUS,
  TEST_MASS_RING_RADIUS,
} from "../../GravitationalWavesConstants.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { WavesModel } from "../model/WavesModel.js";

export class TestMassRingNode extends Node {
  private readonly disposeRing: () => void;

  public constructor(model: WavesModel) {
    super({ pickable: false });
    const strings = StringManager.getInstance().getWavesStrings();

    const restRing = new Path(null, {
      stroke: GravitationalWavesColors.restRingColorProperty,
      lineWidth: 1.5,
      lineDash: [4, 4],
    });
    const grid = new Path(null, {
      stroke: GravitationalWavesColors.deformGridColorProperty,
      lineWidth: 1,
    });
    const armX = new Line(0, 0, TEST_MASS_RING_RADIUS, 0, {
      stroke: GravitationalWavesColors.armLineColorProperty,
      lineWidth: 2,
    });
    const armY = new Line(0, 0, 0, -TEST_MASS_RING_RADIUS, {
      stroke: GravitationalWavesColors.armLineColorProperty,
      lineWidth: 2,
    });
    const labelX = new Text(strings.armLabelXStringProperty, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.armLineColorProperty,
    });
    const labelY = new Text(strings.armLabelYStringProperty, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.armLineColorProperty,
    });
    const centre = new Circle(CENTRE_MASS_RADIUS, {
      fill: GravitationalWavesColors.centreMassColorProperty,
    });
    const masses: Circle[] = [];
    for (let i = 0; i < TEST_MASS_COUNT; i++) {
      masses.push(
        new Circle(TEST_MASS_RADIUS, {
          fill: GravitationalWavesColors.testMassColorProperty,
        }),
      );
    }

    const restPositions: { x: number; y: number }[] = [];
    for (let i = 0; i < TEST_MASS_COUNT; i++) {
      const angle = (2 * Math.PI * i) / TEST_MASS_COUNT;
      restPositions.push({
        x: TEST_MASS_RING_RADIUS * Math.cos(angle),
        y: TEST_MASS_RING_RADIUS * Math.sin(angle),
      });
    }
    restRing.shape = Shape.circle(0, 0, TEST_MASS_RING_RADIUS);

    // Propagation icon (⊙) — wave coming out of the screen.
    const propIcon = new Node({
      children: [
        new Circle(14, {
          stroke: GravitationalWavesColors.accentColorProperty,
          lineWidth: 2,
        }),
        new Circle(3, { fill: GravitationalWavesColors.accentColorProperty }),
      ],
    });
    const propCaption = new Text(strings.propagationCaptionStringProperty, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      maxWidth: 140,
    });
    const prop = new Node({ children: [propIcon, propCaption] });
    propCaption.centerX = propIcon.centerX;
    propCaption.top = propIcon.bottom + 4;
    prop.left = TEST_MASS_RING_RADIUS + 40;
    prop.top = -TEST_MASS_RING_RADIUS;

    this.children = [grid, restRing, armX, armY, labelX, labelY, centre, ...masses, prop];

    const multilink = Multilink.multilink([model.hPlusProperty, model.hCrossProperty], (hPlus, hCross) => {
      // Masses
      for (let i = 0; i < masses.length; i++) {
        const rest = restPositions[i];
        const mass = masses[i];
        if (!(rest && mass)) {
          continue;
        }
        const { dx, dy } = model.displaceTestMass(rest.x, rest.y, hPlus, hCross);
        mass.centerX = rest.x + dx;
        mass.centerY = rest.y + dy;
      }

      // Arms along +x and +y
      const xEnd = model.displaceTestMass(TEST_MASS_RING_RADIUS, 0, hPlus, hCross);
      const yEnd = model.displaceTestMass(0, TEST_MASS_RING_RADIUS, hPlus, hCross);
      armX.setPoint2(TEST_MASS_RING_RADIUS + xEnd.dx, xEnd.dy);
      armY.setPoint2(yEnd.dx, -(TEST_MASS_RING_RADIUS + yEnd.dy));
      labelX.centerX = (TEST_MASS_RING_RADIUS + xEnd.dx) / 2;
      labelX.bottom = Math.min(xEnd.dy, 0) - 4;
      labelY.right = Math.min(yEnd.dx, 0) - 4;
      labelY.centerY = -(TEST_MASS_RING_RADIUS + yEnd.dy) / 2;

      // Deforming grid
      const shape = new Shape();
      const n = DEFORM_GRID_LINES;
      const half = TEST_MASS_RING_RADIUS;
      for (let i = 0; i < n; i++) {
        const t = (2 * i) / (n - 1) - 1;
        const x0 = t * half;
        const y0 = t * half;
        // Vertical line at x = x0
        for (let j = 0; j < n; j++) {
          const s = (2 * j) / (n - 1) - 1;
          const y = s * half;
          const d = model.displaceTestMass(x0, y, hPlus, hCross);
          if (j === 0) {
            shape.moveTo(x0 + d.dx, y + d.dy);
          } else {
            shape.lineTo(x0 + d.dx, y + d.dy);
          }
        }
        // Horizontal line at y = y0
        for (let j = 0; j < n; j++) {
          const s = (2 * j) / (n - 1) - 1;
          const x = s * half;
          const d = model.displaceTestMass(x, y0, hPlus, hCross);
          if (j === 0) {
            shape.moveTo(x + d.dx, y0 + d.dy);
          } else {
            shape.lineTo(x + d.dx, y0 + d.dy);
          }
        }
      }
      grid.shape = shape;
    });

    this.disposeRing = () => multilink.dispose();
  }

  public override dispose(): void {
    this.disposeRing();
    super.dispose();
  }
}
