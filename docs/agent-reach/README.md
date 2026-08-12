# Agent Reach — install notes

[Agent Reach](https://github.com/Panniantong/agent-reach) is a third-party CLI (not part of this project) that gives AI agents unified access to content/search across 15+ platforms — installed locally on this machine on 2026-08-11. This note records what was installed and what's outstanding, for reference; it is unrelated to the course-connect codebase itself.

## What it is

A Python CLI, installed via `pipx`, that wraps a set of platform-specific CLIs (gh, yt-dlp, mcporter/Exa, twitter-cli, bili-cli, OpenCLI, etc.) behind one interface so an agent can fetch GitHub repos/code, YouTube captions, web pages, RSS feeds, and (once configured) social platforms like Twitter, Reddit, XiaoHongShu, and more.

## Trust note

The installer runs `pipx install` directly from a GitHub zip archive (not a vetted package registry) and pulls in several more third-party CLIs. It stores any platform credentials/tokens locally under `~/.agent-reach/`. Installed with the user's explicit approval after this was flagged.

## What was installed

- Core: `agent-reach` (pipx), `pipx` itself, Node.js (already present), `gh` CLI (via Chocolatey), `yt-dlp` (via pip), `mcporter` + Exa search config (via npm)
- Optional channels: `bili-cli` (Bilibili), `twitter-cli` (Twitter/X), OpenCLI (browser-session backend for Reddit/Facebook/Instagram), Xiaoyuzhou transcription script

## Status at time of install: 5/15 channels active

| Channel | Status |
|---|---|
| YouTube (yt-dlp) | ✅ Ready |
| V2EX | ✅ Ready (public API) |
| RSS/Atom | ✅ Ready |
| Web pages (Jina Reader) | ✅ Ready |
| Bilibili search/info | ✅ Ready (bili-cli) |
| GitHub repos/code | ⚠️ Installed — needs `gh auth login` |
| Semantic search (Exa) | ⚠️ Configured — needs a live query to confirm connectivity |
| Twitter/X | ⚠️ Installed — needs `agent-reach configure twitter-cookies` |
| XiaoHongShu | ⚠️ Installed — needs `agent-reach configure xhs-cookies` |
| Xueqiu (雪球) | ⚠️ Installed — needs `agent-reach configure --from-browser chrome --platform xueqiu` |
| Bilibili subtitles | ⚠️ Needs `agent-reach configure --from-browser chrome --platform bilibili` |
| Reddit / Facebook / Instagram | ⚠️ Needs the OpenCLI Chrome extension ([Chrome Web Store](https://chromewebstore.google.com/detail/opencli/ildkmabpimmkaediidaifkhjpohdnifk)) + being logged into those sites in that browser |
| Xiaoyuzhou podcast transcription | ⚠️ Needs `ffmpeg` installed + a free Groq API key (`agent-reach configure groq-key`) |
| LinkedIn | ❌ Not installed this run — request explicitly via `agent-reach install --channels=linkedin` |

## Re-checking status

```bash
agent-reach doctor
```

Note: a fresh terminal is needed after install for `agent-reach`, `gh`, and `yt-dlp` to be picked up on `PATH`.
