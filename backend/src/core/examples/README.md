# Dynamics 365 Field Names Reference

This directory contains example metadata files for various Dynamics 365 entities. Below is a quick reference guide for the field names and their usage.

## Common Status and State Fields

All entities use these standard fields for status tracking:

### State Code (`statecode`)
- **Logical Name**: `statecode`
- **Type**: State
- **Common Values**:
  - `0` = Active/Open
  - `1` = Inactive/Closed

### Status Code (`statuscode`)
- **Logical Name**: `statuscode`
- **Type**: Status
- **Values vary by entity** (see entity-specific sections below)

## Entity-Specific Fields

### Account Entity
- **Entity Name**: `account`
- **Status Field**: `statuscode`
- **Status Values**:
  - `1` = Active (when statecode is 0)
- **Other Common Fields**:
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

### Contact Entity
- **Entity Name**: `contact`
- **Status Field**: `statuscode`
- **Status Values**:
  - `1` = Active (when statecode is 0)
- **Other Common Fields**:
  - `firstname` - First name
  - `lastname` - Last name
  - `fullname` - Full name
  - `emailaddress1` - Email address
  - `mobilephone` - Mobile phone
  - `jobtitle` - Job title
  - `new_departmentid` - Department (lookup)

### Department Entity
- **Entity Name**: `new_department`
- **Status Field**: `statuscode`
- **Status Values**:
  - `1` = Active (when statecode is 0)
- **Other Common Fields**:
  - `new_name` - Department name
  - `new_code` - Department code
  - `new_description` - Description
  - `new_parentdepartmentid` - Parent department (lookup)

### Activity Pointer Entity
- **Entity Name**: `activitypointer`
- **Status Field**: `statuscode`
- **Status Values**:
  - `2` = In Progress (when statecode is 0)
- **Other Common Fields**:
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

## Metadata Files

This directory contains the following metadata files:
- `accountStatusMetadata.json` - Account status field metadata
- `contactStatusMetadata.json` - Contact status field metadata
- `departmentStatusMetadata.json` - Department status field metadata
- `activityPointerStatusMetadata.json` - Activity pointer status field metadata

## Important Notes

1. All entities have both `statecode` and `statuscode` fields
2. `statecode` is typically Active (0) or Inactive (1)
3. `statuscode` values depend on the `statecode` value
4. Activity entities have more status options than other entities
5. Custom entities (like `new_department`) can be customized, while system entities (like `activitypointer`) have restrictions

## Usage in Queries

When querying these fields in Dynamics 365 Web API:

```http
GET [Organization URL]/api/data/v9.1/accounts?$select=name,statuscode,statecode
GET [Organization URL]/api/data/v9.1/contacts?$select=fullname,statuscode,statecode
GET [Organization URL]/api/data/v9.1/new_departments?$select=new_name,statuscode,statecode
GET [Organization URL]/api/data/v9.1/activitypointers?$select=subject,statuscode,statecode
```

## Localization

All status and state fields support both English (1033) and Persian (1065) languages in the metadata. 