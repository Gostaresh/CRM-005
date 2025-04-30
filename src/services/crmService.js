const httpntlm = require("httpntlm");
const env = require("../config/env");
const logger = require("../utils/logger");

class CrmService {
  constructor() {
    this.baseUrl = env.crmUrl;
  }

  async fetchEntity(entity, query, credentials) {
    let url = `${this.baseUrl}/${entity}`;
    const params = [];
    if (query.select) params.push(`$select=${query.select}`);
    if (query.filter) params.push(`$filter=${query.filter}`);
    if (query.orderby) params.push(`$orderby=${query.orderby}`);
    if (query.top) params.push(`$top=${query.top}`);
    if (query.expand) params.push(`$expand=${query.expand}`);
    if (params.length) url += `?${params.join("&")}`;

    if (query.nextLink) {
      url = query.nextLink;
    }

    logger.info(`Fetching entity: ${url}`);
    const requestOptions = {
      url,
      username: credentials.username,
      password: credentials.password,
      domain: env.domain,
      workstation: "",
    };

    // Add custom headers if provided (e.g., Prefer for pagination)
    if (query.headers) {
      requestOptions.headers = query.headers;
    }

    const res = await new Promise((resolve, reject) => {
      httpntlm.get(requestOptions, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });

    logger.info(`CRM response status: ${res.statusCode}`);
    if (res.statusCode !== 200) {
      logger.error(
        `CRM request failed with status: ${res.statusCode}, body: ${res.body}`
      );
      throw new Error(`CRM request failed: ${res.statusCode}`);
    }

    return JSON.parse(res.body);
  }

  async fetchActivities(
    credentials,
    userId = null,
    nextLink = null,
    pageSize = 500
  ) {
    const select =
      "subject,scheduledstart,scheduledend,activitytypecode,ownerid,activityid";
    let filter = "";
    if (userId) {
      filter = `_ownerid_value eq ${userId}`;
    }
    const orderby = "scheduledstart desc";
    const query = nextLink
      ? { nextLink }
      : {
          select,
          filter,
          orderby,
          top: pageSize,
          // Explicitly request server-driven paging
          headers: {
            Prefer: `odata.maxpagesize=${pageSize}`,
          },
        };
    const data = await this.fetchEntity("activitypointers", query, credentials);
    logger.info(
      `Raw fetchActivities response: ${JSON.stringify(data, null, 2)}`
    );
    return data;
  }

  async fetchActivityDetails(activityId, credentials) {
    const query = {
      select:
        "subject,description,scheduledstart,scheduledend,activitytypecode,prioritycode",
      expand: "ownerid,regardingobjectid_account($select=accountid,name)",
    };
    const data = await this.fetchEntity(
      `activitypointers(${activityId})`,
      query,
      credentials
    );

    let ownerName = "-";
    const owner = data.ownerid;
    if (owner) {
      const ownerId = owner.ownerid;
      const ownerType = owner["@odata.type"];

      if (ownerType === "#Microsoft.Dynamics.CRM.systemuser") {
        const userData = await this.fetchEntity(
          `systemusers(${ownerId})`,
          { select: "fullname" },
          credentials
        );
        ownerName = userData.fullname || "-";
      } else if (ownerType === "#Microsoft.Dynamics.CRM.team") {
        const teamData = await this.fetchEntity(
          `teams(${ownerId})`,
          { select: "name" },
          credentials
        );
        ownerName = teamData.name || "-";
      }
    }

    return {
      ...data,
      owner: { name: ownerName },
      regardingobjectid: data.regardingobjectid_account || null,
    };
  }

  async fetchPaginatedAccounts(page, pageSize, nextLink, credentials) {
    const query = nextLink
      ? { nextLink }
      : {
          select: "accountid,name,emailaddress1",
          orderby: "name asc",
          top: pageSize,
          filter: "",
        };
    return this.fetchEntity("accounts", query, credentials);
  }

  async createEntity(entity, data, credentials) {
    const url = `${this.baseUrl}/${entity}`;
    logger.info(`Creating entity at: ${url}, data: ${JSON.stringify(data)}`);
    const res = await new Promise((resolve, reject) => {
      const requestOptions = {
        url,
        username: credentials.username,
        password: credentials.password,
        domain: env.domain,
        workstation: "",
        headers: {
          "Content-Type": "application/json",
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
          Accept: "application/json",
        },
        json: data,
      };
      logger.debug(
        `Sending POST request: ${JSON.stringify(requestOptions, null, 2)}`
      );
      httpntlm.post(requestOptions, (err, res) => {
        if (err) return reject(err);
        logger.debug(`Raw response: ${JSON.stringify(res, null, 2)}`);
        resolve(res);
      });
    });

    logger.info(`CRM create response status: ${res.statusCode}`);
    if (res.statusCode !== 201 && res.statusCode !== 204) {
      logger.error(
        `CRM create request failed with status: ${res.statusCode}, body: ${res.body}`
      );
      throw new Error(`CRM create request failed: ${res.statusCode}`);
    }

    let activityId;
    if (res.statusCode === 201) {
      // Standard case: 201 Created with Location header
      const location = res.headers.location;
      activityId = location ? location.split("(")[1].split(")")[0] : null;
    } else {
      // 204 No Content case: Fetch the task ID by querying with unique fields
      const ownerId = data["ownerid@odata.bind"]?.match(
        /systemusers\(([^)]+)\)/
      )?.[1];
      if (!ownerId || !data.subject) {
        throw new Error(
          "Cannot fetch created task: missing ownerid or subject"
        );
      }

      const query = {
        select: "activityid",
        filter: `subject eq '${data.subject}' and _ownerid_value eq ${ownerId}`,
        orderby: "createdon desc",
        top: 1,
      };
      const result = await this.fetchEntity("tasks", query, credentials);
      if (!result.value || result.value.length === 0) {
        throw new Error("Failed to fetch created task ID");
      }
      activityId = result.value[0].activityid;
    }

    return { activityid: activityId };
  }

  async updateTaskDates(activityId, dates, credentials) {
    const url = `${this.baseUrl}/tasks(${activityId})`;
    logger.info(
      `Updating task dates at: ${url}, data: ${JSON.stringify(dates)}`
    );
    const res = await new Promise((resolve, reject) => {
      httpntlm.patch(
        {
          url,
          username: credentials.username,
          password: credentials.password,
          domain: env.domain,
          workstation: "",
          headers: {
            "Content-Type": "application/json",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            Accept: "application/json",
          },
          json: dates,
        },
        (err, res) => {
          if (err) return reject(err);
          resolve(res);
        }
      );
    });

    logger.info(`CRM update response status: ${res.statusCode}`);
    if (res.statusCode !== 204) {
      logger.error(
        `CRM update request failed with status: ${res.statusCode}, body: ${res.body}`
      );
      throw new Error(`CRM update request failed: ${res.statusCode}`);
    }

    return { success: true };
  }

  async updateTask(activityId, taskData, credentials) {
    const url = `${this.baseUrl}/tasks(${activityId})`;
    logger.info(`Updating task at: ${url}, data: ${JSON.stringify(taskData)}`);
    const res = await new Promise((resolve, reject) => {
      httpntlm.patch(
        {
          url,
          username: credentials.username,
          password: credentials.password,
          domain: env.domain,
          workstation: "",
          headers: {
            "Content-Type": "application/json",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            Accept: "application/json",
          },
          json: taskData,
        },
        (err, res) => {
          if (err) return reject(err);
          resolve(res);
        }
      );
    });

    logger.info(`CRM update response status: ${res.statusCode}`);
    if (res.statusCode !== 204) {
      logger.error(
        `CRM update request failed with status: ${res.statusCode}, body: ${res.body}`
      );
      throw new Error(`CRM update request failed: ${res.statusCode}`);
    }

    return { success: true };
  }
}

module.exports = new CrmService();
