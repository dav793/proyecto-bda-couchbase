require('dotenv').config({ path: '../.env' });
const fs = require('fs/promises');
const path = require('path');
const axios = require('axios');
const moment = require('moment');

const dbUsername = 'Administrator';
const dbPassword = '12345678';

function generateHtml(datapointsAvg, datapointsMax, datapointsMin) {
    const labels = datapointsAvg.map(pt => pt.label);
    const valuesAvg = datapointsAvg.map(pt => pt.reportAvg);
    const valuesMax = datapointsMax.map(pt => pt.reportMax);
    const valuesMin = datapointsMin.map(pt => pt.reportMin);

    return `
        <html>
            <head>
                <title>Data Plot: Mag</title>
            </head>
            <body>
                <h1 style="height: 3vh">magACRF</h1>

                <div>
                    <canvas id="myChart" style="width: 99vw; height: 90vh"></canvas>
                </div>

                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                <script>
                    const ctx = document.getElementById('myChart');

                    const datasets1 = [
                        {
                            label: 'Average',
                            data: ${JSON.stringify(valuesAvg)},
                            fill: false,
                            tension: 0.1,
                            borderWidth: 1,
                            borderColor: 'rgb(75, 192, 192)'
                        }
                    ];

                    const datasets2 = [
                        {
                            label: 'Average',
                            data: ${JSON.stringify(valuesAvg)},
                            fill: false,
                            tension: 0.1,
                            borderWidth: 1,
                            borderColor: 'rgb(75, 192, 192)'
                        }, {
                            label: 'Max',
                            data: ${JSON.stringify(valuesMax)},
                            fill: false,
                            tension: 0.1,
                            borderWidth: 1,
                            borderColor: 'rgb(220, 52, 32)'
                        }, {
                            label: 'Min',
                            data: ${JSON.stringify(valuesMin)},
                            fill: false,
                            tension: 0.1,
                            borderWidth: 1,
                            borderColor: 'rgb(32, 220, 39)'
                        }
                    ];

                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: ${JSON.stringify(labels)},
                            datasets: datasets1
                        },
                        options: {
                            scales: {
                                y: {
                                    beginAtZero: false
                                }
                            }
                        }
                    });
                </script>
            </body>
        </html>
    `;
}

function calcSamplesAverage(samples) {
    return samples.reduce((a, b) => a + b, 0) / samples.length;
}

function calcSamplesMax(samples) {
    return samples.reduce((a, b) => Math.max(a, b), -999999);
}

function calcSamplesMin(samples) {
    return samples.reduce((a, b) => Math.min(a, b), 999999);
}

function calcReportsAverage(reports) {
    return reports
        .map(report => calcSamplesAverage(report.samples))
        .reduce((a, b) => a + b, 0) / reports.length;
}

function calcReportsMax(reports) {
    return reports
        .map(report => calcSamplesMax(report.samples))
        .reduce((a, b) => Math.max(a, b), -999999);
}

function calcReportsMin(reports) {
    return reports
        .map(report => calcSamplesMin(report.samples))
        .reduce((a, b) => Math.min(a, b), 999999);
}

async function writeToFile(url, body) {
    try {
        await fs.writeFile(url, body);
    }
    catch (err) {
        return err;
    }
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

async function run() {

    // query samples from database
    const response = await postRequest(
        `http://${process.env.DATABASE_ADDR}:8093/query/service`,
        { statement: 'SELECT * FROM GOES.magACRF.measurements' },
        dbUsername,
        dbPassword 
    );
    if (response.status !== 200) {
        console.error(`Request [select measurements] failed with status ${response.response.status}: ${response.response.statusText}`);
        console.error('Errors:', response.response.data.errors);
        return;
    }

    const datapointsAvg = response.data.results
        .sort((a, b) => a.measurements.id - b.measurements.id)
        .map(d => {
            const label = moment(d.measurements.timestamp).format('D/M H:mm');
            const reportAvg = calcReportsAverage(d.measurements.reports);
            return { label, reportAvg };
        });

    const datapointsMax = response.data.results
        .sort((a, b) => a.measurements.id - b.measurements.id)
        .map(d => {
            const label = moment(d.measurements.timestamp).format('D/M H:mm');
            const reportMax = calcReportsMax(d.measurements.reports);
            return { label, reportMax };
        });

    const datapointsMin = response.data.results
        .sort((a, b) => a.measurements.id - b.measurements.id)
        .map(d => {
            const label = moment(d.measurements.timestamp).format('D/M H:mm');
            const reportMin = calcReportsMin(d.measurements.reports);
            return { label, reportMin };
        });

    const filePath = path.join(__dirname, '..', 'out', 'plot-mag.html');
    const fileBody = generateHtml(datapointsAvg, datapointsMax, datapointsMin);
    const err = await writeToFile(filePath, fileBody);

    if (err)
        console.error(err);
    else
        console.log(`Generated file '${filePath}'`);

}

run();
