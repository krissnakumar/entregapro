# Quick Start Guide - Production Ready Setup

## 🎯 5-Minute Setup

### 1. Install Dependencies

```bash
# From workspace root
pnpm install
# or
npm install
```

### 2. Configure Environment

```bash
# Copy template
cp .env.example .env

# Edit for your environment
# Development:
# EXPO_ENVIRONMENT=development
# EXPO_API_URL=http://localhost:3000
# EXPO_DEBUG=true

# Production:
# EXPO_ENVIRONMENT=production
# EXPO_API_URL=https://api.entregapro.com.br
# EXPO_DEBUG=false
```

### 3. Start Development

```bash
cd apps/driver  # or admin/dispatcher
npm start
```

## 🔧 Common Tasks

### Type Checking

```bash
cd apps/driver
npm run type-check
```

### Build for Production

```bash
cd apps/driver
npm run build:android
npm run build:ios
```

### View Logs

```typescript
import { logger } from '@rn-apps/shared';

// View recent logs
const logs = logger.getLogs();
console.log(logs);
```

### Check API Configuration

```typescript
import { ENV, CURRENT_ENV } from '@rn-apps/shared';

console.log(`Environment: ${CURRENT_ENV}`);
console.log(`API URL: ${ENV.API_URL}`);
console.log(`Token Expiry: ${ENV.TOKEN_EXPIRY_MS}ms`);
```

## 📱 Running Apps

### Admin App

```bash
cd apps/admin
npm start
# Android: Press 'a'
# iOS: Press 'i'
# Web: Press 'w'
```

### Dispatcher App

```bash
cd apps/dispatcher
npm start
```

### Driver App

```bash
cd apps/driver
npm start
```

## 🐛 Debugging

### Enable Debug Mode

Edit your `.env`:

```bash
EXPO_DEBUG=true
```

This enables:
- All debug-level logs
- Verbose API request logging
- Memory log buffer access

### View Debug Logs

```typescript
import { logger } from '@rn-apps/shared';

// In your component or console
const recentLogs = logger.getLogs();
recentLogs.forEach(log => {
  console.log(`[${log.level}] ${log.message}`, log.context);
});
```

## 🔐 Authentication Flow

1. User logs in with email/password
2. API returns access_token
3. Token stored with expiration time
4. Automatic logout after expiration
5. User prompted to re-authenticate

```typescript
import { useAuthStore } from '@rn-apps/shared';

const { user, token, logout, isAuthenticated } = useAuthStore();

// Check if authenticated
if (isAuthenticated()) {
  // Show authenticated UI
}

// Logout
logout(); // Token cleared, user logged out
```

## 📡 Offline Support

The driver app supports offline mode:

```typescript
import { useOfflineStore } from '@entregapro-driver/store/offlineStore';

const { isOffline, mutationQueue, syncQueue } = useOfflineStore();

// Queue a mutation when offline
if (isOffline) {
  offlineStore.enqueueMutation('STATUS', deliveryId, { status: 'DELIVERED' });
}

// Sync when back online
if (!isOffline && mutationQueue.length > 0) {
  await syncQueue();
}
```

## 📊 Environment Comparison

| Feature | Development | Staging | Production |
|---------|-------------|---------|-----------|
| API URL | localhost:3000 | staging-api | api |
| Log Level | debug | info | warn |
| Token Expiry | 24h | 12h | 8h |
| Retry Delay | 5s | 10s | 15s |
| Analytics | No | Yes | Yes |
| Sentry | No | Yes | Yes |

## 🚨 Common Issues

### "API connection failed"
- Check EXPO_API_URL in .env
- Verify API server is running
- Check network connectivity

### "Token expired"
- User will be logged out automatically
- Clear app cache and restart
- Check system time is correct

### "TypeScript errors"
```bash
npm run type-check
```

### "Offline queue not syncing"
- Check network connectivity
- Check API endpoint is accessible
- Review logs: `logger.getLogs()`

## 📚 Documentation

- **[CONFIGURATION.md](./CONFIGURATION.md)** - Detailed configuration guide
- **[PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)** - Deployment checklist
- **[IMPROVEMENTS_SUMMARY.md](./IMPROVEMENTS_SUMMARY.md)** - What's been improved

## 🆘 Getting Help

1. Check the documentation files above
2. Review error logs: `logger.getLogs()`
3. Check app.json configuration
4. Verify .env file settings
5. Contact the development team

## ✅ Verification

Run these to verify your setup:

```bash
# 1. Type check
npm run type-check

# 2. Start app (should start without errors)
npm start

# 3. Login with test credentials
# Check no console errors

# 4. Verify API calls (check Network tab in DevTools)
# Should see requests to your configured API_URL
```

## 🎉 You're Ready!

Your app is now production-ready with:
- ✅ Environment-based configuration
- ✅ Comprehensive logging
- ✅ Error handling
- ✅ Token expiration
- ✅ Offline support
- ✅ TypeScript support
- ✅ Security best practices

Happy coding! 🚀
