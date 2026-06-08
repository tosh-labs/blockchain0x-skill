import { Blockchain0xError, ApiKeyError } from '@blockchain0x/node';

try {
  await client.payments.create({
    agentId: 'agt_01HQX5',
    to: '0xabc0000000000000000000000000000000000000',
    amountWei: '12500000',
  });
} catch (err) {
  if (err instanceof ApiKeyError) {
    if (err.code === 'apikey.scope_insufficient') {
      // Mint a key with pay_bills.
    }
  } else if (err instanceof Blockchain0xError) {
    console.error(err.code, err.requestId, err.status);
  } else {
    throw err; // network / SDK bug / unknown
  }
}
