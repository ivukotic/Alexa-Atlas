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

function humanFileSize(size) {
    var i = Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
};

function getRandReprompt() {
    const reprompts = [
        'To learn all options say "Help".',
        'Would you like to know status of an ADC system? Say "get system status".',
        'To learn about your grid jobs, say "get my jobs" or "get my tasks".',
        'To get state of an ATLAS site, say "get my site".',
        'Maybe check your data size? Say "my data".',
        'Maybe check state of your transfers? Say "my transfers".',
        'To check your transfers say for example "my transfers in last week".',
        'To check persfonar indexing say "get perfsonar status".',
        'To check FTS status say "Check FTS system status".'
    ]
    return (reprompts[Math.floor(Math.random() * reprompts.length)])
}
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        console.info('application launched.');
        const speechText = 'Welcome to the ATLAS computing info system! ' + getRandReprompt();

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(getRandReprompt())
            .withSimpleCard('ATLAS computing', speechText)
            .getResponse();
    }
};

const SetUsernameIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'SetUsername';
    },
    handle(handlerInput) {
        console.info('asked to set username.');

        console.info(handlerInput.requestEnvelope.request.intent.slots);
        const username = handlerInput.requestEnvelope.request.intent.slots.username.value;
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        sessionAttributes.my_username = username;
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        const speechText = `Your username has been set to ${username}.`;
        const repromptText = `To get your jobs, say "get my jobs."`;
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(repromptText)
            .withSimpleCard('ATLAS computing', speechText)
            .getResponse();
    }
};

const SetSiteIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'SetSite';
    },
    handle(handlerInput) {
        console.info('asked to set site.');
        console.info(handlerInput.requestEnvelope.request.intent.slots);
        const sitename = handlerInput.requestEnvelope.request.intent.slots.sitename.value;
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        sessionAttributes.my_site = sitename;
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        const speechText = `Your site has been set to ${sitename}.`;
        const repromptText = `To get jobs states at your site, say "get my site state."`;

        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard('ATLAS computing', speechText)
            .reprompt(repromptText)
            .getResponse();
    }
};


const GetSiteStatusIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'GetSiteStatus';
    },
    handle(handlerInput) {
        console.info('asked for site status.');
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        if (sessionAttributes.my_site) {
            var speechText = `Your site: ${sessionAttributes.my_site}, `

            let start_in_utc = new Date().getTime() - 24 * 86400 * 1000;
            if (slots.interval.interval) {
                console.info('interval: ', slots.interval.value);
                const interval = intervalParser.toSeconds(intervalParser.parse(slots.interval.value));
                start_in_utc = new Date().getTime() - interval * 1000;
                speechText+=' in last '+slots.interval.value + ' had jobs in:';
            }
            else{
                speechText+='in last day, had jobs in: ';
            }

            const es_resp = await es.search({
                index: 'jobs',
                body: {
                    size: 0,
                    query: {
                        bool: {
                            must: [
                                { wildcard: { computingsite: `*${sessionAttributes.my_site}*` } },
                                { range: { modificationtime: { gte: start_in_utc } } }
                            ],
                        }
                    },
                    aggs: {
                        all_statuses: {
                            terms: {
                                field: "jobstatus"
                            }
                        },
                        all_queues: {
                            terms: {
                                field: "computingsite"
                            }
                        }
                    }
                }
            });
            console.info('es response:', es_resp.body.aggregations.all_statuses)
            console.info('es response:', es_resp.body.aggregations.all_queues)
            const sbuckets = es_resp.body.aggregations.all_statuses.buckets;

            for (i in sbuckets) {
                speechText += sbuckets[i].key + ', ' + sbuckets[i].doc_count.toString() + '\n';
            }
            
            return handlerInput.responseBuilder
                .speak(speechText)
                .reprompt(getRandReprompt())
                .withSimpleCard('ATLAS computing - site status', speechText)
                .getResponse();
        } else {
            return handlerInput.responseBuilder
                .speak('You need to set site first. Try saying "set my site".')
                .reprompt('Please set your site.')
                .addElicitSlotDirective('sitename')
                .getResponse();
        }
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

        let speechText = 'Your jobs are in following states:\n';
        for (i in buckets) {
            speechText += buckets[i].key + ', ' + buckets[i].doc_count.toString() + ',\n';
        }

        console.info(speechText);
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(getRandReprompt())
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

        let speechText = 'Your tasks are in following states:\n';
        for (i in buckets) {
            speechText += buckets[i].key + ', ' + buckets[i].doc_count.toString() + ',\n';
        }

        console.info(speechText);
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(getRandReprompt())
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
        const data_volume = humanFileSize(Math.random() * 1024 * 1024 * 1024 * 1024);
        const speechText = 'Currently you have ' + data_volume + ' in your datasets.';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(getRandReprompt())
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
        const data_volume = humanFileSize(Math.random() * 1024 * 1024 * 1024);
        var speechText = data_volume + ' has been transfered.';
        speechText = humanFileSize(Math.random() * 1024 * 1024 * 1024) + ' remains is waiting in queue.';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(getRandReprompt())
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
                .reprompt(getRandReprompt())
                .withSimpleCard('ATLAS computing - Elastic', speechText)
                .getResponse();
        };

        if (sistem === 'fts') {
            let speechText = 'fts status lookup not yet implemented.';
            console.info(speechText);
            return handlerInput.responseBuilder
                .speak(speechText)
                .reprompt(getRandReprompt())
                .withSimpleCard('ATLAS computing - FTS ', speechText)
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

                const ref_start = sub_end - tbin * 3 * 3600 * 1000;
                const ref_end = sub_end - tbin * 3600 * 1000;
                // console.info('reference interval:', ref_start, ' till ', ref_end);

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
                // console.info(es_res.body.count);
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
                if (ps_indices[ind][2] < 10 || ps_indices[ind][2] / ps_indices[ind][1] < 0.25) {
                    issueFound = true;
                    speechText += ' Index ' + ind + ' now has ' + ps_indices[ind][2].toString();
                    speechText += ' documents, previously it had ' + (ps_indices[ind][1] / 2).toFixed(0) + '.';
                }
            }
            if (issueFound === false) {
                speechText = 'No issues with perfsonar data collection.';
            }
            console.info(speechText);

            return handlerInput.responseBuilder
                .speak(speechText)
                .reprompt(getRandReprompt())
                .withSimpleCard('ATLAS computing - Perfsonar', speechText)
                .getResponse();
        }

        if (sistem === 'frontier') {
            let speechText = 'frontier status lookup not yet implemented.';
            console.info(speechText);
            return handlerInput.responseBuilder
                .speak(speechText)
                .reprompt(getRandReprompt())
                .withSimpleCard('ATLAS computing - Frontier', speechText)
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
        const speechText = 'You can say: get system status, set my site, set my username, my jobs in last week, tasks or transfers.';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(getRandReprompt())
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
        SetUsernameIntentHandler,
        SetSiteIntentHandler,
        GetSiteStatusIntentHandler,
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
