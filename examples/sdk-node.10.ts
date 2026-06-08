import { webhooks } from '@blockchain0x/node';

const result = webhooks.verify({
  headers: req.headers,
  rawBody: req.body, // Buffer or string, the exact bytes on the wire
  secret: process.env.BLOCKCHAIN0X_WEBHOOK_SECRET!,
});
if (!result.ok) {
  return res.status(400).json({ code: result.code });
}
// result.eventType / result.eventId / result.deliveryId
