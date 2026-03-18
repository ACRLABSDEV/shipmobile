/**
 * Expo/EAS Provider — authentication and API interactions
 */

import { ok, err, type Result } from '../../utils/result.js';

export interface ExpoAccount {
  username: string;
  email?: string;
  plan?: string;
  validated: boolean;
}

/**
 * Validate an Expo token by calling the Expo API
 */
export async function validateToken(token: string): Promise<Result<ExpoAccount>> {
  try {
    const res = await fetch('https://api.expo.dev/v2/auth/userinfo', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        return err('EXPO_AUTH_INVALID', 'Invalid Expo token. Please check your token and try again.', 'critical', 'Get a new token at https://expo.dev/settings/access-tokens');
      }
      return err('EXPO_AUTH_ERROR', `Expo API returned ${res.status}: ${res.statusText}`);
    }

    const data = await res.json() as {
      username?: string;
      email?: string;
      accounts?: Array<{ plan?: string }>;
      data?: {
        username?: string;
        email?: string;
        accounts?: Array<{ plan?: string }>;
      };
    };

    // Expo responses vary by endpoint/version; support both root and nested `data`
    const payload = data.data ?? data;
    const username = payload.username || 'unknown';
    const plan = payload.accounts?.[0]?.plan || 'free';

    return ok({
      username,
      email: payload.email,
      plan,
      validated: true,
    });
  } catch (e) {
    return err('EXPO_NETWORK_ERROR', `Failed to connect to Expo API: ${e}`, 'critical', 'Check your internet connection and try again.');
  }
}

/**
 * Check if EAS CLI is available
 */
export async function checkEasCli(): Promise<boolean> {
  try {
    const { execSync } = await import('node:child_process');
    execSync('eas --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
