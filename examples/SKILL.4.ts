import { webhooks } from '@blockchain0x/node';

const result = webhooks.verify({
  headers: req.headers,
  rawBody: req.body, // raw bytes, NOT parsed JSON
  secret: process.env.BLOCKCHAIN0X_WEBHOOK_SECRET!,
});
if (!result.ok) {
  // result.code is one of the dotted webhook.* failure codes
  return res.status(400).json({ code: result.code });
}
// result.eventType / result.eventId / result.deliveryId are populated.
