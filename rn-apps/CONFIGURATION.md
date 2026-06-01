# EntregaPRO React Native - Configuration Guide

## Overview

This project uses an environment-based configuration system to support development, staging, and production environments.

## Quick Start

### 1. Copy Environment Template

```bash
cp .env.example .env
```

### 2. Configure for Your Environment

Edit `.env`:

```bash
EXPO_ENVIRONMENT=development
EXPO_API_URL=http://localhost:3000
EXPO_DEBUG=true
```

## Environment Configurations

### Development

**Location:** `packages/shared/src/config/env.ts`

```typescript
{
  API_URL: 'http://localhost:3000',
  LOG_LEVEL: 'debug',
  ENABLE_ANALYTICS: false,
  ENABLE_SENTRY: false,
  TOKEN_EXPIRY_MS: 24 * 60 * 60 * 1000,
  OFFLINE_QUEUE_RETRY_DELAY_MS: 5000,
  MAX_RETRY_ATTEMPTS: 3,
}
```

### Staging

```typescript
{
  API_URL: 'https://staging-api.entregapro.com.br',
  LOG_LEVEL: 'info',
  ENABLE_ANALYTICS: true,
  ENABLE_SENTRY: true,
  SENTRY_DSN: 'https://your-staging-sentry-dsn',
  TOKEN_EXPIRY_MS: 12 * 60 * 60 * 1000,
  OFFLINE_QUEUE_RETRY_DELAY_MS: 10000,
  MAX_RETRY_ATTEMPTS: 5,
}
```

### Production

```typescript
{
  API_URL: 'https://api.entregapro.com.br',
  LOG_LEVEL: 'warn',
  ENABLE_ANALYTICS: true,
  ENABLE_SENTRY: true,
  SENTRY_DSN: 'https://your-production-sentry-dsn',
  TOKEN_EXPIRY_MS: 8 * 60 * 60 * 1000,
  OFFLINE_QUEUE_RETRY_DELAY_MS: 15000,
  MAX_RETRY_ATTEMPTS: 5,
}
```

## Using Environment Configuration

### In Components

```typescript
import { ENV, CURRENT_ENV } from '@rn-apps/shared';

export function MyComponent() {
  // Access API URL
  const apiUrl = ENV.API_URL;
  
  // Check current environment
  if (CURRENT_ENV === 'production') {
    // Production-only logic
  }
  
  // Check if analytics enabled
  if (ENV.ENABLE_ANALYTICS) {
    // Track event
  }
}
```

### Error Logging

```typescript
import { logger, AppError } from '@rn-apps/shared';

try {
  // Some operation
} catch (error) {
  // Log with context
  logger.error('Operation failed', error, {
    userId: user.id,
    context: 'DeliveryScreen'
  });
  
  // Or use custom error types
  if (error instanceof NetworkError) {
    showOfflineMessage();
  }
}
```

### Offline Sync Configuration

The offline store respects environment configuration:

```typescript
import { ENV } from '@rn-apps/shared';

// Uses ENV.OFFLINE_QUEUE_RETRY_DELAY_MS
// Uses ENV.MAX_RETRY_ATTEMPTS
offlineStore.syncQueue();
```

## Authentication Configuration

### Token Expiration

Token expiration is controlled by environment:

- **Development:** 24 hours
- **Staging:** 12 hours  
- **Production:** 8 hours

Users are automatically logged out when token expires:

```typescript
import { useAuthStore } from '@rn-apps/shared';

export function useCheckAuth() {
  const { isAuthenticated, refreshIfNeeded } = useAuthStore();
  
  useEffect(() => {
    // Check on app start
    if (refreshIfNeeded()) {
      // Token was expired, user logged out
      console.log('Token was expired');
    }
  }, []);
}
```

## Logging Configuration

Log levels by environment:

- **Development:** `debug` - All messages
- **Staging:** `info` - Info, warn, error
- **Production:** `warn` - Only warn and error

### Using Logger

```typescript
import { logger } from '@rn-apps/shared';

// These are filtered based on LOG_LEVEL
logger.debug('Debug message', { details: 'value' });
logger.info('Information', { event: 'login' });
logger.warn('Warning', { issue: 'found' });
logger.error('Error', error, { context: 'data' });

// View recent logs
const logs = logger.getLogs();
```

## app.json Configuration

Each app has environment-specific configuration:

```json
{
  "expo": {
    "version": "1.0.0",
    "extra": {
      "environment": "production",
      "apiUrl": "https://api.entregapro.com.br"
    },
    "ios": {
      "buildNumber": "1"
    },
    "android": {
      "versionCode": 1
    }
  }
}
```

## Building Different Environments

### Development Build

```bash
cd apps/driver
npm run start
# Or with explicit environment
npm run start -- --environment development
```

### Production Build

```bash
npm run start:prod
# Or build for deployment
npm run build:android
npm run build:ios
```

## Validation

Validate environment configuration on app startup:

```typescript
import { validateEnv } from '@rn-apps/shared';

export default function App() {
  useEffect(() => {
    validateEnv(); // Throws if configuration is invalid
  }, []);
  
  return <AppContent />;
}
```

## Troubleshooting

### API URL Not Changing

1. Verify `app.json` has correct `extra.apiUrl`
2. Check `.env` file has correct `EXPO_API_URL`
3. Ensure app is rebuilt after config change
4. Check `ENV.API_URL` in browser/console

### Token Expiring Too Quickly

1. Check `TOKEN_EXPIRY_MS` for environment
2. Verify system clock is correct
3. Check token doesn't have server-side expiration

### Logs Not Showing

1. Check `LOG_LEVEL` for environment
2. In production, logs are only warn/error level
3. Use `logger.getLogs()` to access memory buffer

## Related Files

- [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) - Deployment checklist
- [packages/shared/src/config/env.ts](./packages/shared/src/config/env.ts) - Environment definitions
- [packages/shared/src/config/logger.ts](./packages/shared/src/config/logger.ts) - Logging system
- [.env.example](./.env.example) - Environment template

## Support

For questions about configuration:
1. Check environment definitions in `config/env.ts`
2. Review logger implementation in `config/logger.ts`
3. See deployment guide for production setup
