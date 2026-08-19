import {
  GEMINI_FLASH_BLENDED_USD_PER_MILLION,
} from "../constants/gemini-translate-pricing.constant.js";

export function formatUsdFromGeminiTranslateTokens(tokens: number): string {
  const usd = (tokens * GEMINI_FLASH_BLENDED_USD_PER_MILLION) / 1_000_000;
  return usd < 0.01 && usd > 0 ? "<$0.01" : `$${usd.toFixed(2)}`;
}
