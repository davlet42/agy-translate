#!/usr/bin/env bash
set -euo pipefail

CLI="${AGY_TRANSLATE_CLI:-agy-translate}"
if ! command -v "$CLI" &>/dev/null; then
  HOME_CLI="$HOME/.gemini/translate-proxy/bin/agy-translate"
  if [[ -x "$HOME_CLI" ]]; then
    CLI="$HOME_CLI"
  fi
fi

exec "$CLI" hook-resolve
