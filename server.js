const Alexa = require('ask-sdk-core');
const elasticsearch = require('@elastic/elasticsearch');
const express = require('express');
const { ExpressAdapter } = require('ask-sdk-express-adapter');
const persistenceAdapter = require('ask-sdk-s3-persistence-adapter');
const intervalParser = require('iso8601-duration');

const config = require('/etc/aaconf/config.json');
// const config = require('./kube/secrets/config.json');

es = new elasticsearch.Client({ node: config.ES_HOST, log: 'error' });

const app = express();

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        console.info('application launched.');
        const speechText = 'Welcome to the ATLAS computing info system! To learn all options say "Help". ';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard('ATLAS computing', speechText)
            .getResponse();
    }
};

const ConfigureIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'Configure';
    },
    handle(handlerInput) {
        console.info('asked for configuration.');
        const speechText = 'Configuring!';

        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard('ATLAS computing', speechText)
            .getResponse();
    }
};

const JobsIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'Jobs';
    },
    async handle(handlerInput) {
        const slots = handlerInput.requestEnvelope.request.intent.slots;
        console.info('asked for jobs information. slots:', slots);

        let start_in_utc = new Date().getTime() - 7 * 24 * 86400 * 1000;
        if (slots.interval.interval) {
            console.info('interval: ', slots.interval.value);
            const interval = intervalParser.toSeconds(intervalParser.parse(slots.interval.value));
            start_in_utc = new Date().getTime() - interval * 1000;
        }

        const es_resp = await es.search({
            index: 'jobs',
            body: {
                size: 0,
                query: {
                    bool: {
                        must: [
                            // { match: { jobstatus: "cancelled" } },
                            { range: { modificationtime: { gte: start_in_utc } } }
                        ],
                    }
                },
                aggs: {
                    all_statuses: {
                        terms: {
                            field: "jobstatus"
                        }
                    }
                }
            }
        });
        console.info('es response:', es_resp.body.aggregations.all_statuses)
        const buckets = es_resp.body.aggregations.all_statuses.buckets;

        let speechText = 'Your jobs are in following states: ';
        for (i in buckets) {
            speechText += 'in ' + buckets[i].key + ', ' + buckets[i].doc_count.toString() + ', ';
        }

        console.info(speechText);
        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard('ATLAS computing', speechText)
            .getResponse();
    }
};

const TasksIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'Tasks';
    },
    async handle(handlerInput) {
        const slots = handlerInput.requestEnvelope.request.intent.slots;
        console.info('asked for tasks information. slots:', slots);

        let start_in_utc = new Date().getTime() - 7 * 24 * 86400 * 1000;
        if (slots.interval.interval) {
            console.info('interval: ', slots.interval.value);
            const interval = intervalParser.toSeconds(intervalParser.parse(slots.interval.value));
            start_in_utc = new Date().getTime() - interval * 1000;
        }

        const es_resp = await es.search({
            index: 'tasks',
            body: {
                size: 0,
                query: {
                    bool: {
                        must: [
                            { range: { modificationtime: { gte: start_in_utc } } }
                        ],
                    }
                },
                aggs: {
                    all_statuses: {
                        terms: {
                            field: "status"
                        }
                    }
                }
            }
        });
        console.info('es response:', es_resp.body.aggregations.all_statuses)
        const buckets = es_resp.body.aggregations.all_statuses.buckets;

        let speechText = 'Your tasks are in following states: ';
        for (i in buckets) {
            speechText += 'in ' + buckets[i].key + ', ' + buckets[i].doc_count.toString() + ', ';
        }

        console.info(speechText);
        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard('ATLAS computing', speechText)
            .getResponse();
    }
};

const DataIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'Data';
    },
    handle(handlerInput) {
        console.info('asked for data information');
        const speechText = 'Getting your data!';

        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard('ATLAS computing', speechText)
            .getResponse();
    }
};

const TransfersIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'Transfers';
    },
    handle(handlerInput) {
        console.info('asked for transfers information');
        const speechText = 'Getting your transfers data!';

        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard('ATLAS computing', speechText)
            .getResponse();
    }
};


const SystemStatusIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'SystemStatus';
    },
    async handle(handlerInput) {
        console.info('asked for system status.');
        console.info('slots:', handlerInput.requestEnvelope.request.intent.slots)
        const sistem = handlerInput.requestEnvelope.request.intent.slots.ADCsystem.value;
        if (sistem === 'elastic') {
            const es_resp = await es.cluster.health()
            console.info('es response:', es_resp.body)
            const es_status = es_resp.body.status;
            const es_unassigned = es_resp.body.unassigned_shard;
            let speechText = 'Elastic status is ' + es_status + '.';
            if (es_status !== 'green') {
                speechText += ' There are ' + es_unassigned.toString() + ' unassigned shards.';
            }
            console.info(speechText);
            return handlerInput.responseBuilder
                .speak(speechText)
                .withSimpleCard('ATLAS computing', speechText)
                .getResponse();
        };

        if (sistem === 'fts') {
            let speechText = 'fts status lookup not yet implemented.';
            console.info(speechText);
            return handlerInput.responseBuilder
                .speak(speechText)
                .withSimpleCard('ATLAS computing', speechText)
                .getResponse();
        };

        if (sistem === 'perfsonar') {
            const ps_indices = {
                'ps_meta': [24, 0, 0],
                'ps_owd': [1, 0, 0],
                'ps_packet_loss': [1, 0, 0],
                'ps_retransmits': [1, 0, 0],
                'ps_status': [1, 0, 0],
                'ps_throughput': [1, 0, 0],
                'ps_trace': [1, 0, 0]
            }
            const sub_end = new Date().getTime() - 9 * 86400 * 1000;

            for (ind in ps_indices) {
                console.info("Checking: ", ind);
                const tbin = ps_indices[ind][0];

                const ref_start = sub_end - tbin * 3 * 3600 * 1000);
                const ref_end = sub_end - tbin * 3600 * 1000;
                console.info('reference interval:', ref_start, ' till ', ref_end);

                types_query = {
                    size: 0,
                    query: {
                        bool: {
                            filter: {
                                range: { timestamp: { gt: ref_start, lte: ref_end } }
                            }
                        }
                    }
                }

                const es_res = es.search(index = ind, body = types_query, request_timeout = 120)
                ps_indices[ind][1] = es_res['hits']['total']['value']

                types_query = {
                    size: 0,
                    query: {
                        bool: {
                            filter: {
                                range: { timestamp: { gt: ref_end, lte: sub_end } }
                            }
                        }
                    }
                }

                const es_res1 = es.search(index = ind, body = types_query, request_timeout = 120)
                ps_indices[ind][2] = es_res1['hits']['total']['value']
            }

            console.info(ps_indices);

            let speechText = 'perfsonar status lookup not yet implemented.';
            console.info(speechText);
            return handlerInput.responseBuilder
                .speak(speechText)
                .withSimpleCard('ATLAS computing', speechText)
                .getResponse();
        }

        if (sistem === 'frontier') {
            let speechText = 'frontier status lookup not yet implemented.';
            console.info(speechText);
            return handlerInput.responseBuilder
                .speak(speechText)
                .withSimpleCard('ATLAS computing', speechText)
                .getResponse();
        }
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        console.info('asked for help.');
        const speechText = 'You can say: configure, get system status, my jobs in last week, tasks or transfers, or data.';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard('ATLAS computing', speechText)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
                || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        console.info('asked for stop.');
        const speechText = 'Goodbye!';

        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard('ATLAS computing', speechText)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.info('session ended request.');
        //any cleanup logic goes here
        return handlerInput.responseBuilder.getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`Error handled: ${error.message}`);

        return handlerInput.responseBuilder
            .speak('Sorry, I can\'t understand the command. Please say again.')
            .reprompt('Sorry, I can\'t understand the command. Please say again.')
            .getResponse();
    },
};


const skill = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        ConfigureIntentHandler,
        JobsIntentHandler,
        TasksIntentHandler,
        TransfersIntentHandler,
        DataIntentHandler,
        SystemStatusIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler)
    .addErrorHandlers(ErrorHandler)
    // .withPersistenceAdapter(
    //     new persistenceAdapter.S3PersistenceAdapter({bucketName:'alexa-atlas'})
    // )
    .create();


const adapter = new ExpressAdapter(skill, true, true);

app.post('/', adapter.getRequestHandlers());

app.get('/healthz', function (_req, res) {
    res.status(200).send('OK');
});

app.listen(80);


async function main() {
    try {
        await es.ping(function (err, resp, status) {
            console.log('ES ping:', resp.statusCode);
        });
    } catch (err) {
        console.error('Error: ', err);
    }
}

main();
