const httpntlm = require("httpntlm");
const env = require("../config/env");
const logger = require("../utils/logger");
const { decrypt } = require("../utils/crypto");
const { ActivityPointer, SystemUser } = require("../core/resources");
const DateTimeService = require("../core/services/DateTimeService");

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
    if (query.skip) params.push(`$skip=${query.skip}`);
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
    pageSize = 50,
    customFilter = null
  ) {
    try {
      const select = Object.values(ActivityPointer.properties).join(",");
      let filter = "";

      if (customFilter) {
        filter = customFilter;
      } else if (userId) {
        filter = `${ActivityPointer.properties.ownerId} eq '${userId}'`;
      }

      const orderby = `${ActivityPointer.properties.scheduledStart} desc`;
      const query = nextLink
        ? { nextLink }
        : {
            select,
            filter,
            orderby,
            top: pageSize,
            headers: {
              Prefer: `odata.maxpagesize=${pageSize}`,
            },
          };

      const data = await this.fetchEntity(
        ActivityPointer.type,
        query,
        credentials
      );
      // logger.info(
      //   `Raw fetchActivities response: ${JSON.stringify(data, null, 2)}`
      // );

      if (!data || !data.value) {
        logger.error("Invalid response format from CRM");
        throw new Error("Invalid response format from CRM");
      }

      // For a list of activities
      // for (const activity of data.value) {
      //   // Convert dates to Jalali format using DateTimeService
      //   if (activity.scheduledstart) {
      //     activity.scheduledstart_jalali = DateTimeService.toJalali(activity.scheduledstart);
      //   }
      //   if (activity.scheduledend) {
      //     activity.scheduledend_jalali = DateTimeService.toJalali(activity.scheduledend);
      //   }
      //   if (activity.actualstart) {
      //     activity.actualstart_jalali = DateTimeService.toJalali(activity.actualstart);
      //   }
      //   if (activity.actualend) {
      //     activity.actualend_jalali = DateTimeService.toJalali(activity.actualend);
      //   }
      //   if (activity.createdon) {
      //     activity.createdon_jalali = DateTimeService.toJalali(activity.createdon);
      //   }
      //   if (activity.modifiedon) {
      //     activity.modifiedon_jalali = DateTimeService.toJalali(activity.modifiedon);
      //   }

      //   if (activity.ownerid) {
      //     // Map the owner data using the formatted value
      //     activity.owner = {
      //       id: activity._ownerid_value,
      //       name: activity['ownerid@OData.Community.Display.V1.FormattedValue'] || '-'
      //     };
      //     // Remove the raw ownerid data
      //     delete activity.ownerid;
      //   }
      // }

      return {
        value: data.value || [],
        nextLink: data["@odata.nextLink"] || null,
      };
    } catch (error) {
      logger.error(`Error in fetchActivities: ${error.message}`);
      throw error;
    }
  }

  async fetchActivityDetails(activityId, credentials) {
    const query = {
      select: Object.values(ActivityPointer.properties).join(","),
      expand: ActivityPointer.expand.ownerId,
    };

    const data = await this.fetchEntity(
      `${ActivityPointer.type}(${activityId})`,
      query,
      credentials
    );

    // Get owner name from expanded data
    let ownerName = "-";
    if (data.ownerid) {
      ownerName = data.ownerid.fullname || "-";
    }

    return {
      ...data,
      owner: {
        id: data[ActivityPointer.properties.ownerId],
        name: ownerName,
      },
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
        if (err) {
          logger.error(`HTTP request error: ${err.message}`);
          return reject(err);
        }
        logger.debug(`Raw response: ${JSON.stringify(res, null, 2)}`);
        resolve(res);
      });
    });

    logger.info(`CRM create response status: ${res.statusCode}`);
    if (res.statusCode !== 201 && res.statusCode !== 204) {
      logger.error(
        `CRM create request failed with status: ${
          res.statusCode
        }, body: ${JSON.stringify(res.body)}`
      );
      throw new Error(
        `CRM create request failed: ${res.statusCode} - ${JSON.stringify(
          res.body
        )}`
      );
    }

    let activityId;
    if (res.statusCode === 201) {
      // Standard case: 201 Created with Location header
      const location = res.headers.location;
      activityId = location ? location.split("(")[1].split(")")[0] : null;
      logger.info(`Created activity with ID: ${activityId}`);
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
      logger.info(`Fetching created task with query: ${JSON.stringify(query)}`);
      const result = await this.fetchEntity("tasks", query, credentials);
      if (!result.value || result.value.length === 0) {
        throw new Error("Failed to fetch created task ID");
      }
      activityId = result.value[0].activityid;
      logger.info(`Retrieved activity ID from query: ${activityId}`);
    }

    return { activityid: activityId };
  }

  async updateTaskDates(activityId, dates, credentials) {
    const url = `${this.baseUrl}/tasks(${activityId})`;
    // Commenting on date conversion logic in the updateTaskDates method
    logger.info(
      `Updating task dates at: ${url}, data: ${JSON.stringify(dates)}`
    );
    // The 'dates' object likely contains date fields that are being sent to the CRM system.
    // Ensure that these dates are converted to UTC format before sending them.
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

  async fetchOwnerName(ownerid, credentials) {
    if (!ownerid) return "-";

    // Try to fetch from systemuser
    try {
      const userData = await this.fetchEntity(
        `systemusers(${ownerid})`,
        { select: "fullname" },
        credentials
      );
      if (userData && userData.fullname) return userData.fullname;
    } catch (err) {
      logger.error(`Error fetching systemuser: ${err.message}`);
    }

    // Try to fetch from team
    try {
      const teamData = await this.fetchEntity(
        `teams(${ownerid})`,
        { select: "name" },
        credentials
      );
      if (teamData && teamData.name) return teamData.name;
    } catch (err) {
      logger.error(`Error fetching team: ${err.message}`);
    }

    return "-";
  }

  async fetchAccounts(credentials) {
    const query = {
      select: "accountid,name",
      top: 2000,
      orderby: "name asc",
      headers: {
        Prefer:
          'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
      },
    };
    const data = await this.fetchEntity("accounts", query, credentials);
    return data.value || [];
  }

  async fetchContacts(credentials) {
    const query = {
      select: "contactid,fullname,mobilephone",
      top: 2000,
      orderby: "fullname asc",
      headers: {
        Prefer:
          'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
      },
    };
    const data = await this.fetchEntity("contacts", query, credentials);
    return data.value || [];
  }
}

module.exports = new CrmService();
