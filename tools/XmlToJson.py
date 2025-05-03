import xmltodict
import json

# Read the XML file
with open('data/xmlmetadata.xml', 'r', encoding='utf-8') as file:
    xml_data = file.read()

# Parse XML to dict
xml_dict = xmltodict.parse(xml_data)

# Convert dict to JSON
json_data = json.dumps(xml_dict, indent=2)

# Save to file
with open('data/jsonmetadata.json', 'w', encoding='utf-8') as file:
    file.write(json_data)

print("Metadata converted to JSON and saved to dynamics_metadata.json")