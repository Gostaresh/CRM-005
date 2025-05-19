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
        SESSION_SECRET:
          "F47MYub9/3mhRse29wa5ZqdNnbtY5t58eLmzJ7lwkFynCNZ0pNQa+OMYkJQ5EbNI",
      },
    },
  ],
};
