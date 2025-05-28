const env = require("../config/env.js");
const crm = require("./crmService");
const BASE = env.crmUrl;
let cache; // in-memory cache, reset when the Node process restarts

/* ------------------------------------------------------------------ */
/* Safe JSON helper – logs HTML error pages returned by Dynamics      */
/* ------------------------------------------------------------------ */
async function safeJson(res, url) {
  if (!res.ok) {
    const txt = await res.text();
    console.error(`❌ ${url}\nHTTP ${res.status}\n`, txt.slice(0, 400));
    throw new Error(`Dynamics ${res.status}`);
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/* Helper to pick the Persian label (LCID 1065)                       */
/* ------------------------------------------------------------------ */
function pickLabel(lbl, lang = 1065) {
  return (
    lbl.UserLocalizedLabel?.Label ??
    lbl.LocalizedLabels.find((l) => l.LanguageCode === lang)?.Label ??
    lbl.LocalizedLabels[0]?.Label ??
    "—"
  );
}

/* ------------------------------------------------------------------ */
/* Exported function                                                   */
/* ------------------------------------------------------------------ */
async function getTaskFilterMeta(credentials) {
  if (cache) return cache; // RAM hit

  /* ① Thin attribute index ---------------------------------------- */
  const coreRes = await crm.fetchEntity(
    "EntityDefinitions(LogicalName='task')/Attributes",
    {
      select: "LogicalName,AttributeType,DisplayName",
      filter:
        "IsValidForAdvancedFind/Value eq true and " +
        "(AttributeType eq 'Picklist' or AttributeType eq 'Boolean' or " +
        " AttributeType eq 'DateTime' or AttributeType eq 'Lookup')",
    },
    credentials
  );
  const core = coreRes.value || [];

  /* ② Fetch pick-list details ------------------------------------- */
  const picklists = {};
  for (const a of core.filter((x) => x.AttributeType === "Picklist")) {
    const meta = await crm.fetchEntity(
      `EntityDefinitions(LogicalName='task')/Attributes(` +
        `LogicalName='${a.LogicalName}')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata`,
      {
        select: "LogicalName,DefaultFormValue",
        expand: "OptionSet($select=Options)",
      },
      credentials
    );

    picklists[a.LogicalName] = {
      default: meta.DefaultFormValue,
      options: meta.OptionSet.Options.map((o) => ({
        value: o.Value,
        label: pickLabel(o.Label),
      })),
    };
  }

  /* ③ Assemble final schema --------------------------------------- */
  cache = core.map((a) => {
    const base = {
      key: a.LogicalName, // e.g. prioritycode
      type: a.AttributeType,
      label: pickLabel(a.DisplayName),
    };
    if (a.AttributeType === "Picklist") {
      Object.assign(base, picklists[a.LogicalName]); // adds { default, options[] }
    }
    return base;
  });

  return cache;
}

module.exports = { getTaskFilterMeta };
