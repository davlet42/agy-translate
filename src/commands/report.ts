import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  aggregateTranslateReport,
  aggregateTranslateReportFromMissingFile,
  formatTranslateReport,
  type TranslateReportResult,
} from "@cursor-translate/core";
import { resolveAgyTranslateHome } from "../agy-env.js";
import { formatUsdFromGeminiTranslateTokens } from "../helpers/format-usd-from-translate-tokens.js";
import { resolveMetricsPathFromEnv } from "../helpers/report-helpers.js";

const DEFAULT_METRICS_PATH = join(resolveAgyTranslateHome(), "metrics.jsonl");

export type { TranslateReportMetricsEntry as MetricsEntry } from "@cursor-translate/core";
export type ReportResult = TranslateReportResult;

function parseDays(args: string[]): number {
  const idx = args.indexOf("--days");
  if (idx === -1 || !args[idx + 1]) {
    return 7;
  }
  const n = Number(args[idx + 1]);
  return Number.isFinite(n) && n > 0 ? n : 7;
}

function formatUsdFromMainAgentTokens(tokens: number): string {
  const blendedRate = 3 / 1_000_000;
  return (tokens * blendedRate).toFixed(2);
}

export async function runReport(args: string[]): Promise<TranslateReportResult> {
  const days = parseDays(args);
  const metricsPath = resolveMetricsPathFromEnv(DEFAULT_METRICS_PATH);

  try {
    const raw = await readFile(metricsPath, "utf8");
    return aggregateTranslateReport(raw, days, metricsPath);
  } catch {
    return aggregateTranslateReportFromMissingFile(days, metricsPath);
  }
}

export function formatReport(result: TranslateReportResult): string {
  return formatTranslateReport(result, {
    brand: "agy-translate",
    translateSpendRateLabel: "$0.14/1M (Gemini 3.7 Flash)",
    formatMainAgentSavingsUsd: formatUsdFromMainAgentTokens,
    formatTranslateSpendUsd: formatUsdFromGeminiTranslateTokens,
  });
}
