#!/usr/bin/env bash
set -euo pipefail
node "${AGY_PLUGIN_ROOT:-.}/hooks/log-metrics.mjs" stop "$@" || true
