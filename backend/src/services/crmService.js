const httpntlm = require("httpntlm");
const env = require("../config/env");
const logger = require("../utils/logger");
const { decrypt } = require("../utils/crypto");
const { ActivityPointer, SystemUser } = require("../core/resources");
const DateTimeService = require("../core/services/DateTimeService");

class CrmService {
  constructor() {
    this.baseUrl = env.crmUrl;
    // cache entity colors (logicalName → #RRGGBB)
    this._colorCache = new Map();
  }

  /**
   * Return Dynamics “Color” for a given entity logical name.
   * Look‑up is cached for the lifetime of the Node process.
   */
  async _getEntityColor(logicalName, credentials) {
    if (this._colorCache.has(logicalName)) {
      return this._colorCache.get(logicalName);
    }

    try {
      const meta = await this.fetchEntity(
        `EntityDefinitions(LogicalName='${logicalName}')`,
        { select: "EntityColor" },
        credentials
      );
      const color = meta.EntityColor || "#6c757d";
      this._colorCache.set(logicalName, EntityColor);
      return color;
    } catch (_) {
      // fallback grey if the metadata call fails
      return "#6c757d";
    }
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
    pageSize = 200,
    customFilter = null
  ) {
    try {
      const select =
        Object.values(ActivityPointer.properties).join(",") + ",new_seen"; // custom two‑options field on task
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

      // use the *task* entity set so custom task fields are available
      const data = await this.fetchEntity("tasks", query, credentials);

      if (!data || !data.value) {
        logger.error("Invalid response format from CRM");
        throw new Error("Invalid response format from CRM");
      }

      const withExtras = await Promise.all(
        (data.value || []).map(async (item) => {
          // boolean flag (undefined → false)
          item.seen = !!item.new_seen;

          // color based on activitytypecode (task, phonecall …)
          item.color = await this._getEntityColor(
            item.activitytypecode,
            credentials
          );
          return item;
        })
      );

      return {
        value: withExtras,
        nextLink: data["@odata.nextLink"] || null,
      };
    } catch (error) {
      logger.error(`Error in fetchActivities: ${error.message}`);
      throw error;
    }
  }

  async fetchActivityDetails(activityId, credentials) {
    const query = {
      select: [
        ...Object.values(ActivityPointer.properties),
        "_regardingobjectid_value",
        "new_seen", // two‑options field
        "_new_lastowner_value", // lookup GUID (shadow column)
      ].join(","),
      // no expand – lookup doesn't expose a navigation property
      // Ask Web API to include all annotations (formatted value, lookuplogicalname, etc.)
      headers: {
        Prefer: 'odata.include-annotations="*"',
      },
    };

    // Use the task entity set to access task‑specific custom columns
    const data = await this.fetchEntity(
      `tasks(${activityId})`,
      query,
      credentials
    );

    // Extract regarding lookup fields
    const regardingId = data._regardingobjectid_value || null;
    const regardingName =
      data[
        "_regardingobjectid_value@OData.Community.Display.V1.FormattedValue"
      ] || "";
    // Some orgs expose the logical name on the polymorphic field without underscore
    const regardingType =
      data["regardingobjectid@Microsoft.Dynamics.CRM.lookuplogicalname"] ||
      data[
        "_regardingobjectid_value@Microsoft.Dynamics.CRM.lookuplogicalname"
      ] ||
      "";

    // Attach for frontend
    data.regardingobjectid = regardingId;
    data.regardingname = regardingName;
    data.regardingtype = regardingType;

    // Get owner name from formatted-value annotation
    const ownerName =
      data["_ownerid_value@OData.Community.Display.V1.FormattedValue"] || "-";

    // Last‑owner display name (annotation on the shadow column)
    const lastOwnerName =
      data["_new_lastowner_value@OData.Community.Display.V1.FormattedValue"] ||
      "";

    return {
      ...data,
      lastownername: lastOwnerName,
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
      // 204 No Content case — first try to read the entity ID from headers.
      const entityHeader =
        res.headers["odata-entityid"] || res.headers["location"];
      if (entityHeader) {
        activityId = entityHeader.split("(")[1].split(")")[0];
        logger.info(`Created entity ID from header: ${activityId}`);
      } else {
        // Fallback: query by subject + ownerid (works for tasks, not for annotations)
        const ownerId = data["ownerid@odata.bind"]?.match(
          /systemusers\(([^)]+)\)/
        )?.[1];

        if (!ownerId || !data.subject) {
          logger.warn(
            "204 response without OData-EntityId header; returning without ID"
          );
          return {}; // caller can ignore if ID is not needed
        }

        const query = {
          select: "activityid",
          filter: `subject eq '${data.subject}' and _ownerid_value eq '${ownerId}'`,
          orderby: "createdon desc",
          top: 1,
        };
        logger.info(
          `Fetching created task with query: ${JSON.stringify(query)}`
        );
        const result = await this.fetchEntity("tasks", query, credentials);
        if (!result.value || result.value.length === 0) {
          throw new Error("Failed to fetch created task ID");
        }
        activityId = result.value[0].activityid;
        logger.info(`Retrieved activity ID from query: ${activityId}`);
      }
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

  /**
   * Return all annotations linked to a task.
   */
  async fetchNotes(taskId, credentials) {
    const query = {
      select: "annotationid,subject,notetext,filename,mimetype,createdon",
      filter: `_objectid_value eq '${taskId}'`,
      orderby: "createdon asc",
      expand: "createdby($select=fullname)",
    };
    const data = await this.fetchEntity("annotations", query, credentials);
    return data.value || [];
  }

  /**
   * Fetch a single note with its documentbody for download.
   */
  async fetchNoteAttachment(noteId, credentials) {
    // annotations set – single record
    const data = await this.fetchEntity(
      `annotations(${noteId})`,
      {
        select: "annotationid,filename,mimetype,documentbody",
      },
      credentials
    );
    return data;
  }

  /**
   * Create a new note (annotation) for a task.
   * noteData = { subject, notetext, filename, mimetype, documentbody }
   */
  async createNote(taskId, noteData, credentials) {
    const payload = {
      subject:
        (noteData.subject && noteData.subject.trim()) ||
        (noteData.filename
          ? noteData.filename
          : (noteData.notetext || "").slice(0, 50) || "Note"),
      notetext: noteData.notetext || "",
      [`objectid_task@odata.bind`]: `/tasks(${taskId})`,
    };

    if (noteData.documentbody) {
      payload.documentbody = noteData.documentbody;
      payload.filename = noteData.filename || "Attachment";
      if (noteData.mimetype) payload.mimetype = noteData.mimetype;
    }

    const result = await this.createEntity("annotations", payload, credentials);
    return result;
  }
}

module.exports = new CrmService();
