# @guardrail/sdk

Official TypeScript/JavaScript SDK for the [Guardrail API](https://api.code.aitrafficlight.com).

Works in Node.js 18+ and modern browsers (uses the native `fetch` API).

## Install

```bash
npm install @guardrail/sdk
# or
yarn add @guardrail/sdk
```

## Quick Start

```ts
import { GuardrailClient } from '@guardrail/sdk';

const client = new GuardrailClient(
  'https://api.code.aitrafficlight.com',
  'gr_live_xxxxxxxxx' // optional: set per-call instead
);

// Initiate a scan
const scan = await client.scan('https://github.com/owner/repo', 'github', 'standard');
console.log(scan.scanId, scan.status);

// Guest checkout (no auth required)
const checkout = await client.guestCheckout({
  tier: 'pro',
  interval: 'month',
  email: 'user@example.com',
  name: 'Jane Smith',
});

if ('clientSecret' in checkout) {
  // Mount Stripe Elements with checkout.clientSecret …

  // Apply a promo code using the signed checkout token
  const result = await client.applyCoupon(
    checkout.subscriptionId,
    'SUMMER40',
    checkout.checkoutToken // required — issued by guestCheckout
  );
  console.log(result.discount.label); // e.g. "40% off"
}
```

## Authentication

The client accepts Bearer tokens (JWT or API key):

```ts
// Constructor default
const client = new GuardrailClient(BASE_URL, 'gr_live_…');

// Or update at runtime
client.setToken(newToken);

// Or pass per-call
const me = await client.me('gr_live_…');
```

## Device Flow (CLI login)

```ts
const { device_code, user_code, verification_uri } = await client.deviceAuthorize();
console.log(`Visit ${verification_uri} and enter code: ${user_code}`);

// Poll until approved
let tokens;
while (!tokens) {
  await new Promise((r) => setTimeout(r, 5000));
  const poll = await client.deviceToken(device_code);
  if (poll.access_token) tokens = poll;
  if (poll.error === 'access_denied') throw new Error('Login denied');
}
client.setToken(tokens.access_token);
```

## Error Handling

All HTTP errors are thrown as `ApiError`:

```ts
import { GuardrailClient, ApiError } from '@guardrail/sdk';

try {
  await client.getSubscription();
} catch (err) {
  if (err instanceof ApiError) {
    console.error(err.status, err.code, err.message);
  }
}
```

## Build

```bash
yarn build   # outputs ESM + CJS to dist/
```
