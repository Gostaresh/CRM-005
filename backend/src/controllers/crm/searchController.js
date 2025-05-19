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
    const query = {
      select: `${meta.id},${meta.display}`,
      filter,
      top,
    };

    logger.info(`Search ${type}: "${q}", top ${top}`);
    const data = await CrmService.fetchEntity(meta.set, query, creds);

    const list = (data.value || []).map((r) => ({
      id: r[meta.id],
      name: r[meta.display],
      type,
    }));

    res.json(list);
  } catch (err) {
    logger.error(`SearchController error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};
