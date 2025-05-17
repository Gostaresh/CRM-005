module.exports = {
  apps: [
    {
      name: "crm-backend",
      cwd: "./backend",
      script: "src/index.js",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        CRM_URL: "htt://192.168.1.6/gostaresh/api/data/v9.1",
        DOMAIN: "GOSTARESH",
        SESSION_SECRET: "your-32-byte-secret-key!!!!!!123",
      },
    },
  ],
};
