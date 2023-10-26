async function main() {

    let config = input.config();
    let rephonic_url = config["REPHONIC_URL"];
    try {

        let keyword = config["KEYWORD"];
        let client = config["CLIENT"];
        let clientId = await getClientId(client);
        let slug = getSlug(rephonic_url);

        let firstData = await makeFirstRequest(slug);
        if (!firstData) return;
        console.log("First request data:", firstData);

        let secondData = await makeSecondRequest(firstData);
        if (!secondData) return;
        console.log("Second request data:", secondData.data);

        console.log("mysql ID:", secondData.data.mysql.mysql_id);
        const podcast_id_airtable = secondData.data.airtable;
        console.log("Podcast ID:", podcast_id_airtable);

        const exists = await podcastExistsInAirtable(podcast_id_airtable, rephonic_url);
        if (!exists) {
            console.log("Exiting because podcast ID does not exist in Airtable.");
            return;
        }

        let podcastData = await getPodcastData(secondData.data.mysql.mysql_id);
        if (!podcastData) return;
        console.log("Podcast data:", podcastData);

        await makeThirdRequest(keyword, clientId, podcastData);
        console.log("Third request successful");
    } catch (error) {
        console.error("An error occurred:", error);
    }
}

async function podcastExistsInAirtable(podcast_id_airtable, rephonic_url) {
    console.log("Checking if podcast ID exists in Airtable:", podcast_id_airtable);
    let table = base.getTable("Podcasts");

    let queryResult = await table.selectRecordsAsync({ fields: ["podcast_record_ID", "Podcast_Name_uq"] });

    let filteredRecord = queryResult.records.find(record => {
        return record.getCellValue("podcast_record_ID") === podcast_id_airtable;
    });

    if (filteredRecord) {
        let podcastName = filteredRecord.getCellValue("Podcast_Name_uq");
        let podcastRecordID = filteredRecord.getCellValue("podcast_record_ID");

        console.log("podcastRecordID: ", podcastRecordID);
        console.log("rephonic_url: ", rephonic_url);

        updateLinkPodcast(rephonic_url, podcastRecordID);
    } else {
        console.log('Record not found');
    }

    if (query.records.length > 0) {
        console.log("Podcast ID found in Airtable.");
        return true;
    } else {
        console.log("Podcast ID not found in Airtable.");
        return false;
    }
}

async function updateLinkPodcast(rephonicURL, podcastRecordID) {
    console.log('Updating LINK_PODCAST field for record with URL:', rephonicURL);
    console.log('New value for LINK_PODCAST:', podcastRecordID);

    let addFromRephonicTable = base.getTable("ADDFROMREPHONIC");

    let queryResultForAddFromRephonic;
    try {
        queryResultForAddFromRephonic = await addFromRephonicTable.selectRecordsAsync({
            fields: ["URL", "LINK_PODCAST"]
        });
    } catch (error) {
        console.error("Error during query:", error);
        return false;
    }

    if (!queryResultForAddFromRephonic) {
        console.error("Query result is undefined");
        return false;
    }

    console.log('Query Result:', queryResultForAddFromRephonic);

    let recordToUpdate = queryResultForAddFromRephonic.records.find(record => {
        return record.getCellValue("URL") === rephonicURL;
    });

    if (recordToUpdate) {
        console.log('Found record to update:', recordToUpdate);
        console.log('Current value of LINK_PODCAST:', recordToUpdate.getCellValue("LINK_PODCAST"));

        try {
            console.log('Updating with:', [
                {
                    id: recordToUpdate.id,
                    fields: {
                        "LINK_PODCAST": [{ id: podcastRecordID }]
                    }
                }
            ]);

            let lastModifiedBy = recordToUpdate.getCellValue("Last Modified By");
            console.log("Last Modified By:", lastModifiedBy);

            console.log("Collaborators:", base.activeCollaborators);

            const updateResponse = await addFromRephonicTable.updateRecordAsync(recordToUpdate.id, {
                "LINK_PODCAST": [{ id: podcastRecordID }]
            });

            console.log('Update Response:', updateResponse);
            return true;
        } catch (error) {
            console.error('Full Error Object:', JSON.stringify(error, null, 2));
            return false;
        }
    } else {
        console.log('Record not found in ADDFROMREPHONIC table');
        return false;
    }
}

async function getClientId(client) {
    let table = base.getTable("Clients");
    let query = await table.selectRecordsAsync({
        fields: table.fields,
        filterByFormula: `{Client_Name} = "${client}"`
    });

    if (query.records.length > 0) {
        let clientRecord = query.records[0];
        console.log("Found client:", clientRecord);
        return clientRecord.id;
    } else {
        console.log("Client not found.");
        return null;
    }
}

function getSlug(rephonic_url) {
    const regex = /https:\/\/rephonic\.com\/podcasts\/(.+)$/;
    const match = rephonic_url.match(regex);
    return match && match[1] ? match[1] : null;
}

async function makeFirstRequest(slug) {
    let urlBase = "https://hook.eu1.make.com/e2kdluvcc7k5wvx0at2u50k7r5rv7tcz";
    let body1 = {
        "type": "id",
        "perPage": "50",
        "rephonicUrl": `https://rephonic.com/podcasts/${slug}`
    };
    let response = await fetch(urlBase, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body1)
    });

    let responseBodyAsText = await response.text();

    if (response.ok) {
        try {
            return JSON.parse(responseBodyAsText);
        } catch (error) {
            console.error("Failed to parse JSON:", error);
            return null;
        }
    } else {
        console.error(`Received a non-OK status code ${response.status}`);
        return null;
    }
}

async function makeSecondRequest(firstData) {
    let urlBase2 = "https://hook.eu1.make.com/jmx12ljc24tf7v0lsuy26dg4a48ht6lm";
    let body2 = {
        "data": firstData,
        "podcast_id": firstData.podcast.id
    };
    let response = await fetch(urlBase2, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body2)
    });

    let responseBodyAsText = await response.text();
    console.log("Second request response text:", responseBodyAsText);
    console.log("Type of response:", typeof responseBodyAsText);

    if (response.ok) {
        try {
            const intermediateParse = JSON.parse(responseBodyAsText);
            console.log("Intermediate Parse:", intermediateParse);

            const parsedData = JSON.parse(intermediateParse);
            console.log("Parsed data:", parsedData);

            return parsedData;
        } catch (error) {
            console.error("Failed to parse JSON:", error);
            return null;
        }
    } else {
        console.error(`Received a non-OK status code ${response.status}`);
        return null;
    }
}

async function getPodcastData(mysql_id) {
    let getUrlBase = `https://hook.eu1.make.com/qawqahizznjkng8qpahokfx8n8voe2yh?mysql_id=${mysql_id}`;
    let response = await fetch(getUrlBase);
    let responseBodyAsText = await response.text();
    console.log("Third request response text:", responseBodyAsText);

    try {
        return JSON.parse(responseBodyAsText);
    } catch (error) {
        console.error("Failed to parse JSON:", error);
        return null;
    }
}

async function makeThirdRequest(keyword, clientId, podcastData) {
    let urlBase3 = "https://hook.eu1.make.com/hj1xdtclaug2te2mfgs4wozylbrjfxgl";
    let params = new URLSearchParams({
        "query": keyword,
        "clientid": clientId,
        "podcastid": podcastData.podcast_record_id,
        "appleid": podcastData.podcast_apple_id
    }).toString();

    let response = await fetch(`${urlBase3}?${params}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    let responseBodyAsText = await response.text();
    console.log("Fourth request response text:", responseBodyAsText);

    if (response.status === 200) {
        console.log("Third request successful, status 200");
    } else {
        console.error(`Third request failed, status ${response.status}`);
    }
}

main();
