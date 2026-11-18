# Giver email and private tracking

Givers create and share a gift immediately without entering contact details. Creation issues a separate random, HttpOnly, SameSite=Lax browser cookie for 30 days. Its hash identifies the browser's private gifts; the recipient URL never grants giver access. Clearing cookies or switching devices loses this browser access unless an email has been verified. Production cookies are Secure; local memory still resets on restart.

After creation the share screen offers “Get notified when they choose · optional.” Email verification uses a single-use, 15-minute link and does not block sharing or tracking. Only the creating browser can request a link that attaches an email to that gift. The claim is stored server-side with the email token, so the verification link may be opened on another device. A recipient URL or another browser cannot claim the gift. A gift's existing verified email cannot be replaced by a different one through this flow.

The confirmation button consumes the email link via POST so link scanners do not consume it by visiting. Verification creates a separate random, HttpOnly cookie session for 30 days and enables notifications and recovery. If the recipient already confirmed, verification queues the missed notification. Requests and delivery failures leave the saved gift and browser access intact. Gifts created while already signed in retain that verified email automatically.

`/gifts` lists gifts owned by this browser and/or verified email. Recipients still need no account. New gift links use 24 random characters. Giver pages, full gift responses, checkout, and reopening require ownership. Recipient serialization excludes both email and browser ownership fields. Signing out revokes both email and browser sessions on that device.

Existing gifts created before this change have no verified owner and cannot be claimed from their recipient links. Create new gifts for the demo. Local memory still resets on restart. Production requires Upstash Redis; gift records expire 30 days after their most recent save.

## Local preview

Set `APP_URL=http://localhost:3000` and `EMAIL_MODE=preview` in `.env.local`. Restart the dev server if necessary. Request a verification email and open `/dev/mail` on localhost. This is a development-only inbox; no messages are sent. Do not expose the development server publicly. The preview is disabled in production even if EMAIL_MODE is set.

## Real delivery

Configure these deployment secrets:

- `APP_URL`: the canonical HTTPS site origin.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: durable gift, session, and email-job storage.
- `RESEND_API_KEY`: a Resend sending key.
- `EMAIL_FROM`: a sender on your verified domain, for example `Twofold <gifts@your-domain.com>`.
- `CRON_SECRET`: a long random secret for the notification retry endpoint.

Unset EMAIL_MODE for real delivery. The Resend API uses https://resend.com/docs/api-reference/emails/send-email and its documented Idempotency-Key header. Provider acceptance is not proof of inbox delivery; use provider delivery/bounce logs when validating a launch.

Schedule `GET /api/jobs/notifications` every 5–10 minutes with `Authorization: Bearer <CRON_SECRET>` using your hosting scheduler. The endpoint processes up to 20 pending jobs per invocation. The schedule is not deployed by this change. Confirmations are saved first; failures sending email do not undo the recipient's choice. Repeated confirmation requests reuse the same notification key. Failed deliveries stay pending; automatic retries stop after 23 hours to stay within the provider's 24-hour deduplication window. Operators must inspect and reconcile jobs older than that before resending. Failures enqueueing a job are logged and can be retried through the idempotent confirmation endpoint.

Notification email contains a private tracking URL, no address or price. Opening that URL on a new device requires email verification. Givers can request a new login email at `/giver` to recover access to all retained gifts. SMS notifications are deferred; Text in the share card still opens a manually sent message.

The prototype saves the address and makes it available to the authorized giver for merchant checkout. Recipient copy states this accurately instead of claiming that only the shop receives it.
