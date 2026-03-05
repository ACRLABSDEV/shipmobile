/**
 * MCP Handlers — tool handler implementations
 */

import * as login from '../core/login.js';
import * as init from '../core/init.js';
import * as doctor from '../core/doctor.js';

function jsonResponse(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResponse(message: string) {
  return { content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }], isError: true as const };
}

export async function handleLogin(args: {
  provider: 'expo' | 'apple' | 'google';
  expo_token?: string;
  apple_key_id?: string;
  apple_issuer_id?: string;
  apple_key_path?: string;
  google_service_account?: string;
  project_path?: string;
  status?: boolean;
}) {
  if (args.status) {
    const result = await login.getStatus(args.project_path);
    if (!result.ok) return errorResponse(result.error.message);
    return jsonResponse(result.data);
  }

  switch (args.provider) {
    case 'expo': {
      if (!args.expo_token) return errorResponse('expo_token is required for Expo login');
      const result = await login.loginExpo({ token: args.expo_token }, args.project_path);
      if (!result.ok) return errorResponse(result.error.message);
      return jsonResponse(result.data);
    }
    case 'apple': {
      if (!args.apple_key_id || !args.apple_issuer_id || !args.apple_key_path) {
        return errorResponse('apple_key_id, apple_issuer_id, and apple_key_path are all required');
      }
      const result = await login.loginApple({
        keyId: args.apple_key_id,
        issuerId: args.apple_issuer_id,
        keyPath: args.apple_key_path,
      }, args.project_path);
      if (!result.ok) return errorResponse(result.error.message);
      return jsonResponse(result.data);
    }
    case 'google': {
      if (!args.google_service_account) return errorResponse('google_service_account path is required');
      const result = await login.loginGoogle({ serviceAccountPath: args.google_service_account }, args.project_path);
      if (!result.ok) return errorResponse(result.error.message);
      return jsonResponse(result.data);
    }
  }
}

export async function handleInit(args: {
  project_path?: string;
  bundle_id?: string;
  platforms?: ('ios' | 'android')[];
}) {
  const result = await init.execute({
    projectPath: args.project_path,
    bundleId: args.bundle_id,
    platforms: args.platforms,
  });
  if (!result.ok) return errorResponse(result.error.message);
  return jsonResponse(result.data);
}

export async function handleDoctor(args: {
  project_path?: string;
  fix?: boolean;
}) {
  const result = await doctor.execute({
    projectPath: args.project_path,
    fix: args.fix,
  });
  if (!result.ok) return errorResponse(result.error.message);
  return jsonResponse(result.data);
}
