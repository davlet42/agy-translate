export {
  resolveDocTranslateCostBucket,
  resolveBySourceKey,
  estimateBreakEvenReads,
} from "@cursor-translate/core";

export function resolveMetricsPathFromEnv(defaultPath: string): string {
  return (
    process.env.AGY_TRANSLATE_METRICS_PATH?.trim() ||
    process.env.CURSOR_TRANSLATE_METRICS_PATH?.trim() ||
    defaultPath
  );
}
