import {
  backTranslateResponse,
  translateUserPrompt,
} from "@cursor-translate/core";
import { readStdin } from "../helpers/read-stdin.js";

export async function runPrompt(args: string[]): Promise<void> {
  const json = args.includes("--json");
  const force = args.includes("--force");
  const useStdin = args.includes("--stdin");
  const isEnRu = args.includes("--en-ru") || args.includes("--direction=en-ru");
  const textArg = args.find((a) => !a.startsWith("--"));

  let text = textArg;
  if (useStdin || !text) {
    text = await readStdin();
  }

  if (!text || !text.trim()) {
    throw new Error("Usage: agy-translate prompt \"<text>\" [--json] [--force] [--stdin] [--en-ru]");
  }

  if (isEnRu) {
    const result = await backTranslateResponse({
      text,
      force,
    });

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(result.text);
    return;
  }

  const result = await translateUserPrompt({
    text,
    force,
  });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(result.text);
}
