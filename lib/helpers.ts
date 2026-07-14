// Handles both `undefined` (key omitted) and `null` (Finnhub explicitly
// returns null for metrics that don't apply to a given company, e.g. P/E
// for a company with negative earnings) - the two shapes upstream data
// actually comes in, which is why raw `.toFixed()` calls on these fields
// are unsafe and this helper exists.
export function formatNumber(value?: number | null, decimals = 2): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return "N/A";
  return value.toFixed(decimals);
}

export function formatCurrency(value?: number | null): string {
  if (value === undefined || value === null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

// Finnhub's dividendYieldIndicatedAnnual and netProfitMarginTTM are already
// expressed as percentages (e.g. 2.5 means 2.5%), so this just formats -
// it does NOT multiply by 100. Passing a 0-1 fraction here would be wrong.
export function formatPercent(value?: number | null): string {
  if (value === undefined || value === null) return "N/A";
  return `${value.toFixed(1)}%`;
}

export function formatDate(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

// Reads a File into a raw base64 string (no "data:mime;base64," prefix),
// ready to send as a Gemini inline_data part. Used by the assistant's
// attach-file composer.
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unexpected file reader result"));
        return;
      }
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// Strips markdown syntax before handing text to the browser's
// speechSynthesis API, so it doesn't read out "asterisk asterisk" or
// "pound sign" for bold text and headings.
export function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\(.*?\)/g, "$1")
    .replace(/[*_#>~]/g, "")
    .replace(/^-\s+/gm, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
