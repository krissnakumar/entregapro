# EntregaPRO React Native Apps - Production Deployment Guide

## Overview

This guide covers production deployment, configuration, and maintenance for the EntregaPRO React Native applications (Admin, Dispatcher, Driver).

## Pre-Production Checklist

### Configuration
- [ ] Set environment to `production` in app.json
- [ ] Configure API_URL to production backend
- [ ] Set up Sentry for error tracking
- [ ] Configure analytics
- [ ] Update bundle identifiers and package names
- [ ] Generate signing certificates

### Security
- [ ] Review and update authentication flows
- [ ] Ensure token expiration is configured (8 hours for production)
- [ ] Verify secure storage is enabled (expo-secure-store)
- [ ] Audit API error messages (no sensitive data)
- [ ] Set up API rate limiting on backend
- [ ] Enable HTTPS only

### Performance
- [ ] Run TypeScript type check: `npm run type-check`
- [ ] Test offline functionality thoroughly
- [ ] Verify app bundle size
- [ ] Test on actual devices, not just emulators
- [ ] Monitor network requests

### Testing
- [ ] End-to-end testing with production-like data
- [ ] Test all user flows (login, deliveries, sync, etc.)
- [ ] Test offline mode and queue sync
- [ ] Test error scenarios and error messages
- [ ] Load testing on backend

## Environment Configuration

### app.json Configuration

```json
{
  "expo": {
    "extra": {
      "environment": "production",
      "apiUrl": "https://api.entregapro.com.br"
    }
  }
}
```

### Environment Variables

Create an `.env` file based on `.env.example`:

```bash
# .env
EXPO_ENVIRONMENT=production
EXPO_API_URL=https://api.entregapro.com.br
EXPO_DEBUG=false
EXPO_ENABLE_ANALYTICS=true
EXPO_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
```

## Building for Production

### Android Build

```bash
cd apps/admin
npm run build:android
# or
eas build --platform android --auto-submit
```

**Requirements:**
- Signing key and certificate
- keystore file
- Play Store account

### iOS Build

```bash
cd apps/admin
npm run build:ios
# or
eas build --platform ios --auto-submit
```

**Requirements:**
- Apple Developer account
- Provisioning profile
- Signing certificate
- App Store account

## Deployment

### Initial Release
1. Build for both iOS and Android
2. Test on production backend
3. Prepare release notes
4. Submit to app stores
5. Monitor crashes and feedback

### Updates
1. Update version in app.json
2. Increment `buildNumber` (iOS) and `versionCode` (Android)
3. Build and test
4. Submit to app stores

### Hotfixes
- For critical bugs, use runtime versioning
- Push updates via EAS Updates if available
- Communicate with users through in-app notifications

## Monitoring and Debugging

### Error Tracking with Sentry
- Errors are automatically sent to Sentry in production
- Access dashboard at https://sentry.io
- Set up alerts for critical errors

### Logs
- View logs in `useAuthStore` lifecycle
- Backend should log all API requests
- Monitor offline queue sync failures

### Performance
- Use Expo DevTools for profiling
- Monitor API response times
- Track crash rates

## Common Issues

### Token Expired
- User will be automatically logged out after 8 hours
- Prompt user to re-authenticate
- Clear cached data on logout

### Offline Queue Failed
- Check network connectivity
- Verify API endpoint is accessible
- Check for validation errors in logs
- Manually retry through UI

### API Errors
- 401/403: Token invalid, user needs to login
- 5xx: Server error, show generic message
- Network: Show offline message if possible

## Rollback Procedure

If critical issues occur:

1. **Immediate Action:**
   - Pause App Store distribution
   - Prepare rollback build (previous version)

2. **Communication:**
   - Notify users through in-app banner
   - Update app store listing

3. **Deploy:**
   - Build and submit previous version
   - Monitor for issues

4. **Post-Incident:**
   - Root cause analysis
   - Fix and re-test thoroughly
   - Update deployment checklist

## Security Best Practices

### API Communication
- All requests use HTTPS in production
- Certificate pinning recommended for critical endpoints
- Validate SSL certificates

### Authentication
- Tokens expire after 8 hours
- Refresh tokens not exposed to client
- Logout clears all local data

### Data Storage
- Sensitive data stored in secure storage
- AsyncStorage used for non-sensitive cache
- Auth tokens cleared on logout

### Code
- No hardcoded credentials
- Environment-based configuration
- Validate all user inputs

## Support

For issues or questions:
1. Check error logs in Sentry
2. Review app logs
3. Contact backend team
4. Submit bug report with reproduction steps

## Version History

| Version | Release Date | Notes |
|---------|--------------|-------|
| 1.0.0   | TBD          | Initial release |

---

**Last Updated:** May 2026
