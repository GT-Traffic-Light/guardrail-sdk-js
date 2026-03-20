/**
 * @guardrail/sdk — shared request/response types
 */

// ── Auth ────────────────────────────────────────────────────────────────────

export interface TokenPair {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

export interface MagicLinkResponse {
  success: boolean;
  message: string;
  userFound?: boolean;
  requestId?: string;
}

export interface LoginUrlResponse {
  loginUrl: string;
}

// ── User / Account ───────────────────────────────────────────────────────────

export interface UserInfo {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  tier: string;
  tierName: string;
  apiKey?: string;
  scansRemaining?: number;
  createdAt?: string;
}

export interface OnboardResponse {
  success: boolean;
  apiKey?: string;
  stripeCustomerId: string;
  tier: string;
  scansRemaining: number;
  trialEndsAt?: string;
  message: string;
  nextSteps?: string[];
  existing?: boolean;
}

export interface UsageStats {
  scansUsed: number;
  scansRemaining: number;
  scansLimit: number;
  periodStart: string;
  periodEnd: string;
}

// ── Billing ──────────────────────────────────────────────────────────────────

export interface SubscriptionInfo {
  status: string;
  tier: string;
  tierName: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  seats?: number | null;
  subscriptions?: Array<{
    id: string;
    tier: string;
    tierName: string;
    status: string;
    periodEnd: string;
    seats: number | null;
  }>;
}

export interface GuestCheckoutSuccess {
  clientSecret: string;
  subscriptionId: string;
  intentType: 'setup' | 'payment';
  checkoutToken: string;
}

export interface GuestCheckoutConflict {
  error: string;
  code: string;
  message: string;
  loginUrl: string;
}

export type GuestCheckoutResponse = GuestCheckoutSuccess | GuestCheckoutConflict;

export interface GuestCheckoutPayload {
  tier?: string;
  priceId?: string;
  interval?: 'month' | 'year';
  email: string;
  name?: string;
  orgName?: string;
}

export interface GuestProvisionResponse {
  provisioned: boolean;
  email?: string;
}

export interface CouponDiscount {
  type: 'percent' | 'amount' | 'unknown';
  value?: number;
  currency?: string;
  label: string;
}

export interface ApplyCouponResponse {
  applied: boolean;
  discount: CouponDiscount;
  name: string;
}

export interface PricingTier {
  tier: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice?: number;
  features?: string[];
  ctaUrl?: string;
}

export interface PricingResponse {
  tiers: PricingTier[];
}

// ── API Keys ─────────────────────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
}

export interface ApiKeyWithSecret extends ApiKey {
  key: string;
  message: string;
}

export interface ListKeysResponse {
  keys: ApiKey[];
  limit: number;
  canCreateMore: boolean;
}

// ── Scans ────────────────────────────────────────────────────────────────────

export type ScanStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface ScanReference {
  scanId: string;
  status: ScanStatus;
}

export interface ScanResult extends ScanReference {
  target: string;
  type: string;
  createdAt: string;
  estimatedDuration?: number;
  resultUrl?: string;
  findings?: unknown[];
}

export type ScanDepth = 'quick' | 'standard' | 'deep';

export interface ScanOptions {
  includeAiBom?: boolean;
  includeDependencies?: boolean;
  includeLicenseAnalysis?: boolean;
  includeVendorGuard?: boolean;
  includeThreatModel?: boolean;
  includeCompliance?: boolean;
}

// ── Organizations ─────────────────────────────────────────────────────────────

export interface OrgMember {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface Organization {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  enabled?: boolean;
}

export interface OrgDetail extends Organization {
  seatsTotal: number;
  seatsUsed: number;
  seatsAvailable: number;
  members: OrgMember[];
}

export interface OrgSubscription {
  tier: string;
  tierName: string;
  teamSeats: number;
  seatsUsed: number;
  seatsAvailable: number;
  scansRemaining: number;
  subscriptionStatus: string;
  periodEnd: string;
}

// ── Device Flow ───────────────────────────────────────────────────────────────

export interface DeviceAuthResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface DeviceTokenResponse {
  access_token?: string;
  refresh_token?: string;
  error?: 'authorization_pending' | 'slow_down' | 'access_denied' | 'expired_token';
}

// ── Health ────────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  routeVersion: string;
  timestamp: string;
  checks?: Record<string, string>;
}
