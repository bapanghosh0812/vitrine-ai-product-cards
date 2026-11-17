---
title: AI Disclaimer
summary: How Vitrine uses AI models, what their limits are, and why you must review every generated title, description and keyword before publishing.
version: 2026-11-17
updated: 17 November 2026
order: 4
---
Vitrine uses large language models from third-party providers to write product copy and to answer support questions. This page explains what that means for you. It forms part of the [Terms of Service](/legal/terms).

## 1. Which AI is used
- **Product copy** (title, description, keywords) is generated on our server by **Groq**-hosted models, with **Google Gemini** as an automatic fallback when the primary provider is slow, unavailable or returns invalid output. The Studio shows which provider and model produced each result.
- **Ask Kabir** answers questions using the same providers, grounded only in the articles of our Help Center.
- **Brand art.** The Kabir mascot and the Vitrine app-icon artwork were created with AI image tools. The SVG logo and the interface were designed and built by hand.

## 2. Output can be wrong
AI models predict likely text; they do not know facts about your product. Output may be inaccurate, invented ("hallucinated"), outdated, generic, repetitive, culturally insensitive or unsuitable for your market. Similar copy can be generated for other users. Translations into languages other than English may be less fluent.

## 3. You are the editor
Before publishing or relying on any Output, check and correct it. In particular verify:
- materials, ingredients, dimensions, weight, colours and compatibility;
- certifications, awards, origin claims (for example GI tags or "handmade") and warranties;
- health, safety, medical, environmental and "organic" or "natural" claims;
- prices, discounts, availability and delivery promises;
- trademarks, brand names and comparisons with competitors.

You are responsible for complying with consumer protection, advertising and marketplace rules that apply to you, including India's Consumer Protection Act, 2019 and the Guidelines for Prevention of Misleading Advertisements, and the policies of the marketplaces where you list products.

## 4. How we make Output safer
- Your input is sent to the model as data inside a structured prompt that instructs it to ignore embedded instructions.
- The model must return strict JSON that we validate for type and length; invalid results are retried or sent to the fallback provider.
- Links, email addresses, markdown and HTML are removed, and all text is displayed as plain text, never as raw HTML.
- The support assistant is limited to Vitrine topics, cannot see your account data, and its responses are filtered for secrets and prompt leaks.

These safeguards reduce risk but cannot eliminate it.

## 5. Your data and AI providers
Product details and support questions are processed by the AI providers named above. Free tiers of AI services may retain inputs and use them to improve their services. Do not enter personal, confidential or sensitive information. See the [Privacy Policy](/legal/privacy) for details.

## 6. Not professional advice
Output is not legal, medical, financial, tax or regulatory advice. Consult a qualified professional where it matters.

## 7. Reporting problems
If you see harmful, offensive or clearly wrong output, use the thumbs-down button in Ask Kabir or open a support ticket, and include the product details so we can improve our safeguards.
