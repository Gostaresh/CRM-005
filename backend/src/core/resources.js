/**
 * Dynamics 365 Field Resources and Constants
 * This file contains field definitions, status codes, and other constants used across the application
 */

// Activity State Codes (Task / ActivityPointer)
const StateCode = {
  OPEN: 0, // فعال / در حال انجام
  COMPLETED: 1, // تکمیل شده
  SCHEDULED: 2, // زمان‌بندی شده
  CANCELED: 3, // لغو شده
};

// Entity Names
const EntityNames = {
  ACCOUNT: "account",
  CONTACT: "contact",
  DEPARTMENT: "new_department",
  ACTIVITY_POINTER: "activitypointer",
};

// Common Field Names
const CommonFields = {
  STATECODE: "statecode",
  STATUSCODE: "statuscode",
  CREATEDON: "createdon",
  MODIFIEDON: "modifiedon",
  VERSIONNUMBER: "versionnumber",
};

// Account Fields
const AccountFields = {
  ...CommonFields,
  NAME: "name",
  ACCOUNT_NUMBER: "new_accountnumber",
  HESABDARI_CODE: "new_hesabdaricode",
  OHESABDARI_CODE: "new_ohesabdaricode",
  BORNA_HESABDARI_CODE: "new_bornahesabdaricode",
  ECONOMIC_CODE: "new_econumiccode",
  NATIONAL_IDENTITY: "new_nationalidentity",
  REGISTRATION_NUMBER: "new_registrationnumber",
  ADDRESS_COMPOSITE: "address1_composite",
  ADDRESS_LINE1: "address1_line1",
  ADDRESS_POSTALCODE: "address1_postalcode",
  TELEPHONE: "telephone1",
};

// Contact Fields
const ContactFields = {
  ...CommonFields,
  FIRST_NAME: "firstname",
  LAST_NAME: "lastname",
  FULL_NAME: "fullname",
  EMAIL: "emailaddress1",
  MOBILE_PHONE: "mobilephone",
  JOB_TITLE: "jobtitle",
  DEPARTMENT_ID: "new_departmentid",
};

// Department Fields
const DepartmentFields = {
  ...CommonFields,
  NAME: "new_name",
  CODE: "new_code",
  DESCRIPTION: "new_description",
  PARENT_DEPARTMENT_ID: "new_parentdepartmentid",
};

// Activity Pointer Fields
const ActivityPointerFields = {
  ...CommonFields,
  ACTIVITY_ID: "activityid",
  ACTIVITY_TYPE_CODE: "activitytypecode",
  SUBJECT: "subject",
  DESCRIPTION: "description",
  SCHEDULED_START: "scheduledstart",
  SCHEDULED_END: "scheduledend",
  ACTUAL_START: "actualstart",
  ACTUAL_END: "actualend",
  PRIORITY_CODE: "prioritycode",
  INSTANCE_TYPE_CODE: "instancetypecode",
};

// Activity Pointer Entity Definition
const ActivityPointer = {
  type: "activitypointers",
  properties: {
    activityId: "activityid",
    activityTypeCode: "activitytypecode",
    subject: "subject",
    description: "description",
    scheduledStart: "scheduledstart",
    scheduledEnd: "scheduledend",
    actualStart: "actualstart",
    actualEnd: "actualend",
    priorityCode: "prioritycode",
    stateCode: "statecode",
    statusCode: "statuscode",
    ownerId: "_ownerid_value",
    createdOn: "createdon",
    modifiedOn: "modifiedon",
  },
  expand: {
    ownerId: "ownerid($select=systemuserid,fullname)",
  },
};

// System User Entity Definition
const SystemUser = {
  type: "systemusers",
  properties: {
    userId: "systemuserid",
    fullName: "fullname",
  },
};

// Status Code Values by Entity
const StatusCodes = {
  [EntityNames.ACCOUNT]: {
    ACTIVE: 1,
  },
  [EntityNames.CONTACT]: {
    ACTIVE: 1,
  },
  [EntityNames.DEPARTMENT]: {
    ACTIVE: 1,
  },
  [EntityNames.ACTIVITY_POINTER]: {
    IN_PROGRESS: 2,
  },
};

// Language Codes
const LanguageCodes = {
  ENGLISH: 1033,
  PERSIAN: 1065,
};

// Field Display Names (Localized)
const FieldDisplayNames = {
  [CommonFields.STATECODE]: {
    [LanguageCodes.ENGLISH]: "Status",
    [LanguageCodes.PERSIAN]: "وضعیت",
  },
  [CommonFields.STATUSCODE]: {
    [LanguageCodes.ENGLISH]: "Status Reason",
    [LanguageCodes.PERSIAN]: "دلیل وضعیت",
  },
};

// Map Activity logical name → Entity Type Code (ETC)
const activityTypeToEtc = {
  task: 4212,
  phonecall: 4210,
  appointment: 4201,
  email: 4202,
  fax: 4204,
  letter: 4207,
  socialactivity: 4216,
  serviceappointment: 4214,
  incidentresolution: 4206,
  opportunityclose: 4208,
  quoteclose: 4211,
  orderclose: 4209,
  recurringappointmentmaster: 4251,
  campaignresponse: 4401,
  campaignactivity: 4402,
  bulkoperation: 4406,
  untrackedemail: 4220,
  // ── Custom activity entities ──
  new_sms: 10001,
  new_takhfif: 10008,
  new_morakhasi: 10009,
  new_pardakht: 10010,
  new_daryaft: 10011,
  new_peigirihesab: 10012,
  new_mosaedeh: 10013,
  new_dissatisfaction: 10026,
  new_pilotfollowing: 10024,
  new_carditinception: 10025,
  new_downtrendcustomer: 10074,
  new_returncustomer: 10073,
  new_urgentfollowup: 10146,
  new_testactivity: 10298,
  new_receiptpaymentapproval: 10303,
  new_customerlostfollowup: 10068,
  new_assembly: 10007,
};
// Map Activity logical name → MetadataId (GUID)
// Generated from GET EntityDefinitions?$filter=IsActivity eq true
const activityTypeToMetadataId = {
  task: "78e45d5e-f22b-4e20-813f-6cd2a3777968",
  phonecall: "21538890-1e54-4171-aca8-7ec97a9c652c",
  appointment: "95e930c5-812a-44e8-85c9-154cd5f59465",
  email: "95ae88b3-cc0c-45ac-a2db-655dceec238b",
  fax: "58d4edef-1ea8-4796-939b-9c37db3d2deb",
  letter: "ebf2fb01-f630-4564-950e-79161bd655c9",
  socialactivity: "e0a50003-7062-42ab-8a74-95eeec03c13e",
  serviceappointment: "b9399b55-f032-4104-a8ca-6b0f9a083e32",
  incidentresolution: "bceb9f02-968e-4363-beb0-ad7ecdef4908",
  opportunityclose: "dc22c553-5e16-45d3-8842-d142bef3877e",
  quoteclose: "f58ee955-da78-4e95-8608-01e0092fd684",
  orderclose: "89fefcf4-6eec-4bb4-bfb0-87dfb9bb9930",
  recurringappointmentmaster: "e4796c89-bd47-4413-a5ff-92959ac3a3e0",
  campaignresponse: "a8c1e72a-90ac-46fa-9bf5-465097edd021",
  campaignactivity: "87e909a7-e378-407e-92f2-2dab2a6b7ca6",
  bulkoperation: "b237ecf9-e361-41cd-bce7-52bbd74eba0c",
  untrackedemail: "c000abde-7474-4013-8887-203e3c9ab55f",
  // ── Custom activity entities ──
  new_sms: "e91b6b95-5aa5-e311-b725-000c2991133d",
  new_takhfif: "850fa378-ab27-e411-967e-000c2991133d",
  new_morakhasi: "bf0030cd-3528-e411-967e-000c2991133d",
  new_pardakht: "b9b6e607-602b-e411-967e-000c2991133d",
  new_daryaft: "39dbdc20-8e2b-e411-967e-000c2991133d",
  new_peigirihesab: "3a54934e-ed38-e411-8166-000c2991133d",
  new_mosaedeh: "3daaef56-f5e8-e411-b8ec-000c295a3e9a",
  new_dissatisfaction: "06fd5e8e-94bf-e611-8397-000c295a3e9a",
  new_pilotfollowing: "042f1bc4-5f5f-e511-8c28-000c295a3e9a",
  new_carditinception: "588adda4-f58c-e511-a091-000c295a3e9a",
  new_downtrendcustomer: "8384568d-87a9-ea11-80c5-000c297c67a0",
  new_returncustomer: "9ac95ba1-84a9-ea11-80c5-000c297c67a0",
  new_urgentfollowup: "d5a9835d-60a9-ee11-a749-000c29df2e7d",
  new_testactivity: "05482148-e927-f011-ac55-000c299c9756",
  new_receiptpaymentapproval: "50053e7a-f23e-f011-ac5c-000c299c9756",
  new_customerlostfollowup: "c6605685-0d15-ea11-8119-000c29df652b",
  new_assembly: "13cc8abf-9326-e411-967e-000c2991133d",
};

// Helper Functions
const getStatusLabel = (
  entityName,
  statusCode,
  languageCode = LanguageCodes.ENGLISH
) => {
  const statusMap = {
    [EntityNames.ACCOUNT]: {
      1: {
        [LanguageCodes.ENGLISH]: "Active",
        [LanguageCodes.PERSIAN]: "فعال",
      },
    },
    [EntityNames.CONTACT]: {
      1: {
        [LanguageCodes.ENGLISH]: "Active",
        [LanguageCodes.PERSIAN]: "فعال",
      },
    },
    [EntityNames.DEPARTMENT]: {
      1: {
        [LanguageCodes.ENGLISH]: "Active",
        [LanguageCodes.PERSIAN]: "فعال",
      },
    },
    [EntityNames.ACTIVITY_POINTER]: {
      2: {
        [LanguageCodes.ENGLISH]: "In Progress",
        [LanguageCodes.PERSIAN]: "در حال انجام",
      },
    },
  };

  return statusMap[entityName]?.[statusCode]?.[languageCode] || "Unknown";
};

const getStateLabel = (stateCode, languageCode = LanguageCodes.ENGLISH) => {
  const stateMap = {
    [StateCode.OPEN]: {
      [LanguageCodes.ENGLISH]: "Open",
      [LanguageCodes.PERSIAN]: "باز",
    },
    [StateCode.COMPLETED]: {
      [LanguageCodes.ENGLISH]: "Completed",
      [LanguageCodes.PERSIAN]: "تکمیل شده",
    },
    [StateCode.SCHEDULED]: {
      [LanguageCodes.ENGLISH]: "Scheduled",
      [LanguageCodes.PERSIAN]: "زمان‌بندی شده",
    },
    [StateCode.CANCELED]: {
      [LanguageCodes.ENGLISH]: "Canceled",
      [LanguageCodes.PERSIAN]: "لغو شده",
    },
  };

  return stateMap[stateCode]?.[languageCode] || "Unknown";
};

// Export all as a single object
module.exports = {
  StateCode,
  EntityNames,
  CommonFields,
  AccountFields,
  ContactFields,
  DepartmentFields,
  ActivityPointerFields,
  ActivityPointer,
  SystemUser,
  StatusCodes,
  LanguageCodes,
  FieldDisplayNames,
  getStatusLabel,
  getStateLabel,
  activityTypeToEtc,
  activityTypeToMetadataId,
};
