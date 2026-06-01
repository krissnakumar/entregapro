import Constants from 'expo-constants';

/**
 * Environment Configuration System
 * Supports multiple environments: development, staging, production
 */

export type Environment = 'development' | 'staging' | 'production';

interface EnvironmentConfig {
  API_URL: string;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  ENABLE_ANALYTICS: boolean;
  ENABLE_SENTRY: boolean;
  SENTRY_DSN?: string;
  TOKEN_EXPIRY_MS: number;
  OFFLINE_QUEUE_RETRY_DELAY_MS: number;
  MAX_RETRY_ATTEMPTS: number;
}

// Determine current environment
const getEnvironment = (): Environment => {
  const expoEnv = Constants.expoConfig?.extra?.environment;
  if (expoEnv) return expoEnv;
  
  // Default to production in built apps, development in dev
  return __DEV__ ? 'development' : 'production';
};

// Environment configurations
const CONFIGS: Record<Environment, EnvironmentConfig> = {
  development: {
    API_URL: __DEV__ ? getDevApiUrl() : 'http://localhost:3000',
    LOG_LEVEL: 'debug',
    ENABLE_ANALYTICS: false,
    ENABLE_SENTRY: false,
    TOKEN_EXPIRY_MS: 24 * 60 * 60 * 1000, // 24 hours
    OFFLINE_QUEUE_RETRY_DELAY_MS: 5000,
    MAX_RETRY_ATTEMPTS: 3,
  },
  staging: {
    API_URL: 'https://staging-api.entregapro.com.br',
    LOG_LEVEL: 'info',
    ENABLE_ANALYTICS: true,
    ENABLE_SENTRY: true,
    SENTRY_DSN: 'https://your-staging-sentry-dsn@sentry.io/project',
    TOKEN_EXPIRY_MS: 12 * 60 * 60 * 1000, // 12 hours
    OFFLINE_QUEUE_RETRY_DELAY_MS: 10000,
    MAX_RETRY_ATTEMPTS: 5,
  },
  production: {
    API_URL: 'https://api.entregapro.com.br',
    LOG_LEVEL: 'warn',
    ENABLE_ANALYTICS: true,
    ENABLE_SENTRY: true,
    SENTRY_DSN: 'https://your-production-sentry-dsn@sentry.io/project',
    TOKEN_EXPIRY_MS: 8 * 60 * 60 * 1000, // 8 hours
    OFFLINE_QUEUE_RETRY_DELAY_MS: 15000,
    MAX_RETRY_ATTEMPTS: 5,
  },
};

function getDevApiUrl(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:3000`;
  }
  return 'http://localhost:3000';
}

// Get current environment config
export const ENV = CONFIGS[getEnvironment()];
export const CURRENT_ENV = getEnvironment();

/**
 * Validates that all required environment variables are set
 */
export function validateEnv(): void {
  const required = ['API_URL', 'LOG_LEVEL'] as const;
  
  for (const key of required) {
    if (!ENV[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
  
  if (ENV.ENABLE_SENTRY && !ENV.SENTRY_DSN) {
    console.warn('Sentry enabled but SENTRY_DSN not configured');
  }
}
