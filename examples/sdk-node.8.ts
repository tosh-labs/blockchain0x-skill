await client.apiKeys.list({ limit: 25 });
await client.apiKeys.rotate('ak_01HQ');
await client.apiKeys.revoke('ak_01HQ');
