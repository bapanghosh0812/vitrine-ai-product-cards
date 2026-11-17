# 0007. Guest mode instead of a shared demo account

- Status: accepted (2026-11-17)

## Context
A shared demo login was considered so reviewers could see signed-in features. Shared credentials invite abuse (password or email changes through the Auth REST API, junk data) and need a scheduled reset job with a service account.

## Decision
No demo account. The complete Studio, templates, exports, Library and Brand Kit work in guest mode without signing in, storing data in the browser. Signing up (email with verification, or Google) unlocks sync, profile and tickets, and guest cards can be imported on first sign-in.

## Consequences
No shared credentials in the README, no reset job, and a smaller attack surface. Reviewers who want to see accounts create their own.
