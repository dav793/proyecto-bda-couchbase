require('dotenv').config({ path: '../.env' });
const fs = require('fs/promises');
const path = require('path');
const axios = require('axios');
const moment = require('moment');

const dbUsername = 'Administrator';
const dbPassword = '12345678';

function generateHtml(labels, datapointsArray0, datapointsArray1, datapointsArray2, datapointsArray3) {

    return `
        <html>
            <head>
                <title>Data Plot: Solar Array Current</title>
            </head>
            <body>
                <h1 style="height: 3vh">solar_array_current</h1>

                <div>
                    <canvas id="myChart" style="width: 99vw; height: 90vh"></canvas>
                </div>

                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                <script>
                    const ctx = document.getElementById('myChart');

                    const datasets1 = [
                        {
                            label: 'Average',
                            data: ${JSON.stringify(datapointsArray0)},
                            fill: false,
                            tension: 0.1,
                            borderWidth: 1,
                            borderColor: 'rgb(75, 192, 192)'
                        }
                    ];

                    const datasets2 = [
                        {
                            label: 'Array 0',
                            data: ${JSON.stringify(datapointsArray0)},
                            fill: false,
                            tension: 0.1,
                            borderWidth: 1,
                            borderColor: 'rgb(75, 192, 192)'
                        }, {
                            label: 'Array 1',
                            data: ${JSON.stringify(datapointsArray1)},
                            fill: false,
                            tension: 0.1,
                            borderWidth: 1,
                            borderColor: 'rgb(220, 52, 32)'
                        }, {
                            label: 'Array 2',
                            data: ${JSON.stringify(datapointsArray2)},
                            fill: false,
                            tension: 0.1,
                            borderWidth: 1,
                            borderColor: 'rgb(32, 220, 39)'
                        }, {
                            label: 'Array 3',
                            data: ${JSON.stringify(datapointsArray3)},
                            fill: false,
                            tension: 0.1,
                            borderWidth: 1,
                            borderColor: 'rgb(210, 32, 220)'
                        }
                    ];

                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: ${JSON.stringify(labels)},
                            datasets: datasets2
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
        { statement: 'SELECT * FROM GOES.solarArrayCurrent.measurements' },
        dbUsername,
        dbPassword 
    );
    if (response.status !== 200) {
        console.error(`Request [select measurements] failed with status ${response.response.status}: ${response.response.statusText}`);
        console.error('Errors:', response.response.data.errors);
        return;
    }

    const datapoints = response.data.results
        .sort((a, b) => a.measurements.id - b.measurements.id)
        .map((d, i) => {
            const label = moment(d.measurements.timestamp).format('D/M H:mm');
            const reportsArray0 = [];
            const reportsArray1 = [];
            const reportsArray2 = [];
            const reportsArray3 = [];

            d.measurements.reports.forEach(report => {
                reportsArray0.push(report.samplesArray0);
                reportsArray1.push(report.samplesArray1);
                reportsArray2.push(report.samplesArray2);
                reportsArray3.push(report.samplesArray3);
            });

            return {
                label,
                reportsAvgArray0: calcSamplesAverage(reportsArray0),
                reportsAvgArray1: calcSamplesAverage(reportsArray1),
                reportsAvgArray2: calcSamplesAverage(reportsArray2),
                reportsAvgArray3: calcSamplesAverage(reportsArray3),
            };
        });

    const labels = datapoints.map(d => d.label);
    const datapointsArray0 = datapoints.map(d => d.reportsAvgArray0);
    const datapointsArray1 = datapoints.map(d => d.reportsAvgArray1);
    const datapointsArray2 = datapoints.map(d => d.reportsAvgArray2);
    const datapointsArray3 = datapoints.map(d => d.reportsAvgArray3);

    const filePath = path.join(__dirname, '..', 'out', 'plot-sac.html');
    const fileBody = generateHtml(labels, datapointsArray0, datapointsArray1, datapointsArray2, datapointsArray3);
    const err = await writeToFile(filePath, fileBody);

    if (err)
        console.error(err);
    else
        console.log(`Generated file '${filePath}'`);

}

run();
