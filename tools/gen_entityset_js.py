#!/usr/bin/env python3
"""
Generate activityTypeToEntitySet.js from activity_sets.json
Run in the same folder as activity_sets.json
"""
import json, textwrap, pathlib

DATA_FILE = pathlib.Path("activity_sets.json")
OUT_FILE  = pathlib.Path("activityTypeToEntitySet.js")

data = json.loads(DATA_FILE.read_text(encoding="utf-8"))

lines = [f"  {k!r}: {v['set']!r}," for k, v in data.items()]

js = textwrap.dedent(
    f"""
    // Auto-generated from activity_sets.json  ({DATA_FILE})
    const activityTypeToEntitySet = {{
    {chr(10).join(lines)}
    }};
    export default activityTypeToEntitySet;
    """
).strip() + "\n"

OUT_FILE.write_text(js, encoding="utf-8")
print(js)
print(f"\n✅  Saved → {OUT_FILE}  (copy the object into resources.js)")