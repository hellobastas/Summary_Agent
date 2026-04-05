#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
VIDEO_ID="$1"

# Source .env for proxy credentials
if [ -f "$REPO_DIR/.env" ]; then
    set -a
    source "$REPO_DIR/.env"
    set +a
fi
DATE=$(date '+%Y-%m-%d_%H%M%S')
LOG_FILE="$REPO_DIR/data/logs/${DATE}_${VIDEO_ID}.md"

# Get transcript
TRANSCRIPT=$(python3 "$SCRIPT_DIR/get-transcript.py" "$VIDEO_ID" 2>&1)
if [ $? -ne 0 ] || echo "$TRANSCRIPT" | grep -q "^ERROR:"; then
    echo "Failed to get transcript: $TRANSCRIPT" >&2
    exit 1
fi

# Load summary prompt
SUMMARY_PROMPT=$(cat "$REPO_DIR/prompts/summary-prompt.md")

# Build full prompt
FULL_PROMPT="$SUMMARY_PROMPT

---

## Transcript

$TRANSCRIPT"

# Run through Claude
SUMMARY=$(claude -p "$FULL_PROMPT" --output-format text --model sonnet 2>&1)

# Save log
echo "$SUMMARY" > "$LOG_FILE"

# Output summary
echo "$SUMMARY"
