module.exports = {
  apps : [
    {
      name   : 'backend-dev', // Name for your test/development instance
      script : './api/index.js', // Path to your backend entry point
      watch  : false, // Optional: set to true to restart on file changes during dev
      env_development: { // Note: PM2 uses 'env_YOUR_ENV_NAME'
        "NODE_ENV": "development",
        "PORT": 5000, // You can specify other env vars here if needed
        "STAMP_COMPONENTS_DIR": "./api/components/dev"
      }
    },
    {
      name   : 'backend-prod', // Name for your production instance
      script : './api/index.js', // Path to your backend entry point
      watch  : false,
      env_production: {
        "NODE_ENV": "production",
        "PORT": 5000, // Or a different port if your prod runs on another port
        "STAMP_COMPONENTS_DIR": "./api/components/prod"
      }
    }
  ]
};