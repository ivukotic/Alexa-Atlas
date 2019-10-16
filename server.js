const Alexa = require('ask-sdk-core');
const elasticsearch = require('@elastic/elasticsearch');
const express = require('express');
const { ExpressAdapter } = require('ask-sdk-express-adapter');
const persistenceAdapter = require('ask-sdk-s3-persistence-adapter');
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
    handle(handlerInput) {
        console.info('asked for jobs information');
        const speechText = 'Getting your jobs data!';

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
    handle(handlerInput) {
        console.info('asked for tasks information');
        const speechText = 'Getting your tasks data!';

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
        console.info("slots:", handlerInput.requestEnvelope.request.intent.slots)
        const sistem = handlerInput.requestEnvelope.request.intent.slots.ADCsystem.value;
        if (sistem === 'elastic') {
            const es_resp = await es.cluster.health()
            console.info('es response:', es_resp.body)
            const es_status = es_resp.body.status;
            const es_unassigned = es_resp.body.unassigned_shard;
            let speechText = 'Elastic status is ' + es_status + '.';
            if (es_status !== 'green') {
                speechText += ' There are ' + str(es_unassigned) + ' unassigned shards.';
            }
            console.info(speechText);
            return handlerInput.responseBuilder
                .speak(speechText)
                .withSimpleCard('ATLAS computing', speechText)
                .getResponse();
        };
        //     try {
        //         await es.cluster.health(function (err, resp, status) {
        //             console.info('es response:', resp.body)
        //             const es_status = resp.body.status;
        //             const es_unassigned = resp.body.unassigned_shard;
        //             let speechText = 'Elastic status is ' + es_status + '.';
        //             if (es_status !== 'green') {
        //                 speechText += ' There are ' + str(es_unassigned) + ' unassigned shards.';
        //             }
        //             console.info(speechText);
        //             return handlerInput.responseBuilder
        //                 .speak(speechText)
        //                 .withSimpleCard('ATLAS computing', speechText)
        //                 .getResponse();
        //         });
        //     } catch (err) {
        //         console.error('ES Error: ', err);
        //         speechText = 'could not get elastic search status.';
        //         return handlerInput.responseBuilder
        //             .speak(speechText)
        //             .withSimpleCard('ATLAS computing', speechText)
        //             .getResponse();
        //     }
        // }

        if (sistem === 'fts') {
            const speechText = 'fts status lookup not yet implemented.';
            return handlerInput.responseBuilder
                .speak(speechText)
                .withSimpleCard('ATLAS computing', speechText)
                .getResponse();
        };

        if (sistem === 'perfsonar') {
            speechText = 'perfsonar status lookup not yet implemented.';
            return handlerInput.responseBuilder
                .speak(speechText)
                .withSimpleCard('ATLAS computing', speechText)
                .getResponse();
        }
        if (sistem === 'frontier') {
            speechText = 'frontier status lookup not yet implemented.';
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
        const speechText = 'You can say: configure, jobs, tasks, transfers or data.';

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
