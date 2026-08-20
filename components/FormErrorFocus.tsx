"use client";

import { useEffect } from "react";

/**
 * Moves the viewport to the first validation error after a failed submit.
 *
 * The posting form is several screens long and its submit button sits at the
 * bottom, while the error banner renders at the top. Without this, a rejected
 * submit changed nothing the user could see: the page stayed where it was, so
 * the form looked like it had been accepted when it had not. That is the single
 * most confusing failure a long form can have.
 *
 * Scrolls to the first field-level error where there is one — that is what the
 * user has to act on — and falls back to the summary banner for errors that
 * belong to the form as a whole (rate limits, approval gates).
 */
export function FormErrorFocus({ state }: { state: { ok: boolean } | null }) {
  const failed = state !== null && state.ok === false;

  useEffect(() => {
    if (!failed) return;

    // Let the error markup render before measuring.
    const id = window.requestAnimationFrame(() => {
      const field = document.querySelector<HTMLElement>("[aria-invalid='true'], .field-error");
      const target = field ?? document.querySelector<HTMLElement>("[data-form-alert]");
      if (!target) return;

      target.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "center",
      });

      // Focus the input itself, not its error text, so a keyboard or screen
      // reader user lands on the control they need to correct.
      const focusable =
        target.closest("div")?.querySelector<HTMLElement>("input, select, textarea") ?? null;
      focusable?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(id);
    // `state` is a new object on every failed submit, so repeated failures
    // re-run this rather than being swallowed as "no change".
  }, [state, failed]);

  return null;
}
