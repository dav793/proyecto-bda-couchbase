require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const moment = require('moment');
const { parse: csvParser } = require("csv-parse");

const dbUsername = 'Administrator';
const dbPassword = '12345678';

async function getFilesList(path) {
    return new Promise((resolve, reject) => {
        fs.readdir(path, (err, files) => {
            if (err)
                reject(err);
            else
                resolve(files);
        });
    });
};

async function csvStream(filename) {
    const readStream = fs.createReadStream(filename)
        .pipe( 
            csvParser({columns: false}) 
        );

    const parsed = [];
    for await (const chunk of readStream) {
        parsed.push(chunk);
    }
    return parsed;
}

async function postRequest(url, body, username, password) {
    try {
        return await axios.post(url, body, {
            headers: {
                Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
            }
        });
    }
    catch (err) {
        console.error(err);
        return err;
    }
}

const delay = (t, val) => new Promise(resolve => setTimeout(resolve, t, val));

async function importSourceFiles() {
    const path_magACRF = path.join(__dirname, '..', process.env.IMPORTER_SOURCE_FILES_DIR_MAG);
    const path_sac = path.join(__dirname, '..', process.env.IMPORTER_SOURCE_FILES_DIR_SAC);
    const path_irradiance_xrsa1 = path.join(__dirname, '..', process.env.IMPORTER_SOURCE_FILES_DIR_XR);
    const filesMag = await getFilesList(path_magACRF);
    const filesSac = await getFilesList(path_sac);
    const filesXr = await getFilesList(path_irradiance_xrsa1);

    // parse files - mag
    const parseTasksMag = async () => {
        const results = await Promise.all(
            filesMag.map(filename => csvStream( path.join(path_magACRF, filename) ))
        );
        return results;
    };
    const resultsMag = await parseTasksMag();

    // parse files - sac
    const parseTasksSac = async () => {
        const results = await Promise.all(
            filesSac.map(filename => csvStream( path.join(path_sac, filename) ))
        );
        return results;
    };
    const resultsSac = await parseTasksSac();

    // parse files - xr
    const parseTasksXr = async () => {
        const results = await Promise.all(
            filesXr.map(filename => csvStream( path.join(path_irradiance_xrsa1, filename) ))
        );
        return results;
    };
    const resultsXr = await parseTasksXr();

    // create docs - mag
    const docsMag = filesMag.map((filename, idx) => {
        const str = filename.replace('total_mag_ACRF_', '');
        const tokens = [];
        tokens.push(str.substring(0, 2));   // year
        tokens.push(str.substring(2, 4));   // month
        tokens.push(str.substring(4, 6));   // day
        tokens.push(str.substring(7, 9));   // hours
        tokens.push(str.substring(9, 11));  // minutes
        tokens.push('00');                  // seconds

        const date = moment(`20${tokens[0]}/${tokens[1]}/${tokens[2]} ${tokens[3]}:${tokens[4]}:${tokens[5]}`, 'YYYY/MM/DD H:mm:ss');

        const doc = {
            id: idx,
            timestamp: date.toISOString(),
            reports: resultsMag[idx].map((parsed, idxReport) => ({
                number: idxReport,
                samples: parsed.map(value => parseFloat(value))
            }))
        };

        return doc;
    });

    // create docs - sac
    const docsSac = filesSac.map((filename, idx) => {
        const str = filename.replace('solar_array_current_', '');
        const tokens = [];
        tokens.push(str.substring(0, 2));   // year
        tokens.push(str.substring(2, 4));   // month
        tokens.push(str.substring(4, 6));   // day
        tokens.push(str.substring(7, 9));   // hours
        tokens.push(str.substring(9, 11));  // minutes
        tokens.push('00');                  // seconds

        const date = moment(`20${tokens[0]}/${tokens[1]}/${tokens[2]} ${tokens[3]}:${tokens[4]}:${tokens[5]}`, 'YYYY/MM/DD H:mm:ss');

        const doc = {
            id: idx,
            timestamp: date.toISOString(),
            reports: resultsSac[idx].map((parsed, idxReport) => ({
                number: idxReport,
                samplesArray0: parseFloat(parsed[0]),
                samplesArray1: parseFloat(parsed[1]),
                samplesArray2: parseFloat(parsed[2]),
                samplesArray3: parseFloat(parsed[3])
            }))
        };

        return doc;
    });

    // create docs - xr
    const docsXr = filesXr.map((filename, idx) => {
        const str = filename.replace('irradiance_xrsa1_', '');

        const tokens = [];
        tokens.push(str.substring(0, 2));   // year
        tokens.push(str.substring(2, 4));   // month
        tokens.push(str.substring(4, 6));   // day
        tokens.push(str.substring(7, 9));   // hours
        tokens.push(str.substring(9, 11));  // minutes
        tokens.push('00');                  // seconds

        const date = moment(`20${tokens[0]}/${tokens[1]}/${tokens[2]} ${tokens[3]}:${tokens[4]}:${tokens[5]}`, 'YYYY/MM/DD H:mm:ss');

        const doc = {
            id: idx,
            timestamp: date.toISOString(),
            samples: resultsXr[idx][0].map(sample => parseFloat(sample))
        };

        return doc;
    });
    // console.log(docsXr);
    // return;

    // create bucket
    // const bucketResponse = await postRequest(
    //     `http://${process.env.DATABASE_ADDR}:8091/pools/default/buckets`,
    //     { name: 'GOES', bucketType: 'couchbase', ramQuota: 512 },
    //     dbUsername,
    //     dbPassword 
    // );
    // if (bucketResponse.status !== 200) {
    //     console.error(`Request [create bucket] failed with status ${bucketResponse.response.status}: ${bucketResponse.response.statusText}`);
    //     console.error('Errors:', bucketResponse.response.data.errors);
    //     return;
    // }

    // create scope - mag
    const scopeResponseMag = await postRequest(
        `http://${process.env.DATABASE_ADDR}:8093/query/service`,
        { statement: 'CREATE SCOPE GOES.magACRF' },
        dbUsername,
        dbPassword 
    );
    if (scopeResponseMag.status !== 200) {
        console.error(`Request [create scope mag] failed with status ${scopeResponseMag.response.status}: ${scopeResponseMag.response.statusText}`);
        console.error('Errors:', scopeResponseMag.response.data.errors);
        return;
    }

    // create scope - sac
    const scopeResponseSac = await postRequest(
        `http://${process.env.DATABASE_ADDR}:8093/query/service`,
        { statement: 'CREATE SCOPE GOES.solarArrayCurrent' },
        dbUsername,
        dbPassword 
    );
    if (scopeResponseSac.status !== 200) {
        console.error(`Request [create scope sac] failed with status ${scopeResponseSac.response.status}: ${scopeResponseSac.response.statusText}`);
        console.error('Errors:', scopeResponseSac.response.data.errors);
        return;
    }

    // create scope - xr
    const scopeResponseXr = await postRequest(
        `http://${process.env.DATABASE_ADDR}:8093/query/service`,
        { statement: 'CREATE SCOPE GOES.irradianceXrsa1' },
        dbUsername,
        dbPassword 
    );
    if (scopeResponseXr.status !== 200) {
        console.error(`Request [create scope xr] failed with status ${scopeResponseXr.response.status}: ${scopeResponseXr.response.statusText}`);
        console.error('Errors:', scopeResponseXr.response.data.errors);
        return;
    }

    await delay(100);   // necessary to avoid database errors

    // create collection - mag
    const collectionResponseMag = await postRequest(
        `http://${process.env.DATABASE_ADDR}:8093/query/service`,
        { statement: 'CREATE COLLECTION GOES.magACRF.measurements' },
        dbUsername,
        dbPassword 
    );
    if (collectionResponseMag.status !== 200) {
        console.error(`Request [create collection mag] failed with status ${collectionResponseMag.response.status}: ${collectionResponseMag.response.statusText}`);
        console.error('Errors:', collectionResponseMag.response.data.errors);
        return;
    }

     // create collection - sac
    const collectionResponseSac = await postRequest(
        `http://${process.env.DATABASE_ADDR}:8093/query/service`,
        { statement: 'CREATE COLLECTION GOES.solarArrayCurrent.measurements' },
        dbUsername,
        dbPassword 
    );
    if (collectionResponseSac.status !== 200) {
        console.error(`Request [create collection sac] failed with status ${collectionResponseSac.response.status}: ${collectionResponseSac.response.statusText}`);
        console.error('Errors:', collectionResponseSac.response.data.errors);
        return;
    }

    // create collection - xr
    const collectionResponseXr = await postRequest(
        `http://${process.env.DATABASE_ADDR}:8093/query/service`,
        { statement: 'CREATE COLLECTION GOES.irradianceXrsa1.measurements' },
        dbUsername,
        dbPassword 
    );
    if (collectionResponseXr.status !== 200) {
        console.error(`Request [create collection xr] failed with status ${collectionResponseXr.response.status}: ${collectionResponseXr.response.statusText}`);
        console.error('Errors:', collectionResponseXr.response.data.errors);
        return;
    }

    await delay(100);   // necessary to avoid database errors

    // create index - mag
    const indexResponseMag = await postRequest(
        `http://${process.env.DATABASE_ADDR}:8093/query/service`,
        { statement: 'CREATE PRIMARY INDEX idx_magACRF_measurements_primary ON GOES.magACRF.measurements USING GSI' },
        dbUsername,
        dbPassword 
    );
    if (indexResponseMag.status !== 200) {
        console.error(`Request [create index mag] failed with status ${indexResponseMag.response.status}: ${indexResponseMag.response.statusText}`);
        console.error('Errors:', indexResponseMag.response.data.errors);
        return;
    }

    // create index - sac
    const indexResponseSac = await postRequest(
        `http://${process.env.DATABASE_ADDR}:8093/query/service`,
        { statement: 'CREATE PRIMARY INDEX idx_sac_measurements_primary ON GOES.solarArrayCurrent.measurements USING GSI' },
        dbUsername,
        dbPassword 
    );
    if (indexResponseSac.status !== 200) {
        console.error(`Request [create index sac] failed with status ${indexResponseSac.response.status}: ${indexResponseSac.response.statusText}`);
        console.error('Errors:', indexResponseSac.response.data.errors);
        return;
    }

    // create index - xr
    const indexResponseXr = await postRequest(
        `http://${process.env.DATABASE_ADDR}:8093/query/service`,
        { statement: 'CREATE PRIMARY INDEX idx_irradianceXrsa1_measurements_primary ON GOES.irradianceXrsa1.measurements USING GSI' },
        dbUsername,
        dbPassword 
    );
    if (indexResponseXr.status !== 200) {
        console.error(`Request [create index xr] failed with status ${indexResponseXr.response.status}: ${indexResponseXr.response.statusText}`);
        console.error('Errors:', indexResponseXr.response.data.errors);
        return;
    }

    await delay(100);   // necessary to avoid database errors

    // insert docs in database - mag
    const insertionsMag = docsMag.map((doc, idx) => postRequest(
        `http://${process.env.DATABASE_ADDR}:8093/query/service`,
        { statement: `INSERT INTO GOES.magACRF.measurements (KEY,VALUE) VALUES ("${idx}", ${JSON.stringify(doc)})` },
        dbUsername,
        dbPassword 
    ));
    try {
        const responsesMag = await axios.all(insertionsMag);
        console.log(`Inserted ${responsesMag.length} documents in 'GOES.magACRF.measurements'`);
    }
    catch (err) {
        console.error(err);
        return;
    }

    // insert docs in database - sac
    const insertionsSac = docsSac.map((doc, idx) => postRequest(
        `http://${process.env.DATABASE_ADDR}:8093/query/service`,
        { statement: `INSERT INTO GOES.solarArrayCurrent.measurements (KEY,VALUE) VALUES ("${idx}", ${JSON.stringify(doc)})` },
        dbUsername,
        dbPassword 
    ));
    try {
        const responsesSac = await axios.all(insertionsSac);
        console.log(`Inserted ${responsesSac.length} documents in 'GOES.solarArrayCurrent.measurements'`);
    }
    catch (err) {
        console.error(err);
        return;
    }

    // insert docs in database - xr
    const insertionsXr = docsXr.map((doc, idx) => postRequest(
        `http://${process.env.DATABASE_ADDR}:8093/query/service`,
        { statement: `INSERT INTO GOES.irradianceXrsa1.measurements (KEY,VALUE) VALUES ("${idx}", ${JSON.stringify(doc)})` },
        dbUsername,
        dbPassword 
    ));
    try {
        const responsesXr = await axios.all(insertionsXr);
        console.log(`Inserted ${responsesXr.length} documents in 'GOES.irradianceXrsa1.measurements'`);
    }
    catch (err) {
        console.error(err);
        return;
    }

}

importSourceFiles();
