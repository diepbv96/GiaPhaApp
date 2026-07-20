import { useState } from "react";
import {
  clearAllTreesDefaultColor,
  clearTreeColor,
  resolveBackgroundColor,
  setAllTreesDefaultColor,
  setTreeColor,
} from "@/features/tree/backgroundColorPreference";

export interface BackgroundColorPreference {
  /** What TreeCanvas should render right now — live preview while picking, else the
   * persisted (resolved) choice, else `undefined` (app default, no override). */
  effectiveColor: string | undefined;
  previewColor: string | undefined;
  /** Call on every `<input type="color">` `onInput` for a live preview (spec
   * Clarifications Q1) — nothing is persisted until save. */
  onPreview: (colorHex: string) => void;
  saveForTree: () => void;
  saveForAllTrees: () => void;
  resetTree: () => void;
  resetAllTreesDefault: () => void;
}

export function useBackgroundColorPreference(treeId: string): BackgroundColorPreference {
  const [prevTreeId, setPrevTreeId] = useState(treeId);
  const [previewColor, setPreviewColor] = useState<string | undefined>(undefined);
  // Bumped after every save/reset to force a re-render even when previewColor was
  // already undefined (e.g. resetting with no preview open) — persistedColor below
  // isn't memoized, so any re-render picks up the latest sessionStorage value.
  const [, forceRerender] = useState(0);

  // A preview never leaks from one tree to another — adjust state during render
  // (React's recommended alternative to an effect for this exact case) rather than
  // in a useEffect, which would cause an extra cascading render.
  if (treeId !== prevTreeId) {
    setPrevTreeId(treeId);
    setPreviewColor(undefined);
  }

  const persistedColor = resolveBackgroundColor(treeId);

  function saveForTree() {
    if (previewColor === undefined) return;
    setTreeColor(treeId, previewColor);
    setPreviewColor(undefined);
    forceRerender((value) => value + 1);
  }

  function saveForAllTrees() {
    if (previewColor === undefined) return;
    setAllTreesDefaultColor(previewColor);
    setPreviewColor(undefined);
    forceRerender((value) => value + 1);
  }

  function resetTree() {
    clearTreeColor(treeId);
    setPreviewColor(undefined);
    forceRerender((value) => value + 1);
  }

  function resetAllTreesDefault() {
    clearAllTreesDefaultColor();
    setPreviewColor(undefined);
    forceRerender((value) => value + 1);
  }

  return {
    effectiveColor: previewColor ?? persistedColor,
    previewColor,
    onPreview: setPreviewColor,
    saveForTree,
    saveForAllTrees,
    resetTree,
    resetAllTreesDefault,
  };
}
