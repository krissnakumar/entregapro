const appJson = require("./app.json");

const config = structuredClone(appJson);
const expo = config.expo;

const projectId =
  process.env.EXPO_PUBLIC_ADMIN_EAS_PROJECT_ID ||
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
  expo.extra?.eas?.projectId;

const environment =
  process.env.EXPO_PUBLIC_ENVIRONMENT ||
  (process.env.EAS_BUILD_PROFILE === "production"
    ? "production"
    : expo.extra?.environment || "development");

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  (environment === "production"
    ? "https://entregapro-api.onrender.com"
    : undefined);

expo.owner = process.env.EXPO_OWNER || "randomthoughts";
expo.extra = {
  ...expo.extra,
  environment,
  apiUrl,
  eas: projectId
    ? {
        ...(expo.extra?.eas || {}),
        projectId,
      }
    : expo.extra?.eas,
};

module.exports = config;
