import { createClient } from '@blockchain0x/node';

const client = createClient({ apiKey: process.env.BLOCKCHAIN0X_API_KEY! });

const agent = await client.agents.get('agt_01HQX5...');
const usage = await client.apiKeys.usage({ windowDays: 1 });
