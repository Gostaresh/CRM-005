const CrmService = require("../../services/crmService");
const logger = require("../../utils/logger");
const { decrypt } = require("../../utils/crypto");
const entityMap = require("../../config/entityMap.json");

/**
 * GET /api/crm/search?type=account&q=foo&top=20
 * Generic search across any entity defined in entityMap.json
 */
exports.search = async (req, res) => {
  try {
    const type = (req.query.type || "account").toLowerCase();
    const q = req.query.q || "";
    const top = parseInt(req.query.top) || 20;

    if (!entityMap[type]) {
      return res
        .status(400)
        .json({ error: `Unsupported entity type '${type}'` });
    }
    if (q.trim().length < 2) {
      return res.json([]); // require at least 2 chars to reduce load
    }

    const meta = entityMap[type];
    const creds = {
      username: req.session.user.username.split("\\")[1],
      password: decrypt(req.session.encryptedPassword),
    };

    // Simple OData 'contains()' search on the display field
    // Encode non‑ASCII so the URL is valid
    const safeQ = encodeURIComponent(q).replace(/'/g, "''");
    const filter = `contains(${meta.display}, '${safeQ}')`;
    const extra = type === "contact" ? ",_parentcustomerid_value" : "";
    const query = {
      select: `${meta.id},${meta.display}${extra}`,
      filter,
      top,
      headers: {
        Prefer:
          'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
      },
    };

    // logger.info(`Search ${type}: "${q}", top ${top}`);
    const data = await CrmService.fetchEntity(meta.set, query, creds);

    // Enhance name for contact/account
    const list = await Promise.all(
      (data.value || []).map(async (r) => {
        let name = r[meta.display];
        // If contact, append (account name)
        if (type === "contact") {
          // Use parent account name from annotation if available
          const parentAccountName =
            r[
              "_parentcustomerid_value@OData.Community.Display.V1.FormattedValue"
            ];
          if (parentAccountName) {
            name = `${name} (${parentAccountName})`;
          }
        }
        // If account, append (first contact name)
        else if (type === "account") {
          // Try to get first related contact
          try {
            const contactMeta = entityMap["contact"];
            const contactsData = await CrmService.fetchEntity(
              contactMeta.set,
              {
                select: contactMeta.display,
                filter: `_parentcustomerid_value eq ${r[meta.id]}`,
                top: 1,
                headers: {
                  Prefer:
                    'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
                },
              },
              creds
            );
            const contactName =
              contactsData.value &&
              contactsData.value[0] &&
              contactsData.value[0][contactMeta.display];
            if (contactName) {
              name = `${name} (${contactName})`;
            }
          } catch (e) {
            // ignore
          }
        }
        return {
          id: r[meta.id],
          name,
          type,
          url: `http://192.168.1.6/Gostaresh/main.aspx?pagetype=entityrecord&etn=${meta.logicalName}&id=%7B${r[meta.id]}%7D`,
        };
      })
    );

    res.json(list);
  } catch (err) {
    logger.error(`SearchController error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};
