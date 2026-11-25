/**
 * NetworkKeyboardHelpContent.ts
 *
 * Keyboard-help dialog for the Network screen.
 */
import {
  BasicActionsKeyboardHelpSection,
  ComboBoxKeyboardHelpSection,
  MoveDraggableItemsKeyboardHelpSection,
  SliderControlsKeyboardHelpSection,
  TimeControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";

export class NetworkKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    super(
      [
        new BasicActionsKeyboardHelpSection(),
        new MoveDraggableItemsKeyboardHelpSection(),
        new ComboBoxKeyboardHelpSection(),
      ],
      [new SliderControlsKeyboardHelpSection(), new TimeControlsKeyboardHelpSection()],
    );
  }
}
