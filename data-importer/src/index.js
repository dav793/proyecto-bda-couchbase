require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const moment = require('moment');
const { parse: csvParser } = require("csv-parse");

// console.log(process.env.DATABASE_ADDR);
// console.log(process.env.IMPORTER_SOURCE_FILES_DIR_MAG);

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
    const files = await getFilesList(path_magACRF);

    // parse files
    const parseTasks = async () => {
        const results = await Promise.all(
            files.map(filename => csvStream( path.join(path_magACRF, filename) ))
        );
        return results;
    };
    const results = await parseTasks();

    // create docs
    const docs = files.map((filename, idx) => {
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
            reports: results[idx].map((parsed, idxReport) => ({
                number: idxReport,
                samples: parsed.map(value => parseFloat(value))
            }))
        };

        return doc;
    });

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

    // create scope
    // const scopeResponse = await postRequest(
    //     `http://${process.env.DATABASE_ADDR}:8091/pools/default/buckets/GOES/scopes`,
    //     { name: 'magACRF' },
    //     dbUsername,
    //     dbPassword 
    // );
    // if (scopeResponse.status !== 200) {
    //     console.error(`Request [create scope] failed with status ${scopeResponse.status}`);
    //     return;
    // }

    // create collection
    const collectionResponse = await postRequest(
        `http://${process.env.DATABASE_ADDR}:8093/query/service`,
        { statement: 'CREATE COLLECTION GOES.magACRF.measurements' },
        dbUsername,
        dbPassword 
    );
    if (collectionResponse.status !== 200) {
        console.error(`Request [create collection] failed with status ${collectionResponse.status}`);
        return;
    }

    await delay(100);   // necessary to avoid database errors

    // create index
    const indexResponse = await postRequest(
        `http://${process.env.DATABASE_ADDR}:8093/query/service`,
        { statement: 'CREATE PRIMARY INDEX idx_magACRF_measurements_primary ON GOES.magACRF.measurements USING GSI' },
        dbUsername,
        dbPassword 
    );
    if (indexResponse.status !== 200) {
        console.error(`Request [create index] failed with status ${indexResponse.response.status}: ${indexResponse.response.statusText}`);
        console.error('Errors:', indexResponse.response.data.errors);
        return;
    }

    await delay(100);   // necessary to avoid database errors

    // insert docs in database
    const insertions = docs.map((doc, idx) => postRequest(
        `http://${process.env.DATABASE_ADDR}:8093/query/service`,
        { statement: `INSERT INTO GOES.magACRF.measurements (KEY,VALUE) VALUES ("${idx}", ${JSON.stringify(doc)})` },
        dbUsername,
        dbPassword 
    ));
    try {
        const responses = await axios.all(insertions);
        console.log(`Inserted ${responses.length} documents`);
    }
    catch (err) {
        console.error(err);
        return;
    }

    // const res = await postRequest(
    //     `http://${process.env.DATABASE_ADDR}:8093/query/service`,
    //     { statement: 'SELECT * FROM GOES.magACRF.measurements WHERE id = 1' },
    //     'Administrator',
    //     '12345678' 
    // );
    // console.log(res.status);
    // console.log(res.data.results);
    // console.log(JSON.stringify(docs[0]));

}

importSourceFiles();

// console.log('Quitting...');
// process.exit();
