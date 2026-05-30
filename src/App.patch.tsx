/**
 * ── App.tsx patch ────────────────────────────────────────────────────────────
 *
 * Add these two lines to your existing App.tsx / AppInner component:
 *
 *   1. At the top of the file, with the other imports:
 *        import { syncStatusBar } from "@/lib/statusBar";
 *
 *   2. Inside AppInner (or your top-level component), before the return:
 *        useEffect(() => {
 *          syncStatusBar(false); // false = light mode
 *        }, []);
 *
 * That's it. The status bar will now match the neumorphic background colour.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Example of the full AppInner function after applying the patch:

import { useEffect } from "react";
import { syncStatusBar } from "@/lib/statusBar";

// Inside your AppInner or App component:
export function AppInnerPatchExample() {
  // ← ADD THIS
  useEffect(() => {
    syncStatusBar(false); // call syncStatusBar(true) when dark mode is on
  }, []);

  // ... rest of your existing AppInner JSX unchanged ...
  return null;
}
