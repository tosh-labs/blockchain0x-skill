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
