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

function handleBuySkillItemIntent(event, callback) {
    getProductsAndEntitlements(event, callback);
}


// --------------- Private Helper Functions -----------------------
function getProductsAndEntitlements(event, callback)   {
    // check session
    if (event && event.session && event.session.attributes && 
        event.session.attributes.InSkillProducts && event.session.attributes.InSkillProducts.length > 0) {
        console.log("Product info already loaded.");
        callbackForBuySkillItemIntent(event, event.session.attributes.InSkillProducts, false, "", callback);
        return;
    }
    else { // Invoke the entitlement API to load products only if not already cached
        var InSkillProducts = [];
        var returnData = [];
        // Information required to invoke the API is available in the session
        const https = require('https');
        const apiEndpoint = "api.amazonalexa.com";
        const token  = "bearer " + event.context.System.apiAccessToken;
        const language    = event.request.locale;
        // The API path
        const apiPath     = "/v1/users/~current/skills/~current/inSkillProducts";
        const options = {
            host: apiEndpoint,
            path: apiPath,
            method: 'GET',
            headers: {
                "Content-Type"      : 'application/json',
                "Accept-Language"   : language,
                "Authorization"     : token
            }
        };
        // Call the API
        const req = https.get(options, (res) => {
            res.setEncoding("utf8");
            if(res.statusCode != 200)   {
                console.log("InSkillProducts returned status code " + res.statusCode);
                var message = "Something went wrong in loading the purchase history. Error code " + res.code;
                callbackForBuySkillItemIntent(event, [], true, message, callback);
            }
            res.on('data', (chunk) => {
                returnData += chunk;
            });
            res.on('end', () => {
                var inSkillProductInfo = JSON.parse(returnData);
                if(Array.isArray(inSkillProductInfo.inSkillProducts))  
                    InSkillProducts = inSkillProductInfo.inSkillProducts;
                else
                    InSkillProducts=[];
                callbackForBuySkillItemIntent(event, InSkillProducts, false, "", callback);
            });   
        });
        req.on('error', (e) => {
            console.log('Error calling InSkillProducts API: ' + e.message);
            var message = "Something went wrong in loading the product list. Error code " + e.code + ", message is " + e.message;
            callbackForBuySkillItemIntent(event, [], true, message, callback);
        });
    }
}

function callbackForBuySkillItemIntent(event, inSkillProductList, hasError, errorMessage, callback) {
    var speechOutput;
    var repromptText;
    var shouldEndSession = true;
    var sessionAttributes = {InSkillProducts: inSkillProductList};
    if (hasError) {
        speechOutput = errorMessage;
        repromptText = errorMessage;
        callback(sessionAttributes, buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
    }
    else if (inSkillProductList && inSkillProductList.length > 0)    {
        speechOutput = "You are eligible to buy the Unlock Game Pack."
        repromptText = speechOutput;
        //callback(sessionAttributes, buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
        initiateISPPurchase(event, inSkillProductList, callback);
    }
    else {
        speechOutput = "Sorry, you are not eligible to buy the Unlock Game Pack.";
        repromptText = speechOutput;
        callback(sessionAttributes, buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
    }
}

const YOUR_ISP_PRODUCT_ID = "amzn1.adg.product.f660ac7d-fb39-49fa-8ab0-f9eea139bfd9";

function initiateISPPurchase(event, inSkillProductList, callback) {
    var speechOutput;
    var repromptText;
    var shouldEndSession = true;
    var sessionAttributes = {InSkillProducts: inSkillProductList};
    var UnlockGamePack = undefined;
    // check if the user is already entitled
    for (var i=0; i<inSkillProductList.length; i++) {
        if (inSkillProductList[i] && inSkillProductList[i].productId == YOUR_ISP_PRODUCT_ID) {
            UnlockGamePack = inSkillProductList[i];
        }
    }
    if (UnlockGamePack && UnlockGamePack.entitled == 'ENTITLED') {
        speechOutput = "You already own the UnlockGamePack.";
        repromptText = speechOutput;
        callback(sessionAttributes, buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
    }
    else {
        // start ISP purchase
        var response = {
            'directives': [
              {
                  'type': 'Connections.SendRequest',
                  'name': 'Buy',          
                  'payload': {
                        'InSkillProduct': {
                            'productId': YOUR_ISP_PRODUCT_ID                       
                        }
                   },
                  'token': 'correlationToken'              
              }
            ],
            'shouldEndSession': true
        };
        callback(sessionAttributes, response);
    }
}


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
function onIntent(event, intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === 'PlayGameIntent') {
        handlePlayGameIntent(intent, session, callback);
    } else if (intentName === 'BuySkillItemIntent') {
        handleBuySkillItemIntent(event, callback);
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


function onConnectionsResponse(event, callback) {
    var speechOutput;
    var repromptText;
    var shouldEndSession = true;
    var sessionAttributes = {};
    if (event.request && event.request.name == 'Buy') {
        if (event.request.payload && event.request.status && event.request.status.code == 200) {
            var purchaseResult = event.request.payload.purchaseResult;
            if (purchaseResult == 'ACCEPTED') {
                speechOutput = "Congratulations! You now own the Unlock Game Pack.";
            }
            else if (purchaseResult == 'DECLINED') {
                speechOutput = " If you decide to buy the Unlock Game Pack later, just say I want the Unlock Game Pack. Goodbye! ";
            }
            else if (purchaseResult == 'ALREADY_PURCHASED') {
                speechOutput = " You already have the Unlock Game Pack.";
            }
            else if (purchaseResult == 'ERROR') {
                speechOutput = " Sorry, there was a problem in getting the Unlock Game Pack. Try again later. ";
            }
            else {
                speechOutput = " Sorry, there was a problem in buying the Unlock Game Pack. Please Try again later. ";
            }
        }
        else {
            console.log('Connections.Response indicated failure. error: ', this.event.request.status);
            speechOutput = " Sorry, there was a problem in buying the Unlock Game Pack. Please try again or contact us for help. ";
        }
    } else {
        speechOutput = "There was an error while handling your purchase request. Please try again or contact us for help.";
    }
    
    repromptText = speechOutput;
    
    callback(sessionAttributes,
         buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
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
            onIntent(event, 
                event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        } else if (event.request.type === 'Connections.Response') {
            onConnectionsResponse(event, 
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        }
    } catch (err) {
        callback(err);
    }
};

