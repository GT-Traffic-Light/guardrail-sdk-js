/**
 * GuardrailClient — zero-dependency HTTP client for the Guardrail API.
 *
 * @param baseUrl - Base URL of the Guardrail API (e.g. https://api.code.aitrafficlight.com)
 * @param token   - Optional initial Bearer token (JWT or gr_live_… API key).
 *                  Can be overridden per-call.
 */

import type {
  TokenPair,
  MagicLinkResponse,
  LoginUrlResponse,
  UserInfo,
  OnboardResponse,
  UsageStats,
  SubscriptionInfo,
  GuestCheckoutPayload,
  GuestCheckoutResponse,
  GuestProvisionResponse,
  ApplyCouponResponse,
  PricingResponse,
  ListKeysResponse,
  ApiKeyWithSecret,
  ScanResult,
  ScanStatus,
  ScanDepth,
  ScanOptions,
  OrgDetail,
  OrgSubscription,
  Organization,
  DeviceAuthResponse,
  DeviceTokenResponse,
  HealthResponse,
} from './types.js';

/** A successful API call always resolves; errors surface as `ApiError`. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export class GuardrailClient {
  readonly baseUrl: string;
  private token: string | undefined;

  constructor(baseUrl: string, token?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  /** Update the bearer token used for subsequent authenticated requests. */
  setToken(token: string | undefined): void {
    this.token = token;
  }

  // ---------------------------------------------------------------------------
  // Internal request helper
  // ---------------------------------------------------------------------------

  private async request<T>(
    method: HttpMethod,
    path: string,
    options: {
      token?: string;
      body?: unknown;
      headers?: Record<string, string>;
    } = {}
  ): Promise<T> {
    const token = options.token ?? this.token;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (options.headers) Object.assign(headers, options.headers);

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = json as { error?: string; code?: string; message?: string; requestId?: string };
      throw new ApiError(
        res.status,
        err.code ?? err.error ?? 'UNKNOWN',
        err.message ?? res.statusText,
        err.requestId
      );
    }

    return json as T;
  }

  // ===========================================================================
  // Health
  // ===========================================================================

  /** GET /v2/health — system health check */
  health(): Promise<HealthResponse> {
    return this.request('GET', '/v2/health');
  }

  // ===========================================================================
  // Auth
  // ===========================================================================

  /**
   * POST /v2/onboard — register a new user account.
   * Returns an API key on success.
   */
  onboard(name: string, email: string, company?: string): Promise<OnboardResponse> {
    return this.request('POST', '/v2/onboard', { body: { name, email, company } });
  }

  /** POST /v2/auth/magic-link — request a sign-in email for an existing account. */
  requestMagicLink(email: string): Promise<MagicLinkResponse> {
    return this.request('POST', '/v2/auth/magic-link', { body: { email } });
  }

  /** GET /v2/auth/magic-link/:token — redeem a magic-link token and receive JWTs. */
  redeemMagicLink(token: string): Promise<TokenPair> {
    return this.request('GET', `/v2/auth/magic-link/${encodeURIComponent(token)}`);
  }

  /** GET /v2/auth/login-url — get the Keycloak PKCE login URL. */
  getLoginUrl(): Promise<LoginUrlResponse> {
    return this.request('GET', '/v2/auth/login-url');
  }

  /**
   * POST /v2/auth/exchange-code — exchange a Keycloak authorization code for JWTs.
   * @param code         - the ?code= query parameter from the KC redirect
   * @param redirectUri  - must match the registered redirect URI
   * @param codeVerifier - PKCE code verifier (if generated at login time)
   */
  exchangeAuthCode(code: string, redirectUri: string, codeVerifier?: string): Promise<TokenPair> {
    return this.request('POST', '/v2/auth/exchange-code', {
      body: {
        code,
        redirect_uri: redirectUri,
        ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
      },
    });
  }

  /** POST /v2/auth/refresh — exchange a refresh token for a new access token. */
  refreshToken(refreshToken: string): Promise<TokenPair> {
    return this.request('POST', '/v2/auth/refresh', { body: { refresh_token: refreshToken } });
  }

  // ===========================================================================
  // Device Flow (CLI / MCP login)
  // ===========================================================================

  /** POST /v2/device/authorize — start a device authorization flow. */
  deviceAuthorize(scope = 'openid email profile'): Promise<DeviceAuthResponse> {
    return this.request('POST', '/v2/device/authorize', { body: { scope } });
  }

  /** POST /v2/device/token — poll for device flow completion. */
  deviceToken(deviceCode: string): Promise<DeviceTokenResponse> {
    return this.request('POST', '/v2/device/token', { body: { device_code: deviceCode } });
  }

  // ===========================================================================
  // User / Account
  // ===========================================================================

  /** GET /v2/me — current user info. */
  me(token?: string): Promise<UserInfo> {
    return this.request('GET', '/v2/me', { token });
  }

  /** PATCH /v2/me — update display name / profile fields. */
  updateProfile(
    body: { firstName?: string; lastName?: string },
    token?: string
  ): Promise<{ success: boolean; message: string }> {
    return this.request('PATCH', '/v2/me', { token, body });
  }

  /** PATCH /v2/me/github-token — store a Personal Access Token for GitHub scans. */
  saveGitHubToken(githubToken: string | null, token?: string): Promise<{ success: boolean }> {
    return this.request('PATCH', '/v2/me/github-token', { token, body: { githubToken } });
  }

  /** GET /v2/github/connect — get the GitHub OAuth authorization URL. */
  getGitHubConnectUrl(token?: string): Promise<{ authUrl: string }> {
    return this.request('GET', '/v2/github/connect', { token });
  }

  /** GET /v2/github/token — fetch the saved GitHub token after OAuth callback. */
  fetchGitHubToken(token?: string): Promise<{ githubToken: string | null }> {
    return this.request('GET', '/v2/github/token', { token });
  }

  /** GET /v2/usage — scan usage for the current billing period. */
  usage(token?: string): Promise<UsageStats> {
    return this.request('GET', '/v2/usage', { token });
  }

  // ===========================================================================
  // Pricing
  // ===========================================================================

  /** GET /v2/pricing — tier pricing and metadata (public). */
  getPricing(): Promise<PricingResponse> {
    return this.request('GET', '/v2/pricing');
  }

  // ===========================================================================
  // Billing
  // ===========================================================================

  /**
   * POST /v2/billing/checkout — create an embedded Stripe checkout session for
   * an already-authenticated user. Handles both initial subscriptions and upgrades.
   */
  createCheckout(
    payload: { tier: string; interval: 'month' | 'year'; embedded?: boolean },
    token?: string
  ): Promise<
    | { clientSecret: string; subscriptionId: string; intentType: 'setup' | 'payment' }
    | { portalUrl: string; error: string; code: string; message: string }
  > {
    return this.request('POST', '/v2/billing/checkout', {
      token,
      body: { ...payload, embedded: payload.embedded ?? true },
    });
  }

  /** GET /v2/billing/subscription — live subscription state. */
  getSubscription(token?: string): Promise<SubscriptionInfo> {
    return this.request('GET', '/v2/billing/subscription', { token });
  }

  /**
   * POST /v2/billing/subscription/active — switch active subscription when the
   * user holds multiple plans simultaneously.
   */
  switchActiveSubscription(
    subscriptionId: string,
    token?: string
  ): Promise<{
    success: boolean;
    subscriptionId: string;
    tier: string;
    tierName: string;
    message: string;
  }> {
    return this.request('POST', '/v2/billing/subscription/active', {
      token,
      body: { subscriptionId },
    });
  }

  /** GET /v2/billing/portal — Stripe customer portal URL. */
  getBillingPortal(returnUrl?: string, token?: string): Promise<{ url: string }> {
    const qs = returnUrl ? `?return_url=${encodeURIComponent(returnUrl)}` : '';
    return this.request('GET', `/v2/billing/portal${qs}`, { token });
  }

  /** POST /v2/billing/downgrade — get Stripe portal URL for mid-cycle plan changes. */
  getDowngradePortal(returnUrl?: string, token?: string): Promise<{ portalUrl: string }> {
    const qs = returnUrl ? `?return_url=${encodeURIComponent(returnUrl)}` : '';
    return this.request('POST', `/v2/billing/downgrade${qs}`, { token, body: {} });
  }

  /** POST /v2/billing/cancel — cancel subscription at period end. */
  cancelSubscription(
    token?: string
  ): Promise<{ success: boolean; message: string; cancelAt: string }> {
    return this.request('POST', '/v2/billing/cancel', { token, body: {} });
  }

  /**
   * POST /v2/billing/cancel/immediate — immediately cancel (test/sandbox only).
   * Only available when the API uses a Stripe test key (sk_test_*).
   */
  cancelSubscriptionImmediately(
    token?: string
  ): Promise<{ success: boolean; message: string; subscriptionId: string }> {
    return this.request('POST', '/v2/billing/cancel/immediate', { token, body: {} });
  }

  /** POST /v2/billing/sync — reconcile Stripe subscription state. */
  syncSubscription(
    token?: string
  ): Promise<{ synced: boolean; subscriptions?: number; message: string }> {
    return this.request('POST', '/v2/billing/sync', { token, body: {} });
  }

  // ---------------------------------------------------------------------------
  // Guest Billing (public — no auth required)
  // ---------------------------------------------------------------------------

  /**
   * POST /v2/billing/guest-checkout — start a Stripe Elements checkout session.
   *
   * Returns `clientSecret`, `subscriptionId`, `intentType`, and a signed
   * `checkoutToken` that must be forwarded to `applyCoupon` if the guest wants
   * to apply a promotion code before completing payment.
   */
  guestCheckout(payload: GuestCheckoutPayload): Promise<GuestCheckoutResponse> {
    return this.request('POST', '/v2/billing/guest-checkout', { body: payload });
  }

  /**
   * POST /v2/billing/guest-provision — provision a Guardrail account after payment.
   *
   * Call this after the Stripe Elements payment succeeds to link the subscription
   * to a new (or existing) user account and deliver a magic-link sign-in email.
   */
  guestProvision(
    id: string,
    idType: 'subscriptionId' | 'sessionId' = 'subscriptionId',
    orgName?: string
  ): Promise<GuestProvisionResponse> {
    return this.request('POST', '/v2/billing/guest-provision', {
      body: { [idType]: id, ...(orgName ? { orgName } : {}) },
    });
  }

  /**
   * POST /v2/billing/apply-coupon — validate and apply a Stripe promotion code.
   *
   * Requires a `checkoutToken` issued by `guestCheckout`. The token is
   * HMAC-signed and bound to the subscriptionId — it cannot be used against
   * other subscriptions and expires after 6 hours.
   *
   * @param subscriptionId - Stripe subscription ID (sub_…) from `guestCheckout`
   * @param promotionCode  - Human-readable promo code string (e.g. "SUMMER40")
   * @param checkoutToken  - Signed token from the `guestCheckout` response
   */
  applyCoupon(
    subscriptionId: string,
    promotionCode: string,
    checkoutToken: string
  ): Promise<ApplyCouponResponse> {
    return this.request('POST', '/v2/billing/apply-coupon', {
      body: { subscriptionId, promotionCode, checkoutToken },
    });
  }

  // ===========================================================================
  // API Keys
  // ===========================================================================

  /** GET /v2/keys — list API keys (masked prefixes only). */
  listKeys(token?: string): Promise<ListKeysResponse> {
    return this.request('GET', '/v2/keys', { token });
  }

  /** POST /v2/keys — generate a new API key (full key is shown once). */
  createKey(
    body: { name?: string; expiresInDays?: number } = {},
    token?: string
  ): Promise<ApiKeyWithSecret> {
    return this.request('POST', '/v2/keys', { token, body });
  }

  /** POST /v2/keys/:id/rotate — generate a replacement key and revoke the old one. */
  rotateKey(keyId: string, token?: string): Promise<ApiKeyWithSecret> {
    return this.request('POST', `/v2/keys/${keyId}/rotate`, { token, body: {} });
  }

  /** DELETE /v2/keys/:id — permanently revoke an API key. */
  revokeKey(
    keyId: string,
    token?: string
  ): Promise<{ success: boolean; message: string; keyId: string }> {
    return this.request('DELETE', `/v2/keys/${keyId}`, { token });
  }

  // ===========================================================================
  // Scans
  // ===========================================================================

  /** POST /v2/scan — initiate a new scan. */
  scan(
    target: string,
    type: string,
    depth: ScanDepth,
    options?: ScanOptions,
    extraHeaders?: Record<string, string>,
    token?: string
  ): Promise<ScanResult> {
    return this.request('POST', '/v2/scan', {
      token,
      body: { target, type, depth, options },
      headers: extraHeaders,
    });
  }

  /** GET /v2/scans/:id — fetch scan status / result. */
  getScan(scanId: string, token?: string): Promise<ScanResult & { status: ScanStatus }> {
    return this.request('GET', `/v2/scans/${scanId}`, { token });
  }

  /** GET /v2/scans/history — paginated scan history. */
  getScanHistory(limit = 20, token?: string): Promise<{ scans: ScanResult[] }> {
    return this.request('GET', `/v2/scans/history?limit=${limit}`, { token });
  }

  // ===========================================================================
  // Organizations
  // ===========================================================================

  /** GET /v2/organizations — list orgs the caller belongs to. */
  listOrganizations(
    token?: string
  ): Promise<{ success: boolean; ownedOrgId: string | null; organizations: Organization[] }> {
    return this.request('GET', '/v2/organizations', { token });
  }

  /** GET /v2/organizations/:id — org details, members, and seat quota. */
  getOrganization(
    orgId: string,
    token?: string
  ): Promise<{ success: boolean; organization: OrgDetail }> {
    return this.request('GET', `/v2/organizations/${orgId}`, { token });
  }

  /** POST /v2/organizations — create a new organization. */
  createOrganization(
    body: { name: string; displayName?: string; description?: string },
    token?: string
  ): Promise<{ success: boolean; id: string; name: string; message: string }> {
    return this.request('POST', '/v2/organizations', { token, body });
  }

  /** POST /v2/organizations/:id/members — add an existing user by email or userId. */
  addOrgMember(
    orgId: string,
    body: { email?: string; userId?: string },
    token?: string
  ): Promise<{ success: boolean; message: string }> {
    return this.request('POST', `/v2/organizations/${orgId}/members`, { token, body });
  }

  /** DELETE /v2/organizations/:id/members/:userId — remove a member. */
  removeOrgMember(
    orgId: string,
    userId: string,
    token?: string
  ): Promise<{ success: boolean; message: string }> {
    return this.request('DELETE', `/v2/organizations/${orgId}/members/${userId}`, { token });
  }

  /** GET /v2/organizations/:id/subscription — org subscription details. */
  getOrgSubscription(
    orgId: string,
    token?: string
  ): Promise<{ success: boolean; subscription: OrgSubscription | null }> {
    return this.request('GET', `/v2/organizations/${orgId}/subscription`, { token });
  }

  /** POST /v2/organizations/:id/subscription — link caller's subscription to an org. */
  linkOrgSubscription(
    orgId: string,
    token?: string
  ): Promise<{
    success: boolean;
    message: string;
    orgId: string;
    tier: string;
    teamSeats: number;
  }> {
    return this.request('POST', `/v2/organizations/${orgId}/subscription`, { token, body: {} });
  }

  /** POST /v2/organizations/:id/invite — invite a user by email (creates KC account if new). */
  inviteOrgMember(
    orgId: string,
    body: { email: string; firstName?: string; lastName?: string; redirectUri?: string },
    token?: string
  ): Promise<{ success: boolean; message: string; isNewUser: boolean }> {
    return this.request('POST', `/v2/organizations/${orgId}/invite`, { token, body });
  }

  /** DELETE /v2/organizations/:id — delete an organization. */
  deleteOrganization(
    orgId: string,
    token?: string
  ): Promise<{ success: boolean; message: string }> {
    return this.request('DELETE', `/v2/organizations/${orgId}`, { token });
  }
}
