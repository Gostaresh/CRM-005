# Dynamics 365 Metadata Queries and Field Definitions

This document summarizes the work done to organize and document Dynamics 365 field metadata and queries. It serves as a reference for future development and chat sessions.

## Completed Work

### 1. Example Metadata Files
Created JSON files in `src/core/examples/` containing metadata for various entities:
- `accountStatusMetadata.json` - Account status field metadata
- `contactStatusMetadata.json` - Contact status field metadata
- `departmentStatusMetadata.json` - Department status field metadata
- `activityPointerStatusMetadata.json` - Activity pointer status field metadata

### 2. Field Definitions
Created a comprehensive `resources.js` file (`src/core/resources.js`) containing:
- Common status and state codes
- Entity names
- Field definitions for all entities
- Status codes by entity
- Language codes (English/Persian)
- Localized field display names
- Helper functions for status/state labels

### 3. Documentation
Created a README (`src/core/examples/README.md`) documenting:
- Common status and state fields
- Entity-specific fields and their usage
- Available metadata files
- Important notes about field usage
- Example queries
- Localization support

## Common Queries Used

### 1. Fetching Global Option Set Definitions
```http
GET [Organization URL]/api/data/v9.1/GlobalOptionSetDefinitions?$select=Name,MetadataId,Options&$filter=Name eq 'statuscode'
```

### 2. Entity Status Queries
```http
# Account Status
GET [Organization URL]/api/data/v9.1/accounts?$select=name,statuscode,statecode

# Contact Status
GET [Organization URL]/api/data/v9.1/contacts?$select=fullname,statuscode,statecode

# Department Status
GET [Organization URL]/api/data/v9.1/new_departments?$select=new_name,statuscode,statecode

# Activity Pointer Status
GET [Organization URL]/api/data/v9.1/activitypointers?$select=subject,statuscode,statecode
```

## Key Field Definitions

### Common Fields
All entities share these fields:
- `statecode` - Status (Active/Inactive)
- `statuscode` - Status Reason
- `createdon` - Created Date
- `modifiedon` - Modified Date
- `versionnumber` - Version Number

### Entity-Specific Fields

#### Account
- `name` - Account name
- `new_accountnumber` - Account number
- `new_hesabdaricode` - Hesabdari code
- `new_ohesabdaricode` - Ohesabdari code
- `new_bornahesabdaricode` - Borna hesabdari code
- `new_econumiccode` - Economic code
- `new_nationalidentity` - National ID
- `new_registrationnumber` - Registration number
- `address1_composite` - Full address
- `address1_line1` - Address line 1
- `address1_postalcode` - Postal code
- `telephone1` - Phone number

#### Contact
- `firstname` - First name
- `lastname` - Last name
- `fullname` - Full name
- `emailaddress1` - Email address
- `mobilephone` - Mobile phone
- `jobtitle` - Job title
- `new_departmentid` - Department (lookup)

#### Department
- `new_name` - Department name
- `new_code` - Department code
- `new_description` - Description
- `new_parentdepartmentid` - Parent department (lookup)

#### Activity Pointer
- `activityid` - Activity ID
- `activitytypecode` - Activity type
- `subject` - Subject
- `description` - Description
- `scheduledstart` - Scheduled start
- `scheduledend` - Scheduled end
- `actualstart` - Actual start
- `actualend` - Actual end
- `prioritycode` - Priority
- `instancetypecode` - Instance type

## Status and State Values

### State Codes (Common)
- `0` = Active/Open
- `1` = Inactive/Closed

### Status Codes by Entity

#### Account, Contact, Department
- `1` = Active (when statecode is 0)

#### Activity Pointer
- `2` = In Progress (when statecode is 0)

## Localization Support

All status and state fields support both:
- English (1033)
- Persian (1065)

## Usage Notes

1. All entities have both `statecode` and `statuscode` fields
2. `statecode` is typically Active (0) or Inactive (1)
3. `statuscode` values depend on the `statecode` value
4. Activity entities have more status options than other entities
5. Custom entities (like `new_department`) can be customized
6. System entities (like `activitypointer`) have restrictions

## Next Steps

Potential areas for future work:
1. Add more entity metadata files
2. Expand status code definitions for other entities
3. Add more helper functions in `resources.js`
4. Create additional documentation for specific use cases
5. Add validation rules and business logic documentation
6. Document any custom workflows or processes 