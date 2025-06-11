const httpntlm = require("httpntlm");
const env = require("../config/env");
const logger = require("../utils/logger");
const { decrypt } = require("../utils/crypto");
const {
  ActivityPointer,
  SystemUser,
  activityTypeToEtc,
  activityTypeToEntitySet,
} = require("../core/resources");
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
      this._colorCache.set(logicalName, color);
      return color;
    } catch (error) {
      logger.warn(
        `Unable to fetch EntityColor for ${logicalName}: ${error.message}; using default.`
      );
      // graceful fallback – keep the app running
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

    // logger.info(`Fetching entity: ${url}`);
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

    // logger.info(`CRM response status: ${res.statusCode}`);
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
        Object.values(ActivityPointer.properties).join(",") +
        ",_createdby_value"; // new_seen exists only on tasks – fetched later
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
              Prefer:
                `odata.maxpagesize=${pageSize},` +
                'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
            },
          };

      // use the activitypointer entity set for all activities
      const data = await this.fetchEntity(
        "activitypointers",
        query,
        credentials
      );

      if (!data || !data.value) {
        logger.error("Invalid response format from CRM");
        throw new Error("Invalid response format from CRM");
      }

      const withExtras = await Promise.all(
        (data.value || []).map(async (item) => {
          // color based on activitytypecode (task, phonecall …)
          item.color = await this._getEntityColor(
            item.activitytypecode,
            credentials
          );
          // display name from annotation
          const ownerName =
            item["_ownerid_value@OData.Community.Display.V1.FormattedValue"] ||
            "";
          item.owner = {
            id: item[ActivityPointer.properties.ownerId],
            name: ownerName,
          };
          return item;
        })
      );

      /* ── second call: retrieve new_seen, new_lastownerid, lastownername for tasks only ───────────── */
      const taskIds = withExtras
        .filter((a) => a.activitytypecode === "task")
        .map((a) => a.activityid);

      if (taskIds.length) {
        const filter = taskIds.map((id) => `activityid eq ${id}`).join(" or ");
        const taskMeta = await this.fetchEntity(
          "tasks",
          {
            select: "activityid,new_seen,_new_lastowner_value",
            filter,
            top: taskIds.length,
            headers: {
              Prefer:
                'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
            },
          },
          credentials
        );

        // Build lookup maps for seen + last-owner
        const taskInfoMap = new Map(
          (taskMeta.value || []).map((t) => [
            t.activityid,
            {
              new_seen: !!t.new_seen,
              new_lastownerid: t._new_lastowner_value || null,
              lastownername:
                t[
                  "_new_lastowner_value@OData.Community.Display.V1.FormattedValue"
                ] || "",
            },
          ])
        );

        // Attach to each activity
        withExtras.forEach((a) => {
          if (a.activitytypecode === "task" && taskInfoMap.has(a.activityid)) {
            Object.assign(a, taskInfoMap.get(a.activityid));
          } else {
            // defaults for non‑tasks
            a.new_seen = false;
            a.new_lastownerid = null;
            a.lastownername = "";
          }
        });
      } else {
        // non‑task activities have no seen/owner fields
        withExtras.forEach((a) => {
          a.new_seen = false;
          a.new_lastownerid = null;
          a.lastownername = "";
        });
      }

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
    // ── Only fetch columns that exist on activitypointer ──
    const baseQuery = {
      select: [
        ...Object.values(ActivityPointer.properties),
        "_createdby_value",
        "_regardingobjectid_value",
      ].join(","),
      headers: {
        Prefer: 'odata.include-annotations="*"',
      },
    };

    const data = await this.fetchEntity(
      `activitypointers(${activityId})`,
      baseQuery,
      credentials
    );

    // ── task‑specific columns (new_seen, lastowner) ──
    let newSeen = false;
    let lastOwnerId = null;
    let lastOwnerName = "";

    if (data.activitytypecode === "task") {
      try {
        const taskData = await this.fetchEntity(
          `tasks(${activityId})`,
          {
            select: "new_seen,_new_lastowner_value",
            headers: {
              Prefer: 'odata.include-annotations="*"',
            },
          },
          credentials
        );

        newSeen = !!taskData.new_seen;
        lastOwnerId = taskData._new_lastowner_value || null;
        lastOwnerName =
          taskData[
            "_new_lastowner_value@OData.Community.Display.V1.FormattedValue"
          ] || "";
      } catch (err) {
        logger.warn(`Unable to fetch task extras: ${err.message}`);
      }
    }

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

    // Creator display name (annotation)
    const createdByName =
      data["_createdby_value@OData.Community.Display.V1.FormattedValue"] || "";

    // Build Dynamics deep‑link that works for any entity type
    const entityTypeCode =
      activityTypeToEtc[data.activitytypecode?.toLowerCase()] || 4212; // default Task ETC
    const recordUrl =
      `http://192.168.1.6/Gostaresh/main.aspx?pagetype=entityrecord&etc=${entityTypeCode}` +
      `&id=%7B${activityId}%7D`; // encode {GUID}

    return {
      ...data,
      new_seen: newSeen,
      new_lastownerid: lastOwnerId,
      lastownername: lastOwnerName,
      createdbyname: createdByName,
      owner: {
        id: data[ActivityPointer.properties.ownerId],
        name: ownerName,
      },
      recordUrl,
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
    // Sanitize Dynamics payload
    const payload = { ...data };
    // Remove legacy and read-only columns
    // Only remove actualstart (not actualend)
    delete payload.statecode;
    delete payload.statuscode;
    delete payload.actualstart; // read‑only
    delete payload.ownerid; // shadow GUID column – use @odata.bind

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
        json: payload,
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
        const ownerId = payload["ownerid@odata.bind"]?.match(
          /systemusers\(([^)]+)\)/
        )?.[1];

        if (!ownerId || !payload.subject) {
          logger.warn(
            "204 response without OData-EntityId header; returning without ID"
          );
          return {}; // caller can ignore if ID is not needed
        }

        const query = {
          select: "activityid",
          filter: `subject eq '${payload.subject}' and _ownerid_value eq '${ownerId}'`,
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

  async updateTaskDates(activityId, activitytypecode, dates, credentials) {
    const url = `${this.baseUrl}/${activitytypecode}s(${activityId})`;
    // Commenting on date conversion logic in the updateTaskDates method
    logger.info(
      `Updating ${activitytypecode} dates at: ${url}, data: ${JSON.stringify(dates)}`
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

  /**
   * Update any activity entity (task, phonecall, custom new_* …).
   * @param {string} activityId      GUID of the activity record
   * @param {string} logicalName     activitytypecode, e.g. 'task'
   * @param {object} payload         fields to PATCH
   * @param {object} credentials     { username, password }
   */
  async updateActivity(activityId, logicalName, payload, credentials) {
    // Resolve plural entity‑set name
    const entitySet = activityTypeToEntitySet[logicalName] || `${logicalName}s`;
    const url = `${this.baseUrl}/${entitySet}(${activityId})`;

    logger.info(`PATCH ${url}  data: ${JSON.stringify(payload)}`);

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
          json: payload,
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
      orderby: "createdon desc",
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
