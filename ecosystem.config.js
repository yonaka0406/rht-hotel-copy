module.exports = {
  apps : [
    {
      name   : 'backend-dev', // Name for your test/development instance
      script : './api/index.js', // Path to your backend entry point
      watch  : false, // Optional: set to true to restart on file changes during dev
      node_args: "--expose-gc",
      env_development: { 
        "NODE_ENV": "development",
        "PORT": 3001, 
        "STAMP_COMPONENTS_DIR": "./api/components/dev"
      }
    },
    {
      name   : 'backend-prod', // Name for your production instance
      script : './api/index.js', // Path to your backend entry point
      node_args: "--expose-gc",
      watch  : false,
      env_production: {
        "NODE_ENV": "production",
        "PORT": 5000, // Or a different port if your prod runs on another port
        "STAMP_COMPONENTS_DIR": "./api/components/prod"
      }
    }
  ]
};