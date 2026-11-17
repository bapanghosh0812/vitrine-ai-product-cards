# 0005. Firebase Auth and Firestore, without Firebase Storage

- Status: accepted (2026-11-17)

## Context
The Spark (free) plan no longer includes Cloud Storage buckets. Users still want product photos on cards.

## Decision
Use Firebase Authentication (email/password with verification, Google) and Firestore. Images are resized and converted to WebP in the browser (`image-compress.ts`, longest side 900 px, under 300 KB) and stored inside the card document (Firestore limit 1 MiB) or in localStorage for guests. The SDK is lazy-loaded only in the browser. Servers verify ID tokens with `firebase-admin` initialised with the project id only, so no service account is ever deployed.

## Consequences
Zero cost and no file-upload attack surface. Image size is capped, and very large libraries of photo cards would grow Firestore reads; acceptable for this product.
