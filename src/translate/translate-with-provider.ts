import {
  translateMarkdownWithProvider as coreTranslateMarkdown,
  type TranslateProvider as CoreTranslateProvider,
} from "@cursor-translate/core";
import { translateMarkdownAgyCli } from "./translate-markdown-agy-cli.js";

export type TranslateProvider = "agy-cli" | CoreTranslateProvider;

export interface TranslateMarkdownOptions {
  provider: TranslateProvider;
  model: string;
  docFallbackModel: string;
  glossaryTerms: string[];
  customRules?: string | null;
  apiKey?: string;
  allowFallback?: boolean;
}

export interface TranslateMarkdownResult {
  text: string;
  modelUsed: string;
  usedFallback: boolean;
  quotaExhausted: boolean;
  costUsd?: number;
}

export async function translateMarkdown(
  markdown: string,
  options: TranslateMarkdownOptions,
): Promise<TranslateMarkdownResult> {
  if (options.provider === "agy-cli") {
    return translateMarkdownAgyCli(markdown, {
      model: options.model,
      fallbackModel: options.docFallbackModel,
      glossaryTerms: options.glossaryTerms,
      customRules: options.customRules,
      allowFallback: options.allowFallback ?? true,
    });
  }

  return coreTranslateMarkdown(markdown, options as any);
}
