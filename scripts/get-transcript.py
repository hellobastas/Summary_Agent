#!/usr/bin/env python3
"""Extract transcript from a YouTube video ID and output as plain text."""

import os
import sys
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter
from youtube_transcript_api.proxies import WebshareProxyConfig, GenericProxyConfig

def get_proxy_config():
    """Build proxy config from environment variables."""
    ws_user = os.environ.get("WEBSHARE_PROXY_USER")
    ws_pass = os.environ.get("WEBSHARE_PROXY_PASS")
    if ws_user and ws_pass:
        return WebshareProxyConfig(
            proxy_username=ws_user,
            proxy_password=ws_pass,
        )

    proxy_url = os.environ.get("PROXY_URL")
    if proxy_url:
        return GenericProxyConfig(https_url=proxy_url)

    return None

def get_transcript(video_id):
    try:
        proxy_config = get_proxy_config()
        if proxy_config:
            ytt_api = YouTubeTranscriptApi(proxy_config=proxy_config)
        else:
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
