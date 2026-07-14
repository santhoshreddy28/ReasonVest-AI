import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";

/**
 * Display face for the assistant's brand moments only (wordmark, empty-state
 * greeting, sidebar section labels) - a distinct geometric sans so those
 * moments don't just fall back to the body system-font stack.
 *
 * Self-hosted via @fontsource (an npm package that ships the font files
 * directly) rather than next/font/google, which fetches from Google Fonts'
 * CDN at build time - self-hosting keeps the build from depending on that
 * network call succeeding, and ships the same files either way. `className`
 * is kept as the export shape so call sites read the same as a next/font
 * object would.
 */
export const displayFont = {
  className: "font-display",
};
