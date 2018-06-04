# An Simple Alexa Skill with In-Skill-Purchase

This project showcases an Alexa Skill with In-Skill-Purchase (**ISP**) capability. Follow the steps below to add an ISP to an existing Alexa skill.


## Prerequisites
1. AWS account
2. [ask-cli](https://developer.amazon.com/docs/smapi/quick-start-alexa-skills-kit-command-line-interface.html#step-2-install-and-initialize-ask-cli) installed
3. A simple [hello-world skill](https://github.com/sampatb/alexa-skill-with-in-skill-purchase/commit/30681dfb1e0f2f5ae691644457798e7972e100af)
 
 
## Step-1: Create ISP and Associate ISP to a skill

1. clone the skill to your local machine
ask clone

2. go inside skill root dir and create ISP: `$ ask add isp`
    
    2.1 choose ISP type:= Entitlement

    2.2 give a name for ISP:= unlockgamepack

3. Add details to the ISP: `$ vim ./isps/entitlement/unlockgamepack.json` 
or open file in some editor

4. Check ISP status: `$ ask status --isp`

5. Deploy/Save the ISP: `$ ask deploy` (associates the ISP with skill)

6. Make sure the ISP was associated with skill: `$ ask status --isp` (ensure: DEPLOY STATUS = Update)

> [see code change](https://github.com/sampatb/alexa-skill-with-in-skill-purchase/commit/7f78519906079b54ce2163e9660e0f5e56de2578)


## Step-2: Create intents to handle one-shot ISP purchase

1. go to skill builder page in DevPortal
2. Add Intent for handling ISP purchase: 

    2.1 click on Intent Add button
    
    2.2 name: BuySkillItemIntent

3. Add slot for intent:

    3.1 click on Slot Type Add button
    
    3.2 name: LIST_OF_PRODUCT_NAMES
    
    3.3 add sample values: unlock game pack

4. Add slot to intent

    4.1: Go to BuySkillItemIntent and add a slot: ProductName
    
    4.2: choose type as: LIST_OF_PRODUCT_NAMES

5. add sample utterances: buy, buy {ProductName}, purchase {ProductName}
6. Save and Build Model

> [see code change](https://github.com/sampatb/alexa-skill-with-in-skill-purchase/commit/30d1352f46cfb292440369709a9ac65afd8dac45)


## Step-3: Use ISP in skill Lambda

1. Add code to handle the buy intent:

```javascript
    1.1 ****
    else if (intentName === 'BuySkillItemIntent') {
        handleBuySkillItemIntent(event, callback);
    } 

    1.2 ****
    function handleBuySkillItemIntent(event, callback) {
        getProductsAndEntitlements(event, callback);
    }
```
2. Fetch entitlement and ISP metadata:
```javascript
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
        speechOutput = "You are eligible to buy the ISP."
        repromptText = speechOutput;
        callback(sessionAttributes, buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
    }
    else {
        speechOutput = "Sorry, you are not eligible to buy the ISP.";
        repromptText = speechOutput;
        callback(sessionAttributes, buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
    }
}
```


3. Add code to inititate ISP Purchase flow:
```javascript
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
```
4. Handle ISP Purchase Response
```javascript
    else if (event.request.type === 'Connections.Response') {
            onConnectionsResponse(event, 
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
    }


function onConnectionsResponse(event, callback) {
    var speechOutput;
    var repromptText;
    var shouldEndSession = true;
    var sessionAttributes = {};
    if (event.request && event.request.name == 'Buy') {
        if (event.request.payload && event.request.status && event.request.status.code == 200) {
            // retrieve purchaseResult
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
```
> [see code change](https://github.com/sampatb/alexa-skill-with-in-skill-purchase/commit/49a888910b12b465cfb98d20bc943e55874fb838)
