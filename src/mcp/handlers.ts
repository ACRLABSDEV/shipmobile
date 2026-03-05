/**
 * MCP Handlers — tool handler implementations
 */

import * as login from '../core/login.js';
import * as init from '../core/init.js';
import * as doctor from '../core/doctor.js';
import * as audit from '../core/audit/index.js';
import * as assets from '../core/assets.js';
import * as prepare from '../core/prepare.js';
import * as build from '../core/build.js';
import * as status from '../core/status.js';
import * as preview from '../core/preview.js';

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

export async function handleAudit(args: {
  project_path?: string;
  category?: string;
  fix?: boolean;
  diff?: boolean;
}) {
  const result = await audit.execute({
    projectPath: args.project_path,
    category: args.category,
    fix: args.fix,
    diff: args.diff,
  });
  if (!result.ok) return errorResponse(result.error.message);
  return jsonResponse(result.data);
}

export async function handleAssets(args: {
  project_path?: string;
  icon_path?: string;
  splash_path?: string;
  screenshots_dir?: string;
  foreground_path?: string;
  background_path?: string;
}) {
  const result = await assets.execute({
    projectPath: args.project_path,
    iconPath: args.icon_path,
    splashPath: args.splash_path,
    screenshotsDir: args.screenshots_dir,
    foregroundPath: args.foreground_path,
    backgroundPath: args.background_path,
  });
  if (!result.ok) return errorResponse(result.error.message);
  return jsonResponse(result.data);
}

export async function handlePrepare(args: {
  project_path?: string;
  app_name?: string;
  description?: string;
  keywords?: string[];
  category?: string;
}) {
  const result = await prepare.execute({
    projectPath: args.project_path,
    appName: args.app_name,
    description: args.description,
    keywords: args.keywords,
    category: args.category,
  });
  if (!result.ok) return errorResponse(result.error.message);
  return jsonResponse(result.data);
}

export async function handleBuild(args: {
  project_path?: string;
  platforms?: ('ios' | 'android')[];
  profile?: 'development' | 'preview' | 'production';
  wait?: boolean;
}) {
  const result = await build.execute({
    projectPath: args.project_path,
    platforms: args.platforms,
    profile: args.profile,
    wait: args.wait,
  });
  if (!result.ok) return errorResponse(result.error.message);
  return jsonResponse(result.data);
}

export async function handleStatus(args: {
  build_id?: string;
  project_path?: string;
  logs?: boolean;
  history?: boolean;
  platform?: 'ios' | 'android';
}) {
  const result = await status.execute({
    projectPath: args.project_path,
    buildId: args.build_id,
    logs: args.logs,
    history: args.history,
    platform: args.platform,
  });
  if (!result.ok) return errorResponse(result.error.message);
  return jsonResponse(result.data);
}

export async function handlePreview(args: {
  build_id?: string;
  project_path?: string;
  platform?: 'ios' | 'android';
}) {
  const result = await preview.execute({
    projectPath: args.project_path,
    buildId: args.build_id,
    platform: args.platform,
  });
  if (!result.ok) return errorResponse(result.error.message);
  return jsonResponse(result.data);
}
