"use client";
import { useEffect, useState } from "react";

const WORDS_PER_TICK = 3;
const TICK_MS = 35;

/**
 * Reveals `text` a few words at a time when `enabled` is true - a
 * lightweight "typing" animation for a freshly-arrived assistant reply.
 *
 * This is NOT token streaming - services/ai/* (intentionally left alone
 * by this redesign) returns one complete response, not a stream, so
 * there's nothing to stream from. This animates the reveal of text that
 * has already fully arrived, the same trade-off most chat UIs make when
 * their backend doesn't stream. One side effect worth naming: because the
 * reveal slices raw markdown text mid-token, a bold/code/table marker can
 * render unclosed for a tick or two before the rest catches up - brief
 * and cosmetic, and the same thing real token-streaming UIs show too.
 *
 * Runs once per mount and ignores later prop changes on purpose: a given
 * message's content never changes after it's appended, so there's nothing
 * meaningful for this to react to after the first render.
 */
export function useTypewriter(text: string, enabled: boolean): string {
  const [revealedCount, setRevealedCount] = useState(enabled ? 0 : text.length);

  useEffect(() => {
    if (!enabled) return;
    // Split into word+trailing-whitespace tokens so revealing N tokens
    // always lands on a natural word boundary rather than mid-word.
    const tokens = text.match(/\S+\s*/g) ?? [text];
    let shown = 0;
    const id = setInterval(() => {
      shown += WORDS_PER_TICK;
      if (shown >= tokens.length) {
        setRevealedCount(text.length);
        clearInterval(id);
        return;
      }
      setRevealedCount(tokens.slice(0, shown).join("").length);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [text, enabled]);

  return enabled ? text.slice(0, revealedCount) : text;
}
