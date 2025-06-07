const ldap = require("ldapjs");
const httpntlm = require("httpntlm");
const os = require("os");
const env = require("../config/env");
const logger = require("../utils/logger");

class AuthService {
  async authenticate(username, password) {
    const userPart = this.extractUsername(username);
    const dn = `${env.domain}\\${userPart}`;
    logger.info(`Authenticating user: ${dn}`);

    // LDAP authentication
    const ldapClient = ldap.createClient({ url: env.ldapUrl });
    try {
      await this.bindLdap(ldapClient, dn, password);
      logger.info(`LDAP bind succeeded for ${dn}`);
    } catch (err) {
      logger.error(`LDAP bind failed for ${dn}: ${err.message}`);
      throw new Error("اطلاعات ورود اشتباه است.");
    } finally {
      ldapClient.unbind();
    }

    // CRM user verification
    const crmUser = await this.verifyCrmUser(userPart, password, dn);
    if (!crmUser) {
      logger.error(`CRM user not found: ${dn}`);
      throw new Error("کاربر در CRM یافت نشد.");
    }

    return {
      id: crmUser.systemuserid,
      username: crmUser.domainname,
      fullname: crmUser.fullname,
    };
  }

  extractUsername(input) {
    if (input.includes("\\")) return input.split("\\")[1];
    if (input.includes("@")) return input.split("@")[0];
    return input;
  }

  bindLdap(client, dn, password) {
    return new Promise((resolve, reject) => {
      client.bind(dn, password, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async verifyCrmUser(username, password, dn) {
    const filterPath = `/systemusers?$filter=${encodeURIComponent(
      `domainname eq '${dn}'`
    )}`;
    let url = `${env.crmUrl}${filterPath}`; // Use env.crmUrl consistently
    // logger.info(`CRM Request URL: ${url}`);

    try {
      const response = await this.makeNtlmRequest(url, username, password);
      if (response.statusCode !== 200) {
        logger.warn("Filter failed, fetching all users");
        url = `${env.crmUrl}/systemusers`;
        const fallbackResponse = await this.makeNtlmRequest(
          url,
          username,
          password
        );
        return this.processCrmResponse(fallbackResponse, dn);
      }
      return this.processCrmResponse(response, dn);
    } catch (err) {
      logger.error(`CRM fetch error: ${err.message}`);
      throw new Error("خطا در ارتباط با CRM.");
    }
  }

  makeNtlmRequest(url, username, password) {
    return new Promise((resolve, reject) => {
      httpntlm.get(
        {
          url,
          username,
          password,
          domain: env.domain,
          workstation: os.hostname(),
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json; charset=utf-8",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
          },
        },
        (err, response) => {
          if (err) reject(err);
          else resolve(response);
        }
      );
    });
  }

  processCrmResponse(response, dn) {
    if (response.statusCode !== 200) return null;
    let data;
    try {
      data = JSON.parse(response.body);
    } catch (err) {
      logger.error(`CRM JSON parse error: ${err.message}`);
      throw new Error("خطا در پاسخ CRM.");
    }
    const users = Array.isArray(data.value) ? data.value : [];
    return users.find((u) => u.domainname.toLowerCase() === dn.toLowerCase());
  }
}

module.exports = new AuthService();
