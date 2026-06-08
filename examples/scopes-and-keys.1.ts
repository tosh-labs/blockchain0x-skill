import { createClient } from '@blockchain0x/node';

const client = createClient({ apiKey: process.env.BLOCKCHAIN0X_API_KEY! });

const key = await client.apiKeys.create({
  label: 'Trading bot',
  agentId: 'agt_01HQXTRADING',
  scopes: ['read_wallet_metadata', 'pay_bills'],
});
console.log(key.secret); // shown ONCE - persist it in your secret store
