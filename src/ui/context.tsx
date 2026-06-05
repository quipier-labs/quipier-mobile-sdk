import { createContext } from "react";
import type { Features, SlotHelpers, Slots } from "../core/customize";
import { avatarLetter, colorForSeed, formatTime } from "../core/helpers";

/** All features default to enabled — the stock widget shows everything. */
export const DEFAULT_FEATURES: Required<Features> = {
  sort: true,
  composer: true,
  likes: true,
  replies: true,
  report: true,
  menu: true,
  badge: true,
  avatars: true,
};

export const FeaturesContext =
  createContext<Required<Features>>(DEFAULT_FEATURES);

export const DEFAULT_HELPERS: SlotHelpers = {
  formatTime,
  avatarColor: colorForSeed,
};

export interface SlotEnv {
  slots: Slots;
  helpers: SlotHelpers;
}

export const SlotsContext = createContext<SlotEnv>({
  slots: {},
  helpers: DEFAULT_HELPERS,
});

// re-exported for convenience where a custom avatar needs the same initial
export { avatarLetter };
