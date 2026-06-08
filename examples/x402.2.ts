import { createClient } from '@blockchain0x/node';
import { createX402Client } from '@blockchain0x/x402/client';

const client = createClient({ apiKey: process.env.BLOCKCHAIN0X_API_KEY! });
const fetchWithPay = createX402Client({ sdk: client });

const res = await fetchWithPay('https://api.vendor.com/llm-query', {
  method: 'POST',
});
