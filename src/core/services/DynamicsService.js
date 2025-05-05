const httpntlm = require("httpntlm");
const { decrypt } = require("../../utils/crypto"); // Adjusted path to point to src/utils/crypto.js

class DynamicsService {
  constructor() {
    this.baseUrl = "http://192.168.1.6/gostaresh/api/data/v9.1";
  }

  // Helper to prepare NTLM request options using session credentials
  prepareNtlmOptions(req, url, method = "get") {
    if (
      !req.session.user ||
      !req.session.user.username ||
      !req.session.encryptedPassword
    ) {
      throw new Error(
        "User credentials not found in session. Please log in again."
      );
    }

    // Parse domain and username from session (e.g., GOSTARESH\\ehsntb)
    const [domain, username] = req.session.user.username.split("\\");
    if (!domain || !username) {
      throw new Error("Username must be in the format Domain\\Username");
    }

    // Decrypt the password
    const decryptedPassword = decrypt(req.session.encryptedPassword);

    return {
      url,
      username,
      password: decryptedPassword,
      domain,
      workstation: "",
      headers: {
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        Accept: "application/json",
      },
    };
  }

  async createActivity(req, entity, payload) {
    const options = this.prepareNtlmOptions(
      req,
      `${this.baseUrl}/${entity}`,
      "post"
    );
    options.body = JSON.stringify(payload);

    try {
      const response = await new Promise((resolve, reject) => {
        httpntlm.post(options, (err, res) => {
          if (err) return reject(err);
          resolve(res);
        });
      });

      if (response.statusCode !== 201) {
        throw new Error(
          `Failed to create activity: ${response.statusCode} - ${response.body}`
        );
      }

      return JSON.parse(response.body);
    } catch (err) {
      throw new Error(`Failed to create activity: ${err.message}`);
    }
  }

  async fetchEntity(req, entity, id) {
    const options = this.prepareNtlmOptions(
      req,
      `${this.baseUrl}/${entity}(${id})`
    );

    try {
      const response = await new Promise((resolve, reject) => {
        httpntlm.get(options, (err, res) => {
          if (err) return reject(err);
          resolve(res);
        });
      });

      if (response.statusCode !== 200) {
        throw new Error(
          `Failed to fetch entity: ${response.statusCode} - ${response.body}`
        );
      }

      return JSON.parse(response.body);
    } catch (err) {
      throw new Error(`Failed to fetch entity: ${err.message}`);
    }
  }

  async fetchActivities(req, view, pageSize, nextLink) {
    const url = nextLink
      ? nextLink
      : `${this.baseUrl}/activities?$filter=${
          view === "my" ? "ownerid eq '" + req.session.user.id + "'" : "true"
        }&$top=${pageSize}`;
    const options = this.prepareNtlmOptions(req, url);

    try {
      const response = await new Promise((resolve, reject) => {
        httpntlm.get(options, (err, res) => {
          if (err) return reject(err);
          resolve(res);
        });
      });

      if (response.statusCode !== 200) {
        throw new Error(
          `Failed to fetch activities: ${response.statusCode} - ${response.body}`
        );
      }

      const data = JSON.parse(response.body);
      return {
        value: data.value,
        nextLink: data["@odata.nextLink"],
      };
    } catch (err) {
      throw new Error(`Failed to fetch activities: ${err.message}`);
    }
  }

  async updateActivityDates(req, activityId, scheduledstart, scheduledend) {
    const options = this.prepareNtlmOptions(
      req,
      `${this.baseUrl}/activities(${activityId})`,
      "patch"
    );
    options.body = JSON.stringify({
      scheduledstart,
      scheduledend,
    });

    try {
      const response = await new Promise((resolve, reject) => {
        httpntlm.patch(options, (err, res) => {
          if (err) return reject(err);
          resolve(res);
        });
      });

      if (response.statusCode !== 204) {
        throw new Error(
          `Failed to update activity dates: ${response.statusCode} - ${response.body}`
        );
      }

      return { success: true };
    } catch (err) {
      throw new Error(`Failed to update activity dates: ${err.message}`);
    }
  }
}

module.exports = DynamicsService;
