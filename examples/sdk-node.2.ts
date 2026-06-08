import { createClient } from '@blockchain0x/node';

const client = createClient({
  apiKey: process.env.BLOCKCHAIN0X_API_KEY!, // sk_test_... or sk_live_...
  // baseUrl?, network?, timeoutMs? are all optional
});
