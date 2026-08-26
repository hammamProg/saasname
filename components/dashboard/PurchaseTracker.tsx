"use client";

import { useEffect, useRef } from "react";
import { trackPurchaseCompleted } from "@/libs/analytics";

/** Fires the GA4 `purchase` event once when Paddle returns to `?checkout=success`.
 *
 *  Rendered only on that redirect. The ref guards React's development double-
 *  invoke of effects, which would otherwise double-count every sale. A page
 *  refresh still re-fires, so reconcile revenue against Paddle rather than GA. */
export default function PurchaseTracker() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackPurchaseCompleted();
  }, []);

  return null;
}
