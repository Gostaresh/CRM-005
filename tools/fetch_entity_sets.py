#!/usr/bin/env python3
"""
fetch_entity_sets.py  –  Dynamics 365 on-prem v9.1 helper

* Reads NTLM creds + CRM_URL from env vars (or prompts interactively)
* Calls:
    GET <CRM_URL>/api/data/v9.1/EntityDefinitions
        ?$select=LogicalName,EntitySetName,DisplayName
        &$filter=IsActivity eq true
* Picks DisplayName.UserLocalizedLabel whose LanguageCode == 1065 (Farsi)
  – falls back to English (1033) if Persian not present
* Saves result to ./activity_sets.json
"""
import json, os, getpass, sys
import requests
from requests_ntlm import HttpNtlmAuth

CRM_URL = os.getenv("CRM_URL") or input("CRM URL (e.g. https://crm.local): ").strip()
USERNAME = os.getenv("CRM_USER") or input("DOMAIN\\user: ").strip()
PASSWORD = os.getenv("CRM_PASS") or getpass.getpass("Password: ")

ENDPOINT = (
    f"{CRM_URL.rstrip('/')}/api/data/v9.1/"
    "EntityDefinitions?$select=LogicalName,EntitySetName,DisplayName"
    "&$filter=IsActivity%20eq%20true"
)

print("Calling:", ENDPOINT)
resp = requests.get(
    ENDPOINT,
    auth=HttpNtlmAuth(*USERNAME.split("\\", 1), PASSWORD),
    headers={"Accept": "application/json"},
    verify=False,  # self-signed HTTPS on many on-prem installs
    timeout=60,
)
resp.raise_for_status()
data = resp.json()["value"]

result = {}
for ent in data:
    logical = ent["LogicalName"]
    setname = ent["EntitySetName"]
    metadataId = ent["MetadataId"]
    labels = ent["DisplayName"]["LocalizedLabels"]
    # find Persian 1065, else English 1033, else first label
    label = next(
        (l["Label"] for l in labels if l["LanguageCode"] == 1065),
        next(
            (l["Label"] for l in labels if l["LanguageCode"] == 1033),
            labels[0]["Label"],
        ),
    )
    result[logical] = {"set": setname, "label": label, "MetadataId": metadataId}

with open("activity_sets.json", "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print("Saved → activity_sets.json  (entries:", len(result), ")")