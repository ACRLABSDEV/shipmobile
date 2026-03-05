/**
 * login — core logic for authentication
 */

import { ok, err, type Result } from '../utils/result.js';
import { readCredentials, writeCredentials, type CredentialData } from '../utils/config.js';
import * as expo from '../providers/expo/index.js';
import * as apple from '../providers/apple/index.js';
import * as google from '../providers/google/index.js';

export interface LoginResult {
  authenticated: {
    apple: boolean;
    expo: boolean;
    google: boolean;
  };
  details: {
    expo?: { username: string; plan?: string };
    apple?: { teamName: string };
    google?: { projectId: string; clientEmail: string };
  };
  issues: string[];
}

export interface LoginExpoInput {
  token: string;
}

export interface LoginAppleInput {
  keyId: string;
  issuerId: string;
  keyPath: string;
}

export interface LoginGoogleInput {
  serviceAccountPath: string;
}

export async function loginExpo(
  input: LoginExpoInput,
  cwd?: string,
): Promise<Result<LoginResult>> {
  const result = await expo.validateToken(input.token);
  if (!result.ok) return result as unknown as Result<LoginResult>;

  const account = result.data;
  const credResult = await readCredentials(cwd);
  if (!credResult.ok) return credResult as unknown as Result<LoginResult>;

  const creds: CredentialData = { ...credResult.data };
  creds.expo = {
    token: input.token,
    username: account.username,
    plan: account.plan,
    validated: true,
    validatedAt: new Date().toISOString(),
  };

  const writeResult = await writeCredentials(creds, cwd);
  if (!writeResult.ok) return writeResult as unknown as Result<LoginResult>;

  return ok({
    authenticated: {
      apple: !!creds.apple?.validated,
      expo: true,
      google: !!creds.google?.validated,
    },
    details: {
      expo: { username: account.username, plan: account.plan },
    },
    issues: [],
  });
}

export async function loginApple(
  input: LoginAppleInput,
  cwd?: string,
): Promise<Result<LoginResult>> {
  const result = await apple.validateKey({
    keyId: input.keyId,
    issuerId: input.issuerId,
    keyPath: input.keyPath,
  });
  if (!result.ok) return result as unknown as Result<LoginResult>;

  const account = result.data;
  const credResult = await readCredentials(cwd);
  if (!credResult.ok) return credResult as unknown as Result<LoginResult>;

  const creds: CredentialData = { ...credResult.data };
  creds.apple = {
    apiKeyId: input.keyId,
    issuerId: input.issuerId,
    keyPath: input.keyPath,
    teamName: account.teamName,
    validated: true,
    validatedAt: new Date().toISOString(),
  };

  const writeResult = await writeCredentials(creds, cwd);
  if (!writeResult.ok) return writeResult as unknown as Result<LoginResult>;

  return ok({
    authenticated: {
      apple: true,
      expo: !!creds.expo?.validated,
      google: !!creds.google?.validated,
    },
    details: {
      apple: { teamName: account.teamName },
    },
    issues: [],
  });
}

export async function loginGoogle(
  input: LoginGoogleInput,
  cwd?: string,
): Promise<Result<LoginResult>> {
  const result = await google.validateServiceAccount(input.serviceAccountPath);
  if (!result.ok) return result as unknown as Result<LoginResult>;

  const account = result.data;
  const credResult = await readCredentials(cwd);
  if (!credResult.ok) return credResult as unknown as Result<LoginResult>;

  const creds: CredentialData = { ...credResult.data };
  creds.google = {
    serviceAccountPath: input.serviceAccountPath,
    projectId: account.projectId,
    validated: true,
    validatedAt: new Date().toISOString(),
  };

  const writeResult = await writeCredentials(creds, cwd);
  if (!writeResult.ok) return writeResult as unknown as Result<LoginResult>;

  return ok({
    authenticated: {
      apple: !!creds.apple?.validated,
      expo: !!creds.expo?.validated,
      google: true,
    },
    details: {
      google: { projectId: account.projectId, clientEmail: account.clientEmail },
    },
    issues: [],
  });
}

export async function getStatus(cwd?: string): Promise<Result<LoginResult>> {
  const credResult = await readCredentials(cwd);
  if (!credResult.ok) return credResult as unknown as Result<LoginResult>;

  const creds = credResult.data;
  const issues: string[] = [];

  if (!creds.expo?.validated) issues.push('Expo/EAS not connected');
  if (!creds.apple?.validated) issues.push('Apple Developer not connected');
  if (!creds.google?.validated) issues.push('Google Play not connected (optional)');

  return ok({
    authenticated: {
      apple: !!creds.apple?.validated,
      expo: !!creds.expo?.validated,
      google: !!creds.google?.validated,
    },
    details: {
      ...(creds.expo?.validated ? { expo: { username: creds.expo.username || 'unknown', plan: creds.expo.plan } } : {}),
      ...(creds.apple?.validated ? { apple: { teamName: creds.apple.teamName || 'unknown' } } : {}),
      ...(creds.google?.validated ? { google: { projectId: creds.google.projectId || 'unknown', clientEmail: 'configured' } } : {}),
    },
    issues,
  });
}

// Legacy execute for backward compat
export async function execute(): Promise<Result<LoginResult>> {
  return err('LOGIN_NO_INPUT', 'Login requires provider selection. Use shipmobile login --expo, --apple, or --google.', 'info', 'Run `shipmobile login` for the interactive wizard.');
}
