import { createX402Client } from '@blockchain0x/x402/client';

const fetchWithPay = createX402Client({ sdk: client });
// Attaches the X-Payment header automatically when a 402 challenge arrives.
const res = await fetchWithPay('https://api.vendor.com/llm-query', {
  method: 'POST',
});
