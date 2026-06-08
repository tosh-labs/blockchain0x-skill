const wh = await client.webhooks.create({
  url: 'https://api.your-app.com/webhook',
  events: ['payment.received', 'wallet.deployed'],
});
console.log(wh.signingSecret); // store once
await client.webhooks.rotateSecret(wh.id);
