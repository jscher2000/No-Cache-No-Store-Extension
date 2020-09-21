/* 
  Copyright 2020. Jefferson "jscher2000" Scher. License: MPL-2.0.
  v0.5 - initial design
*/

/**** Retrieve Preferences From Storage and Set Up Listener ****/

// Preferences
let oPrefs = {
	types: ["text/css"]		// Content-Types to intercept
};
// Update oPrefs from storage
function updatePref(){
	browser.storage.local.get("userprefs").then((results) => {
		if (results.userprefs != undefined){
			if (JSON.stringify(results.userprefs) != '{}'){
				var arrSavedPrefs = Object.keys(results.userprefs)
				for (var j=0; j<arrSavedPrefs.length; j++){
					oPrefs[arrSavedPrefs[j]] = results.userprefs[arrSavedPrefs[j]];
				}
			}
		}
	}).catch((err) => {console.log('Error retrieving storage: '+err.message);});
}
updatePref();

// Create response listener, get match patterns, and initialize to "on"
let nowListening = false, arrMatches = [];
function startListening(){
	browser.webRequest.onHeadersReceived.addListener(
		fixCC,
		{
			urls: arrMatches
		},
		["blocking", "responseHeaders"]
	);
	nowListening = true;
	return nowListening;
}
function stopListening(){
	browser.webRequest.onHeadersReceived.removeListener(fixCC);
	nowListening = false;
	return nowListening;
}
// Call Permissions API to get allowed origins
var current = browser.permissions.getAll();
current.then((perms) => {
	arrMatches = perms.origins;
	// Enable now
	startListening();
})

/**** Fix Headers of Intercepted Responses ****/

function fixCC(details) {
	if (details.statusCode == 200){
		let headers = details.responseHeaders;
		// Check Content-Type against user's list
		let ct = headers.find( objH => objH.name.toLowerCase() === 'content-type' );
		if (isEligible(ct)) {
			// Update the Cache-Control header
			let cc = headers.find( objH => objH.name.toLowerCase() === 'cache-control' );
			if (cc !== undefined){
				cc.value = 'no-store';
			} else {
				headers.push({
					name: 'Cache-Control',
					value: 'no-store'
				});
			}
			// Remove any Expires header
			let ex = headers.findIndex( objH => objH.name.toLowerCase() === 'expires' );
			if (ex > -1){
				headers.splice(ex, 1);
			}
		}
	}
	// Send the headers back to Firefox
	return { responseHeaders: details.responseHeaders };
}

function isEligible(oCT){
	for (var i=0; i<oPrefs.types.length; i++) {
		if (oCT.value.indexOf(oPrefs.types[i]) > -1) return true;
	}
	return false;
}

/**** Handle Messages from Popup/Options ****/

let pendingHosts = [];
function handleMessage(request, sender, sendResponse) {
	if ('newHosts' in request) { // from popup
		pendingHosts = request.newHosts;
		sendResponse({
			done: ''
		});
	} else if ('toggle' in request) {
		if (request.toggle == false) {
			// Remove listener
			stopListening();
			sendResponse({
				status: nowListening
			});
		} else if (request.toggle == true) {
			// Enable listener
			startListening();
			sendResponse({
				status: nowListening
			});
		}
	} else if ('status' in request) {
		sendResponse({
			status: nowListening
		});
	} else if ('getpending' in request) {
		sendResponse({
			getpending: pendingHosts
		});
	}
}
browser.runtime.onMessage.addListener(handleMessage);
