#!/usr/bin/env python3
"""
fetch_status_map.py — build {statecode:{statuscode:label}} maps
for every activity listed in activity_sets.json   (Dynamics 365 v9.1 on-prem)

Requirements:
  pip install requests requests_ntlm
"""

import json, logging, getpass
from pathlib import Path
import requests
from requests_ntlm import HttpNtlmAuth

# ── simple console logger ────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

# ── prompt for connection info ───────────────────────────────────────
BASE = input("CRM base URL (e.g. http://192.168.1.6): ").rstrip("/")
USER = input("DOMAIN\\user: ")
PWD  = getpass.getpass("Password: ")

auth = HttpNtlmAuth(*USER.split("\\", 1), PWD)

entities = json.load(open("activity_sets.json", encoding="utf-8")).keys()


def fetch_options(entity: str, attr: str):
    """
    Return OptionSet.Options list (maybe empty) for statecode / statuscode.
    """
    cast = (
        "Microsoft.Dynamics.CRM.StateAttributeMetadata"
        if attr == "statecode"
        else "Microsoft.Dynamics.CRM.StatusAttributeMetadata"
    )
    url = (
        f"{BASE}/api/data/v9.1/EntityDefinitions(LogicalName='{entity}')"
        f"/Attributes/{cast}"
        f"?$filter=LogicalName eq '{attr}'"
        "&$select=LogicalName"
        "&$expand=OptionSet($select=Options)"
    )

    r = requests.get(url, auth=auth, verify=False, timeout=60)
    if r.status_code == 404:
        return []
    r.raise_for_status()
    val = r.json().get("value", [])
    if not val or "OptionSet" not in val[0]:
        return []
    return val[0]["OptionSet"]["Options"]


def slim(opts):
    """Reduce each option to State, Value, Label."""
    return [
        {
            "State": o.get("State"),  # None for statecode rows
            "Value": o["Value"],
            "Label": o["Label"]["UserLocalizedLabel"]["Label"],
        }
        for o in opts
    ]


status_map = {}

for ent in entities:
    state_opts  = fetch_options(ent, "statecode")
    status_opts = fetch_options(ent, "statuscode")

    if not state_opts or not status_opts:
        log.warning("Skipping %-20s — missing metadata", ent)
        continue

    states  = slim(state_opts)
    statuses = slim(status_opts)

    # Build {state:{status:label}}
    m = {s["Value"]: {} for s in states}
    for o in statuses:
        st = o["State"] or 0
        m.setdefault(st, {})[o["Value"]] = o["Label"]

    status_map[ent] = m
    log.info("Processed %-20s  states=%d status=%d", ent, len(states), len(statuses))

Path("activity_status_map.json").write_text(
    json.dumps(status_map, ensure_ascii=False, indent=2), encoding="utf-8"
)
log.info("✅  Saved → activity_status_map.json   entities=%d", len(status_map))

# -- also emit a ready‑to‑paste JS snippet -----------------------------------
js_lines = [f"  {ent!r}: {json.dumps(status_map[ent], ensure_ascii=False)}," for ent in status_map]
js_body = ",\n".join(js_lines)

js_snippet = (
    "// Auto‑generated by fetch_status_map.py\n"
    "const activityStatusMap = {\n"
    f"{js_body}\n"
    "};\n"
    "export default activityStatusMap;\n"
)

Path("activity_status_map.js").write_text(js_snippet, encoding="utf-8")
log.info("✅  Saved → activity_status_map.js   (copy into resources.js)")