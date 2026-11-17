---
title: Cookie Policy
summary: Vitrine uses essential browser storage only by default, optional preference storage if you allow it, and no advertising or analytics cookies.
version: 2026-11-17
updated: 17 November 2026
order: 3
---
This Cookie Policy explains how Vitrine uses cookies and similar technologies such as local storage, session storage and IndexedDB ("**storage**"). It should be read with the [Privacy Policy](/legal/privacy).

**Summary.** No ads, no analytics, no cross-site tracking. Essential storage keeps you signed in and remembers your cookie choice. Preference storage (theme, settings and Studio drafts across visits) is off until you allow it.

## 1. Essential storage (always on)
These are strictly necessary to provide the service you request and cannot be switched off.

| Name | Type | Purpose | Duration |
| --- | --- | --- | --- |
| Firebase Authentication (firebase:authUser..., firebaseLocalStorageDb) | IndexedDB / local storage | Keeps you signed in securely | Until you sign out |
| vitrine.cookie-consent | Local storage | Remembers your cookie choice | Until you clear it |
| vitrine.guest.cards, vitrine.guest.brand-kit | Local storage | Stores cards and Brand Kit you create in guest mode | Until you delete them |
| Firestore offline cache | IndexedDB | Lets your saved cards load quickly and work offline | Managed by your browser |
| Service worker cache (ngsw) | Cache storage | Makes the app installable and available offline | Updated with each release |

## 2. Preference storage (optional)
If you choose **Allow preferences**, we remember your theme, settings, Studio draft, recent commands and Ask Kabir chat history across visits in local storage (keys starting with vitrine.). If you choose **Necessary only**, the same information is kept in session storage and is cleared when you close the tab.

## 3. What we do not use
We do not use advertising cookies, analytics or measurement tools, social media pixels, fingerprinting or cross-site tracking of any kind.

## 4. Third-party storage
When you sign in with Google, Google may set its own cookies on its own domains during the sign-in flow under Google's policies. Our hosting providers (Vercel, Netlify, GitHub Pages) may process technical data such as IP addresses to deliver pages securely, but they do not set tracking cookies through Vitrine.

## 5. Managing your choices
Change your choice at any time with **Cookie settings** in the site footer or in Settings, History & Privacy. You can delete all Vitrine data from this browser with **Clear local data**, or through your browser's site settings. Blocking essential storage will prevent sign-in and guest saving from working.

## 6. Changes and contact
We will update this policy's version and date when it changes. Questions: {{SUPPORT_EMAIL}}.
