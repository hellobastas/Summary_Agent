#!/usr/bin/env python3
"""Extract transcript from a YouTube video ID and output as plain text."""

import sys
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter

def get_transcript(video_id):
    try:
        ytt_api = YouTubeTranscriptApi()
        transcript = ytt_api.fetch(video_id)
        formatter = TextFormatter()
        text = formatter.format_transcript(transcript)
        print(text)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: get-transcript.py <video_id>", file=sys.stderr)
        sys.exit(1)
    get_transcript(sys.argv[1])
