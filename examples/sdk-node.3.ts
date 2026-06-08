const agent = await client.agents.get('agt_01HQX5'); // AgentSummary
const page = await client.agents.list({ limit: 25 }); // cursor + limit
const usage = await client.apiKeys.usage({ windowDays: 1 });
