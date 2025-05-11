const axios = require('axios-ntlm');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Configuration
const config = {
    username: 'GOSTARESH//ehsntb',
    password: "Ss12345",
    domain: process.env.D365_DOMAIN || 'GOSTARESH',
    baseUrl: process.env.CRM_URL, // e.g., https://yourorg.crm.dynamics.com
    apiVersion: 'v9.1'
};

// Create axios instance with NTLM authentication
const client = axios.create({
    baseURL: `${config.baseUrl}/api/data/${config.apiVersion}`,
    headers: {
        'Accept': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Content-Type': 'application/json'
    }
});

// Add NTLM authentication
client.defaults.auth = {
    username: config.username,
    password: config.password,
    domain: config.domain
};

async function fetchGlobalOptionSets() {
    try {
        console.log('Fetching GlobalOptionSetDefinitions...');
        
        const response = await client.get('/GlobalOptionSetDefinitions', {
            params: {
                $select: 'Name,MetadataId,OptionSetType,Description,DisplayName,IsCustomizable,IsGlobal,IsManaged,IsCustomOptionSet,IsCustomGlobalOptionSet,Options',
                $orderby: 'Name'
            }
        });

        // Create examples directory if it doesn't exist
        const examplesDir = path.join(__dirname, '../src/core/examples');
        try {
            await fs.mkdir(examplesDir, { recursive: true });
        } catch (err) {
            if (err.code !== 'EEXIST') throw err;
        }

        // Save the response to a JSON file
        const outputPath = path.join(examplesDir, 'globalOptionSets.json');
        await fs.writeFile(
            outputPath,
            JSON.stringify(response.data, null, 2),
            'utf8'
        );

        console.log(`Successfully saved GlobalOptionSetDefinitions to ${outputPath}`);
        console.log(`Total option sets fetched: ${response.data.value.length}`);

        // Log some basic statistics
        const stats = {
            total: response.data.value.length,
            custom: response.data.value.filter(set => set.IsCustomOptionSet).length,
            global: response.data.value.filter(set => set.IsGlobal).length,
            managed: response.data.value.filter(set => set.IsManaged).length
        };
        console.log('\nStatistics:');
        console.log(JSON.stringify(stats, null, 2));

    } catch (error) {
        console.error('Error fetching GlobalOptionSetDefinitions:');
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

// Run the script
fetchGlobalOptionSets(); 