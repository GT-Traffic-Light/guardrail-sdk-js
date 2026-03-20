/**
 * @guardrail/sdk — Guardrail API client for Node.js and the browser.
 *
 * @example
 * ```ts
 * import { GuardrailClient } from '@guardrail/sdk';
 *
 * const client = new GuardrailClient('https://api.code.aitrafficlight.com', 'gr_live_xxx');
 * const scan = await client.scan('https://github.com/owner/repo', 'github', 'standard');
 * ```
 */

export { GuardrailClient, ApiError } from './client.js';
export type * from './types.js';
