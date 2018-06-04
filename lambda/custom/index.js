'use strict';

/**
 * This is a simple skill with In-Skill-Purchasing.
 */


// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `${title}`,
            content: `${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}


// --------------- Functions that control the skill's behavior -----------------------

const CARD_TITLE = 'Demo ISP Skill';

function getWelcomeResponse(callback) {
    let sessionAttributes = {};
    const speechOutput = 'Welcome to the Demo ISP Skill.';
    const repromptText = 'Welcome to the Demo ISP Skill.';
    const shouldEndSession = false;
    callback(sessionAttributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
}

function handleRepeatIntent(intent, session, callback) {
    const speechOutput = session.attributes['speechOutput'];
    const repromptText = session.attributes['repromptText'];
    const shouldEndSession = false;
    callback(session.attributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
}

function handleHelpIntent(callback) {
    let sessionAttributes = {};
    const speechOutput = 'This Alexa Skill demonstrates how to add In-Skill-Purchasing.';
    const repromptText = 'This Alexa Skill demonstrates how to add In-Skill-Purchasing.';
    const shouldEndSession = false;
    callback(sessionAttributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    const speechOutput = 'Thank you for trying the Demo ISP Skill. Goodbye!';
    const shouldEndSession = true;
    callback({}, buildSpeechletResponse(CARD_TITLE, speechOutput, null, shouldEndSession));
}


function handlePlayGameIntent(intent, session, callback) {
    const sessionAttributes = {};
    const shouldEndSession = true;
    const speechOutput = "Let's play a game. ";
    const repromptText = speechOutput;

    callback(sessionAttributes,
         buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
}


// --------------- Private Helper Functions -----------------------



// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === 'PlayGameIntent') {
        handlePlayGameIntent(intent, session, callback);
    } else if (intentName === 'AMAZON.HelpIntent' || intentName === 'AMAZON.FallbackIntent') {
        handleHelpIntent(callback);
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
        handleSessionEndRequest(callback);
    } else if (intentName === 'AMAZON.RepeatIntent') {
        handleRepeatIntent(intent, session, callback);
    } else {
        throw new Error('Invalid intent');
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}


// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};

