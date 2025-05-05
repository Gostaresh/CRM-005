class ActivityController {
    constructor(formGenerator) {
      this.formGenerator = formGenerator;
      this.dynamicsService = formGenerator.dynamicsService;
    }
  
    async getCreateActivityPage(req, res, next) {
      try {
        const activityEntities = this.formGenerator.metadataLoader
          .getActivityEntities()
          .map((entity) => {
            // Prefer Persian label (LanguageCode 1065) if available, otherwise fall back to UserLocalizedLabel or LogicalName
            const persianLabel = entity.DisplayName?.LocalizedLabels?.find(
              (label) => label.LanguageCode === 1065
            )?.Label;
            const displayName =
              persianLabel ||
              entity.DisplayName?.UserLocalizedLabel?.Label ||
              entity.LogicalName;
            return {
              logicalName: entity.LogicalName,
              displayName,
            };
          });
  
        if (!req.query.entity) {
          res.render("select_activity", {
            activityEntities,
            title: "ایجاد فعالیت جدید",
            user: req.session.user,
            includeFullCalendar: false,
            pageScripts: [],
            content: undefined,
            errorMessage: activityEntities.length === 0 ? "هیچ نوع فعالیتی یافت نشد. لطفاً با مدیر سیستم تماس بگیرید." : null,
          });
          return;
        }
  
        const entityLogicalName = req.query.entity;
        const entity =
          this.formGenerator.metadataLoader.getEntityByLogicalName(
            entityLogicalName
          );
        if (!entity) {
          return res.status(404).send("Activity entity not found");
        }
  
        const persianLabel = entity.DisplayName?.LocalizedLabels?.find(
          (label) => label.LanguageCode === 1065
        )?.Label;
        const displayName =
          persianLabel ||
          entity.DisplayName?.UserLocalizedLabel?.Label ||
          entity.LogicalName;
  
        const formFields = await this.formGenerator.generateFormFields(
          entityLogicalName,
          req
        );
        res.render("activity_form", {
          entity: {
            logicalName: entity.LogicalName,
            displayName,
          },
          fields: formFields,
          title: `ایجاد ${displayName}`,
          user: req.session.user,
          includeFullCalendar: false,
          pageScripts: [],
          content: undefined,
        });
      } catch (err) {
        next(err);
      }
    }
  
    async createActivity(req, res, next) {
      try {
        const entity = req.params.entity;
        const formData = req.body;
  
        const payload = {};
        for (const [key, value] of Object.entries(formData)) {
          if (value) {
            if (key.endsWith("@odata.bind")) {
              payload[key] = value;
            } else if (value === "on") {
              payload[key] = true;
            } else if (!isNaN(value) && value !== "") {
              payload[key] = Number(value);
            } else {
              payload[key] = value;
            }
          }
        }
  
        await this.dynamicsService.createActivity(req, entity, payload);
        res.redirect("/dashboard");
      } catch (err) {
        next(err);
      }
    }
  }
  
  module.exports = ActivityController;