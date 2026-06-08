# Webhook verification

Source of truth: `packages/sdk-node/src/webhooks/` and the Python sibling;
byte-aligned with the worker's signer (sub-plan 21.3 C-6). `webhooks.verify` is
the single most important utility the SDKs ship: it is the same code path that
signs, so a verified delivery is provably from Blockchain0x.

## Construction

The signature is `HMAC-SHA256(secret, ` + "`${t}.${rawBody}`" + `)` rendered as
hex, where `t` is the unix-second timestamp and `rawBody` is the exact bytes that
arrived on the wire (NOT re-serialized JSON). Verification:

1. Read `X-Blockchain0x-Signature`. It is either structured
   (`t=<ts>,v1=<hex>`) or a bare hex digest (some load balancers strip the
   structured form).
2. When the signature is bare hex, read the timestamp from
   `X-Blockchain0x-Timestamp`.
3. Recompute the HMAC and compare in constant time (`timingSafeEqual` /
   `hmac.compare_digest`).
4. Reject when the timestamp drifts more than 5 minutes (300s) from the
   verifier's clock. Override with `toleranceSec` if your clock skews.

## Verify (Node)

Capture the raw body, not the parsed JSON - the HMAC is over the exact bytes.

```ts
import { webhooks } from '@blockchain0x/node';

// Capture the RAW request bytes, not parsed JSON - the HMAC is over the exact
// bytes on the wire. In Express use `express.raw({ type: 'application/json' })`;
// in Fastify add a raw-body content-type parser.
export function handleWebhook(
  headers: Record<string, string | string[] | undefined>,
  rawBody: Buffer
) {
  const result = webhooks.verify({
    headers,
    rawBody,
    secret: process.env.BLOCKCHAIN0X_WEBHOOK_SECRET ?? '',
  });
  if (!result.ok) {
    return { status: 400 as const, code: result.code };
  }
  const payload = JSON.parse(rawBody.toString('utf8'));
  // result.eventType / result.eventId / result.deliveryId are populated.
  return { status: 200 as const, eventType: result.eventType, payload };
}
```

## Verify (Python)

```python
from blockchain0x import webhooks


def receive_webhook(req, raw_body, secret):
    result = webhooks.verify(headers=req.headers, raw_body=raw_body, secret=secret)
    if not result.ok:
        return {"code": result.code}, 400
    # result.event_type / result.event_id / result.delivery_id
    return process_event(raw_body, result.event_type)
```

Pass `raise_on_fail=True` to raise `WebhookSignatureError` instead of returning a
falsy result.

## Failure-mode codes

On failure `result.code` (Node) / `result.code` (Python) is one of seven dotted
codes (see also [errors.md](errors.md)):

| Code                               | Meaning                                     |
| ---------------------------------- | ------------------------------------------- |
| `webhook.secret_missing`           | No signing secret supplied to the verifier. |
| `webhook.signature_missing`        | No signature header on the delivery.        |
| `webhook.signature_malformed`      | Signature header present but unparseable.   |
| `webhook.timestamp_missing`        | No timestamp on a bare-hex signature.       |
| `webhook.timestamp_invalid`        | Timestamp not a number.                     |
| `webhook.timestamp_outside_window` | Drift exceeds the 5-minute replay window.   |
| `webhook.signature_mismatch`       | HMAC did not match (constant-time compare). |

## Register + rotate secrets

Creating and rotating webhook endpoints is a dashboard / workspace-context
action (API-key auth read-only; CRUD is hard-blocked, see
[scopes-and-keys.md](scopes-and-keys.md)). When you do have a context that can
create one, the secret is shown ONCE:

```ts
const wh = await client.webhooks.create({
  url: 'https://api.your-app.com/webhook',
  events: ['payment.received', 'wallet.deployed'],
});
console.log(wh.signingSecret); // store once
const rotated = await client.webhooks.rotateSecret(wh.id);
```
