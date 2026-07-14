export const APP_NAME = "ReasonVest AI";
export const APP_TAGLINE = "Investment Decisions Powered by Evidence.";

export const TRENDING_COMPANIES = [
  "Apple",
  "Microsoft",
  "Tesla",
  "NVIDIA",
  "Amazon",
  "Meta",
] as const;

export const LOADING_STEPS = [
  "Verifying company",
  "Collecting company profile",
  "Collecting financial data",
  "Collecting latest news",
  "AI analyzing evidence",
  "Preparing report",
] as const;

// Dark mode palette, as specified.
export const COLORS = {
  primary: "#0F172A",
  accent: "#3B82F6",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
} as const;

// Attachment limits for the AI Assistant's composer. Images and a few
// document types Gemini can read directly as inline data - kept to formats
// that don't need the separate Files API, and small enough to stay well
// under Gemini's ~20MB inline request-size ceiling once base64-encoded.
export const ACCEPTED_ATTACHMENT_TYPES =
  "image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/csv,text/markdown";
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB per file
export const MAX_ATTACHMENTS_PER_MESSAGE = 4;
