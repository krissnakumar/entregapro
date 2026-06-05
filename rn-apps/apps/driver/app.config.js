const appJson = require("./app.json");

const config = structuredClone(appJson);
const expo = config.expo;

const projectId =
  process.env.EXPO_PUBLIC_DRIVER_EAS_PROJECT_ID ||
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
  expo.extra?.eas?.projectId;

expo.owner = process.env.EXPO_OWNER || "randomthoughts";
expo.extra = {
  ...expo.extra,
  eas: projectId
    ? {
        ...(expo.extra?.eas || {}),
        projectId,
      }
    : expo.extra?.eas,
};

module.exports = config;
