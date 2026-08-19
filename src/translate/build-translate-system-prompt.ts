import { DEFAULT_TRANSLATE_SYSTEM_PROMPT } from "@cursor-translate/core";

export function buildTranslateSystemPrompt(customRules?: string | null): string {
  const trimmed = customRules?.trim();
  if (!trimmed) {
    return DEFAULT_TRANSLATE_SYSTEM_PROMPT;
  }

  return `${DEFAULT_TRANSLATE_SYSTEM_PROMPT}

Project-specific rules (override or extend the defaults above when they conflict):
${trimmed}`;
}
