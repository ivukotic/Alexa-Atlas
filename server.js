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

const GetInfoIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'GetInfo';
    },
    handle(handlerInput) {
        console.info('asked for information:', handlerInput.attributesManager.getRequestAttributes());
        const speechText = 'Getting your data!';

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
        console.info('asked for system status:', handlerInput.attributesManager.getRequestAttributes());
        const speechText = 'looking up system status!';

        try {
            await es.cluster.health(function (err, resp, status) {
                console.log('ES status:', resp);
            });
        } catch (err) {
            console.error('ES Error: ', err);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard('ATLAS computing', speechText)
            .getResponse();
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
        GetInfoIntentHandler,
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
