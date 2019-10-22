
const elasticsearch = require('@elastic/elasticsearch');
const intervalParser = require('iso8601-duration');

const config = require('./kube/secrets/config.json');


es = new elasticsearch.Client({ node: config.ES_HOST, log: 'error' });

async function main() {

    const ps_indices = {
        'ps_meta': [24, 0, 0],
        'ps_owd': [1, 0, 0],
        // 'ps_packet_loss': [1, 0, 0],
        // 'ps_retransmits': [1, 0, 0],
        // 'ps_status': [1, 0, 0],
        // 'ps_throughput': [1, 0, 0],
        // 'ps_trace': [1, 0, 0]
    }
    const sub_end = new Date().getTime() - 9 * 86400 * 1000;

    for (ind in ps_indices) {
        console.info("Checking: ", ind);
        const tbin = ps_indices[ind][0];

        const ref_start = sub_end - tbin * 3 * 3600 * 1000;
        const ref_end = sub_end - tbin * 3600 * 1000;
        console.info('reference interval:', ref_start, ' till ', ref_end);

        let types_query = {
            query: {
                bool: {
                    filter: {
                        range: { timestamp: { gt: ref_start, lte: ref_end } }
                    }
                }
            }
        }

        const es_res = await es.count({ index: ind, body: types_query })
        console.info(es_res.body);
        ps_indices[ind][1] = es_res.body.count;

        types_query = {
            query: {
                bool: {
                    filter: {
                        range: { timestamp: { gt: ref_end, lte: sub_end } }
                    }
                }
            }
        }

        const es_res1 = await es.count({ index: ind, body: types_query })
        ps_indices[ind][2] = es_res1.body.count;
    }

    console.info(ps_indices);
    var issueFound = false;
    var speechText = 'Issues detected in perfsonar data indexing.';
    for (ind in ps_indices) {
        if (ps_indices[ind][1] < 10) continue;
        if (ps_indices[ind][2] < 10 || ps_indices[ind][2] / ps_indices[ind][1] < 0.3) {
            issueFound = true;
            speechText += ' Index ' + ind + ' now has ' + ps_indices[ind][2].toString();
            speechText += ' documents, previously it had ' + (ps_indices[ind][1] / 2).toFixed(0) + '.';
        }
    }
    if (issueFound === false) {
        speechText = 'no issues with perfsonar data collection.';
    }
    console.info(speechText);
}

main();