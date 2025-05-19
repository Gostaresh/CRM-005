# Dynamics 365 CRM Integration Project

This project provides integration with Dynamics 365 CRM, focusing on efficient data access, field management, and localization support.

## Project Structure

```
.
├── docs/                           # Documentation
│   └── dynamics365_metadata_queries.md  # Metadata queries and field definitions
├── src/
│   ├── core/                       # Core functionality
│   │   ├── examples/              # Example metadata files
│   │   │   ├── README.md         # Field reference guide
│   │   │   ├── accountStatusMetadata.json
│   │   │   ├── contactStatusMetadata.json
│   │   │   ├── departmentStatusMetadata.json
│   │   │   └── activityPointerStatusMetadata.json
│   │   └── resources.js          # Field definitions and constants
│   └── [other source directories]  # Application-specific code
└── README.md                      # This file
```

## Features

### 1. Field Management

- Comprehensive field definitions for common entities
- Status and state code management
- Support for custom fields
- Field metadata documentation

### 2. Entity Support

Currently supported entities:

- Account
- Contact
- Department (Custom)
- Activity Pointer

### 3. Localization

- Bilingual support (English/Persian)
- Localized field labels
- Status and state translations

### 4. Documentation

- Detailed field reference guide
- Example queries
- Usage notes and best practices
- Metadata query documentation

## Quick Start

### Using Field Definitions

```javascript
import { AccountFields, StatusCodes, getStatusLabel } from "../core/resources";

// Get field name
const accountNameField = AccountFields.NAME;

// Get status code
const activeStatus = StatusCodes[EntityNames.ACCOUNT].ACTIVE;

// Get localized label
const statusLabel = getStatusLabel(
  EntityNames.ACCOUNT,
  1,
  LanguageCodes.PERSIAN
);
```

### Common Queries

```http
# Get account status
GET [Organization URL]/api/data/v9.1/accounts?$select=name,statuscode,statecode

# Get global option sets
GET [Organization URL]/api/data/v9.1/GlobalOptionSetDefinitions?$select=Name,MetadataId,Options
```

```
/home/administrator/CRM-005/deploy.sh
```

## Documentation

### Field Reference

- See `src/core/examples/README.md` for detailed field reference
- Includes all available fields, their types, and usage notes

### Metadata Queries

- See `docs/dynamics365_metadata_queries.md` for:
  - Example queries
  - Field definitions
  - Status codes
  - Localization details

## Development

### Adding New Entities

1. Create metadata file in `src/core/examples/`
2. Add field definitions to `resources.js`
3. Update documentation
4. Add status codes if applicable

### Adding New Fields

1. Update relevant entity section in `resources.js`
2. Add field metadata to example files
3. Update documentation
4. Add any new status codes

## Best Practices

1. **Field Access**

   - Always use field constants from `resources.js`
   - Never hardcode field names
   - Use helper functions for status/state labels

2. **Localization**

   - Always use language codes from `resources.js`
   - Support both English and Persian
   - Use helper functions for translations

3. **Status Management**
   - Use state codes for active/inactive
   - Use status codes for detailed status
   - Check entity-specific status codes

## Contributing

1. Follow the existing code structure
2. Update documentation for any changes
3. Add tests for new functionality
4. Maintain bilingual support

## License

[Your License Here]

## Support

[Your Support Information Here]
