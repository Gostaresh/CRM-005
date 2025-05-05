require("dotenv").config();
const httpntlm = require("node-http-ntlm");
const fs = require("fs");

const fetchMetadata = async () => {
  const username = process.env.D365_USERNAME || "GOSTARESH\\ehsntb";
  const password = process.env.D365_PASSWORD || "Ss12345";
  const domain = process.env.D365_DOMAIN || "GOSTARESH";

  // Validate credentials
  if (!username || !password || !domain) {
    throw new Error(
      "Missing required environment variables. Please set D365_USERNAME, D365_PASSWORD, and D365_DOMAIN in your .env file."
    );
  }

  console.log(
    `Fetching metadata with credentials: Username=${username}, Domain=${domain}`
  );

  const options = {
    url: "http://192.168.1.6/gostaresh/api/data/v9.1/EntityDefinitions?$filter=IsActivity eq true or LogicalName eq 'email' or LogicalName eq 'phonecall' or LogicalName eq 'task' or LogicalName eq 'appointment'",
    username,
    password,
    domain,
  };

  try {
    const response = await new Promise((resolve, reject) => {
      httpntlm.get(options, (err, res) => {
        if (err) reject(err);
        resolve(res);
      });
    });

    if (!response.body) {
      throw new Error("No response body received from Dynamics 365 API.");
    }

    const data = JSON.parse(response.body);
    fs.writeFileSync(
      "src/resources/EntityDefinitions.json",
      JSON.stringify(data, null, 2)
    );
    console.log(
      "Metadata fetched and saved to src/resources/EntityDefinitions.json"
    );
  } catch (err) {
    console.error("Failed to fetch metadata:", err.message);
    throw err;
  }
};

fetchMetadata().catch((err) => {
  console.error("Script failed:", err.message);
  process.exit(1);
});
