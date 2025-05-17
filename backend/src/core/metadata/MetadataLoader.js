const fs = require("fs");
const path = require("path");
const logger = require("../../utils/logger");

class MetadataLoader {
  constructor(metadataPaths) {
    this.metadataPaths = metadataPaths;
    this.entities = null;
    this.optionSets = null;
    this.relationships = null;
  }

  load() {
    try {
      const entitiesPath = path.join(
        process.cwd(),
        this.metadataPaths.entities
      );
      console.log(`Loading entities from: ${entitiesPath}`);
      this.entities = JSON.parse(fs.readFileSync(entitiesPath));
      logger
        .debug
        // `Loaded entities: ${JSON.stringify(this.entities.value, null, 2)}`
        ();

      const optionSetsPath = path.join(
        process.cwd(),
        this.metadataPaths.optionSets
      );
      // console.log(`Loading option sets from: ${optionSetsPath}`);
      this.optionSets = JSON.parse(fs.readFileSync(optionSetsPath));

      const relationshipsPath = path.join(
        process.cwd(),
        this.metadataPaths.relationships
      );
      // console.log(`Loading relationships from: ${relationshipsPath}`);
      this.relationships = JSON.parse(fs.readFileSync(relationshipsPath));
    } catch (err) {
      console.error(`Failed to load metadata: ${err.message}`);
      logger.error(`Failed to load metadata: ${err.message}`);
      throw new Error(`Failed to load metadata: ${err.message}`);
    }
  }

  getEntities() {
    if (!this.entities || !this.entities.value) {
      console.warn("Entities not loaded or empty");
      logger.warn("Entities not loaded or empty");
      return [];
    }
    return this.entities.value;
  }

  getOptionSets() {
    return this.optionSets.value;
  }

  getRelationships() {
    return this.relationships.value;
  }

  getActivityEntities() {
    const entities = this.getEntities();
    // console.log(`Total entities loaded: ${entities.length}`);
    // logger.debug(`All entities: ${JSON.stringify(entities, null, 2)}`);

    // Temporarily include all entities as activity entities for debugging
    const activityEntities = entities.map((entity) => {
      console.log(
        `Including entity as activity for debugging: ${entity.LogicalName}`
      );
      return entity;
    });

    console.log(`Found ${activityEntities.length} activity entities`);
    logger.debug(
      `Activity entities: ${JSON.stringify(activityEntities, null, 2)}`
    );
    return activityEntities;
  }

  getEntityByLogicalName(logicalName) {
    return this.getEntities().find(
      (entity) => entity.LogicalName === logicalName
    );
  }

  getOptionSet(entityLogicalName, attributeLogicalName) {
    const entity = this.getEntityByLogicalName(entityLogicalName);
    if (!entity) return [];

    const attribute = entity.Attributes.find(
      (a) => a.LogicalName === attributeLogicalName
    );
    if (attribute && attribute.AttributeType === "Picklist") {
      if (attribute.OptionSet && attribute.OptionSet.Options) {
        return attribute.OptionSet.Options;
      }
      const optionSet = this.getOptionSets().find(
        (os) => os.Name === attribute.OptionSet?.Name
      );
      return optionSet ? optionSet.Options : [];
    }
    return [];
  }
}

module.exports = MetadataLoader;
