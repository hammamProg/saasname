---
name: cold-email-beta-campaign
description: Send the SaaSNa.me beta-invite cold email to a CSV list of past-product users (e.g. FastLogoAI), chunked 100/batch via Resend. Use when asked to run/resume/extend this cold email campaign.
---

# SaaSNa.me Beta Invite Campaign

Sends a cold email inviting past FastLogoAI users to try SaaSNa.me's beta (free, limited-time access) to a large recipient list, in batches of 100 via Resend.

## Source & chunks

- Source list: `exports/auth_users.csv` (column: `email`)
- Deduped, one-per-line: `exports/cold_email_chunks/all_emails.txt`
- Split into 100-line chunks: `exports/cold_email_chunks/chunk_00` … `chunk_NN` (`split -l 100 -d -a 2`)
- Track sent chunks in `exports/cold_email_chunks/SENT.log` (append chunk filename + timestamp after each successful batch — create the file on first send).

To regenerate chunks from a fresh export:
```bash
tail -n +2 exports/auth_users.csv | cut -d',' -f2 | awk 'NF' | sort -u > exports/cold_email_chunks/all_emails.txt
split -l 100 -d -a 2 exports/cold_email_chunks/all_emails.txt exports/cold_email_chunks/chunk_
```

## Email template

- **From:** `noreply@mail.saasna.me`
- **Subject:** `quick beta invite`
- **Text body:**

```
Hey there,

You used FastLogoAI a while back, so I wanted to give you a heads-up before this goes public.

I've been building SaaSNa.me — it pulls all your sites and SaaS products into one dashboard so you can actually see what's working: traffic, visitors, growth, all in one place instead of juggling five different analytics tabs.

We're in beta, and since you were an early FastLogoAI user, I'm giving you free access for a limited time — no card, no catch.

Take a look: https://saasna.me

— Hammam

Don't want these emails? Reply STOP to opt out.
```

Do not add `{{first_name}}` personalization — the source CSV has no name field, only email. Keep the generic "Hey there," greeting.

## Sending mechanics

- Use `mcp__resend__send-batch-emails` — max 100 emails per call, which matches the chunk size exactly.
- Each recipient should be sent as an individual entry in the batch array (`to: [email]`), not all BCC'd together — keeps replies/opt-outs 1:1 and avoids exposing the full list to recipients.
- Include header `"List-Unsubscribe": "<mailto:noreply@mail.saasna.me?subject=unsubscribe>"` on every send for deliverability/compliance, in addition to the in-body "Reply STOP" line.
- Before sending: confirm the `resend` MCP is authorized (`list-domains` succeeds) and `mail.saasna.me` shows as verified.
- Send one chunk (100 recipients) per invocation. Pause between chunks — do not blast all 11 chunks in one uninterrupted loop; this protects sender reputation and gives room to catch bounces/complaints early.
- After each chunk send succeeds, append `<chunk_file> sent <timestamp>` to `exports/cold_email_chunks/SENT.log`.
- Never re-send a chunk already logged in `SENT.log`.

## Resuming

To find the next unsent chunk: diff the chunk file list against `SENT.log`. Send the lowest-numbered chunk not yet logged.

## Guardrails

- This is a bulk send to a purchased/legacy user list — a hard-to-reverse, externally-visible action. Confirm with the user before sending each new chunk unless they've explicitly authorized sending all remaining chunks unattended.
- If Resend reports elevated bounce/complaint rates, or the user says to stop, halt immediately and do not send further chunks.
