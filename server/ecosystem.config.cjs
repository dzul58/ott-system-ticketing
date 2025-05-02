module.exports = {
    apps: [
      {
        name: "ott-system-ticketing-be",
        script: "./app.js",
        watch: true,
        env: {
          NODE_ENV: "production",
          PORT: 3000,
        },
      },
    ],
  };
  