---
title: How the AI works and its limits
summary: Which AI models write your copy, how results are validated, rate limits, accuracy and safety.
category: AI
order: 13
keywords: [ai, model, groq, gemini, llama, accuracy, wrong, limit, rate limit, quota, too many requests, slow, validation, safety, hallucination]
actions: [open-studio, open-help]
updated: 2026-11-17
---
## Models and fallback
Generation runs on our server, never in your browser, so API keys stay private. The primary provider is **Groq**; if it is slow, rate-limited or returns invalid output, Vitrine retries and then falls back to **Google Gemini Flash** automatically. The Studio shows which provider answered.

## Validation
The AI must return strict JSON with a title, description and keywords. The server checks lengths and types, removes links, markdown and HTML, and only then sends the card to you. Everything is shown as plain text, never as raw HTML.

## Limits
To keep the free service fair there are rate limits: about 8 generations per minute for guests and 15 per minute for signed-in users, with hourly caps. If you hit a limit you will see how many seconds to wait.

## Accuracy
AI copy can be wrong or generic. Always check facts such as materials, sizes, certifications and prices before publishing. You are responsible for the copy you publish. See the AI Disclaimer for details.
