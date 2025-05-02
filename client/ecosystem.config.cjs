module.exports = {
    apps: [
      {
        name: "ott-system-ticketing-fe",
        script: "npx",
        args: "serve -s dist -l 5173",
        env: {
          NODE_ENV: "production"
        }
      }
    ]
  };
