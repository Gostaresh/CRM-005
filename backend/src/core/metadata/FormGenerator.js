class FormGenerator {
  constructor(metadataLoader, dynamicsService) {
    this.metadataLoader = metadataLoader;
    this.dynamicsService = dynamicsService;
  }

  async generateFormFields(entityLogicalName, req) {
    const entity =
      this.metadataLoader.getEntityByLogicalName(entityLogicalName);
    if (!entity) {
      throw new Error("Entity not found");
    }

    // Generate form fields from attributes
    let formFields = entity.Attributes.filter(
      (attr) =>
        !["activityid", "createdon", "modifiedon", "ownerid"].includes(
          attr.LogicalName
        ) &&
        attr.AttributeType !== "Uniqueidentifier" &&
        attr.AttributeType !== "EntityReference"
    ).map((attr) => {
      let field = {
        logicalName: attr.LogicalName,
        displayName:
          attr.DisplayName?.UserLocalizedLabelName || attr.LogicalName,
        type: attr.AttributeType,
        required: attr.IsRequired || false,
        inputType: "",
      };

      switch (attr.AttributeType) {
        case "String":
        case "Memo":
          field.inputType =
            attr.AttributeType === "String" ? "text" : "textarea";
          break;
        case "DateTime":
          field.inputType = "datetime-local";
          break;
        case "Boolean":
          field.inputType = "checkbox";
          break;
        case "Picklist":
          field.inputType = "select";
          field.options = this.metadataLoader.getOptionSet(
            entityLogicalName,
            attr.LogicalName
          );
          break;
        case "Integer":
        case "Decimal":
          field.inputType = "number";
          break;
        default:
          field.inputType = "text";
      }

      return field;
    });

    // Add regardingobjectid field for activities with Account relationship
    const relationships = this.metadataLoader.getRelationships();
    const accountRelationship = relationships.find(
      (rel) =>
        rel.ReferencingEntity === entityLogicalName &&
        rel.ReferencedEntity === "account" &&
        rel.ReferencingAttribute === "regardingobjectid"
    );
    if (accountRelationship) {
      const accounts = await this.dynamicsService.getAccounts(req);
      formFields.push({
        logicalName: "regardingobjectid",
        displayName: "Regarding Account",
        type: "EntityReference",
        required: false,
        inputType: "select",
        options: accounts.value.map((a) => ({
          Value: a.accountid,
          Label: { UserLocalizedLabelName: a.name },
        })),
      });
    }

    return formFields;
  }
}

module.exports = FormGenerator;
