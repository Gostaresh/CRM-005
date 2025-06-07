#!/usr/bin/env python3
"""
Generate activityTypeToDisplayName.js from activity_sets.json
Keeps the Persian (fa-IR) label stored in activity_sets.json -> .label
"""

import json, textwrap, pathlib

DATA_FILE = pathlib.Path("activity_sets.json")
OUT_FILE  = pathlib.Path("activityTypeToDisplayName.js")

data = json.loads(DATA_FILE.read_text(encoding="utf-8"))

lines = [f"  {k!r}: {v['label']!r}," for k, v in data.items()]

js = textwrap.dedent(
    f"""
    // Auto-generated from activity_sets.json  ({DATA_FILE})
    const activityTypeToDisplayName = {{
    {chr(10).join(lines)}
    }};
    export default activityTypeToDisplayName;
    """
).strip() + "\n"

OUT_FILE.write_text(js, encoding="utf-8")
print(js)
print(f"✅  Saved → {OUT_FILE}  (copy the object into resources.js)")