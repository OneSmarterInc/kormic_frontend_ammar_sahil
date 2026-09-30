const fs = require('node:fs');
const path = require('node:path');

module.exports = ({ config }) => {
  const android = { ...config.android };
  // Firebase credentials are optional for a local preview. In-app notifications
  // remain available; remote push requires this file and matching server setup.
  if (android.googleServicesFile && !fs.existsSync(path.resolve(__dirname, android.googleServicesFile))) {
    delete android.googleServicesFile;
  }
  return { ...config, userInterfaceStyle: 'light', android };
};
