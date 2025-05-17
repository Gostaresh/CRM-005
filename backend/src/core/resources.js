/**
 * Dynamics 365 Field Resources and Constants
 * This file contains field definitions, status codes, and other constants used across the application
 */

// Common Status and State Codes
const StateCode = {
    ACTIVE: 0,
    INACTIVE: 1,
    OPEN: 0,
    CLOSED: 1
};

// Entity Names
const EntityNames = {
    ACCOUNT: 'account',
    CONTACT: 'contact',
    DEPARTMENT: 'new_department',
    ACTIVITY_POINTER: 'activitypointer'
};

// Common Field Names
const CommonFields = {
    STATECODE: 'statecode',
    STATUSCODE: 'statuscode',
    CREATEDON: 'createdon',
    MODIFIEDON: 'modifiedon',
    VERSIONNUMBER: 'versionnumber'
};

// Account Fields
const AccountFields = {
    ...CommonFields,
    NAME: 'name',
    ACCOUNT_NUMBER: 'new_accountnumber',
    HESABDARI_CODE: 'new_hesabdaricode',
    OHESABDARI_CODE: 'new_ohesabdaricode',
    BORNA_HESABDARI_CODE: 'new_bornahesabdaricode',
    ECONOMIC_CODE: 'new_econumiccode',
    NATIONAL_IDENTITY: 'new_nationalidentity',
    REGISTRATION_NUMBER: 'new_registrationnumber',
    ADDRESS_COMPOSITE: 'address1_composite',
    ADDRESS_LINE1: 'address1_line1',
    ADDRESS_POSTALCODE: 'address1_postalcode',
    TELEPHONE: 'telephone1'
};

// Contact Fields
const ContactFields = {
    ...CommonFields,
    FIRST_NAME: 'firstname',
    LAST_NAME: 'lastname',
    FULL_NAME: 'fullname',
    EMAIL: 'emailaddress1',
    MOBILE_PHONE: 'mobilephone',
    JOB_TITLE: 'jobtitle',
    DEPARTMENT_ID: 'new_departmentid'
};

// Department Fields
const DepartmentFields = {
    ...CommonFields,
    NAME: 'new_name',
    CODE: 'new_code',
    DESCRIPTION: 'new_description',
    PARENT_DEPARTMENT_ID: 'new_parentdepartmentid'
};

// Activity Pointer Fields
const ActivityPointerFields = {
    ...CommonFields,
    ACTIVITY_ID: 'activityid',
    ACTIVITY_TYPE_CODE: 'activitytypecode',
    SUBJECT: 'subject',
    DESCRIPTION: 'description',
    SCHEDULED_START: 'scheduledstart',
    SCHEDULED_END: 'scheduledend',
    ACTUAL_START: 'actualstart',
    ACTUAL_END: 'actualend',
    PRIORITY_CODE: 'prioritycode',
    INSTANCE_TYPE_CODE: 'instancetypecode'
};

// Activity Pointer Entity Definition
const ActivityPointer = {
    type: 'activitypointers',
    properties: {
        activityId: 'activityid',
        activityTypeCode: 'activitytypecode',
        subject: 'subject',
        description: 'description',
        scheduledStart: 'scheduledstart',
        scheduledEnd: 'scheduledend',
        actualStart: 'actualstart',
        actualEnd: 'actualend',
        priorityCode: 'prioritycode',
        stateCode: 'statecode',
        statusCode: 'statuscode',
        ownerId: '_ownerid_value',
        createdOn: 'createdon',
        modifiedOn: 'modifiedon'
    },
    expand: {
        ownerId: 'ownerid($select=systemuserid,fullname)'
    }
};

// System User Entity Definition
const SystemUser = {
    type: 'systemusers',
    properties: {
        userId: 'systemuserid',
        fullName: 'fullname'
    }
};

// Status Code Values by Entity
const StatusCodes = {
    [EntityNames.ACCOUNT]: {
        ACTIVE: 1
    },
    [EntityNames.CONTACT]: {
        ACTIVE: 1
    },
    [EntityNames.DEPARTMENT]: {
        ACTIVE: 1
    },
    [EntityNames.ACTIVITY_POINTER]: {
        IN_PROGRESS: 2
    }
};

// Language Codes
const LanguageCodes = {
    ENGLISH: 1033,
    PERSIAN: 1065
};

// Field Display Names (Localized)
const FieldDisplayNames = {
    [CommonFields.STATECODE]: {
        [LanguageCodes.ENGLISH]: 'Status',
        [LanguageCodes.PERSIAN]: 'وضعیت'
    },
    [CommonFields.STATUSCODE]: {
        [LanguageCodes.ENGLISH]: 'Status Reason',
        [LanguageCodes.PERSIAN]: 'دلیل وضعیت'
    }
};

// Helper Functions
const getStatusLabel = (entityName, statusCode, languageCode = LanguageCodes.ENGLISH) => {
    const statusMap = {
        [EntityNames.ACCOUNT]: {
            1: {
                [LanguageCodes.ENGLISH]: 'Active',
                [LanguageCodes.PERSIAN]: 'فعال'
            }
        },
        [EntityNames.CONTACT]: {
            1: {
                [LanguageCodes.ENGLISH]: 'Active',
                [LanguageCodes.PERSIAN]: 'فعال'
            }
        },
        [EntityNames.DEPARTMENT]: {
            1: {
                [LanguageCodes.ENGLISH]: 'Active',
                [LanguageCodes.PERSIAN]: 'فعال'
            }
        },
        [EntityNames.ACTIVITY_POINTER]: {
            2: {
                [LanguageCodes.ENGLISH]: 'In Progress',
                [LanguageCodes.PERSIAN]: 'در حال انجام'
            }
        }
    };

    return statusMap[entityName]?.[statusCode]?.[languageCode] || 'Unknown';
};

const getStateLabel = (stateCode, languageCode = LanguageCodes.ENGLISH) => {
    const stateMap = {
        [StateCode.ACTIVE]: {
            [LanguageCodes.ENGLISH]: 'Active',
            [LanguageCodes.PERSIAN]: 'فعال'
        },
        [StateCode.INACTIVE]: {
            [LanguageCodes.ENGLISH]: 'Inactive',
            [LanguageCodes.PERSIAN]: 'غیرفعال'
        }
    };

    return stateMap[stateCode]?.[languageCode] || 'Unknown';
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
    getStateLabel
}; 