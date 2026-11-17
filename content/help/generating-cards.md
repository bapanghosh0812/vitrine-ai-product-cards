---
title: Generate product details
summary: Every field of the generation form, what the AI returns, variations, single-field regeneration and creativity.
category: Studio
order: 2
keywords: [generate, form, name, category, ai, title, description, keywords, variations, regenerate, tone, language, audience, features, price, creativity]
actions: [open-studio, open-brand-kit]
updated: 2026-11-17
---
The Studio form has two required fields and several optional ones.

## Required fields
- **Product name**: 2 to 80 characters. Be specific: "Matte black ceramic pour-over set" works better than "coffee thing".
- **Category**: choose from 20 categories such as Fashion, Electronics, Beauty, Home, Jewellery or Pet Supplies. Pick "Something else" if nothing fits.

The **Generate details** button stays disabled until both are valid. Errors are shown under each field.

## Optional fields (More options)
- **Audience**: who it is for, for example "new parents" or "home baristas".
- **Tone**: Luxurious, Friendly, Playful, Professional, Minimal or Bold.
- **Key features**: up to 5 short features, one per line.
- **Price and currency**: shown on the Marketplace and Instagram templates.
- **Language**: English, Hindi, Bengali, Spanish, French, German, Arabic or Japanese.
- **Variations**: 1 or 3. With 3 you get different angles to compare side by side.

## What the AI returns
Every generation returns strict JSON with three parts: a **title** (aim: 60 characters or fewer), a **description** (2 to 3 sentences, about 140 to 220 characters) and **keywords** (4 to 10 lowercase search terms). The server validates the result and retries or switches provider if the output is malformed.

## Regenerate one field
Use the small circular-arrow button next to the title, description or keywords in the Details panel to regenerate only that field. The other fields stay as they are.

## Undo and redo
Every generation and edit is a step in your history. Use the undo and redo buttons, or `Ctrl/Cmd + Z` and `Ctrl/Cmd + Shift + Z`.

## Creativity
In Settings, Generation you can choose Precise, Balanced or Creative. Creative produces bolder copy; Precise sticks closely to your inputs.
