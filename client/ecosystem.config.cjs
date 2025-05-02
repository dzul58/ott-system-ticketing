module.exports = {
    apps: [
      {
        name: "frontend-ott",
        script: "npx",
        args: "serve -s dist -l 5173",
        env: {
          NODE_ENV: "production"
        }
      }
    ]
  };
