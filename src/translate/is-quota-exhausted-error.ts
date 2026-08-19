const QUOTA_PATTERNS = [
  /rate\s*limit/i,
  /usage\s*limit/i,
  /quota/i,
  /too many requests/i,
  /\b429\b/,
  /exceeded.*usage/i,
  /included\s*api\s*usage/i,
  /included\s*(api\s*)?(requests|credits|tokens)/i,
  /resource[_ ]exhausted/i,
  /out of (credits|quota|usage)/i,
  /no\s+(remaining|included)\s+(usage|credits|quota|requests)/i,
  /usage will reset/i,
  /billing/i,
  /spend\s*limit/i,
  /limit\s*reached/i,
  /you've hit your/i,
  /you have reached your/i,
];

export function isQuotaExhaustedError(message: string): boolean {
  return QUOTA_PATTERNS.some((pattern) => pattern.test(message));
}
