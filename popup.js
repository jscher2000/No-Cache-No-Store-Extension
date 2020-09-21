/* 
  Copyright 2020. Jefferson "jscher2000" Scher. License: MPL-2.0.
  v0.5 - initial concept
*/

/*** Get listener status and update button ****/
var nowListening = false;
browser.runtime.sendMessage({
	status: ''
}).then((response) => {
	nowListening = response.status;
	if (nowListening == true) document.getElementById('toggle').src = 'icons/on-status.png';
	else document.getElementById('toggle').src = 'icons/off-status.png';
}).catch((err) => {
	document.getElementById('errs').textContent = 'Problem getting status: ' + err.message;
});

/**** Get a list of site icon(s) from the page and populate the popup ****/

var arrURLs = [], arrHosts = [];
function onExecuted(result) {
	// We are expecting an array of arrays, one for CSS and one for JS
	if (result.length === 0 || result[0].length === 0){
		document.getElementById('errs').textContent = 'Unable to determine stylesheet/javascript URLs!';
	} else {
		if (oPrefs.types.includes('text/css')){
			arrURLs = result[0][0];
			for (var i=0; i<arrURLs.length; i++){
				try {
					var host = new URL(arrURLs[i]).hostname;
					if (!arrHosts.includes(host)){
						arrHosts.push(host);
						var newLI = document.createElement('li');
						newLI.textContent = arrHosts[arrHosts.length - 1];
						document.getElementById('hostlist').appendChild(newLI);
					}
				} catch(err){
					console.log(arrURLs[i] + ' => ' + err.message);
				}
			}
		} else {
			document.getElementById('css').style.display = 'none';
		}
		if (oPrefs.types.includes('application/javascript')){
			document.getElementById('js').style.display = 'block';
			arrURLs = result[0][1];
			for (i=0; i<arrURLs.length; i++){
				try {
					host = new URL(arrURLs[i]).hostname;
					if (!arrHosts.includes(host)){
						arrHosts.push(host);
						newLI = document.createElement('li');
						newLI.textContent = arrHosts[arrHosts.length - 1];
						document.getElementById('hostlistjs').appendChild(newLI);
					}
				} catch(err){
					console.log(arrURLs[i] + ' => ' + err.message);
				}
			}
		}
		if (nowListening && arrHosts.length > 0) document.getElementById('btnGo').removeAttribute('disabled');
	}
}
function onError(error) {
	document.getElementById('errs').textContent = 'Error determining stylesheet/javascript URLs: ' + error.message;
}

// Preferences
let oPrefs = {
	types: ["text/css"]		// Content-Types to intercept
};
// Update oPrefs from storage, run content script
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
		const executing = browser.tabs.executeScript({
			code: `
				var sheetURLs = [];
				var sheets = document.querySelectorAll('link[rel~="stylesheet"]');
				for (var i=0; i<sheets.length; i++){
					sheetURLs.push(sheets[i].href);
				}
				var jsURLs = [];
				var extjs = document.querySelectorAll('script[src]');
				for (var i=0; i<extjs.length; i++){
					jsURLs.push(extjs[i].src);
				}
				// The following is returned in an array
				[sheetURLs, jsURLs];
			`
		});
		executing.then(onExecuted, onError);
	}).catch((err) => {console.log('Error retrieving storage: '+err.message);});
}
updatePref();

/**** Event handlers ****/

document.getElementById('btnGo').addEventListener('click', function(evt){
	// Send hostlist to background, then close (or display error)
	browser.runtime.sendMessage(
		{ newHosts: arrHosts }
	).then(function(){
		// Call the Options page
		browser.runtime.openOptionsPage();
		self.close();
	}).catch((err) => {
		document.getElementById('errs').textContent = 'Error setting up for reload: ' + err.message;
	});
}, false);

document.getElementById('btnCancel').addEventListener('click', function(evt){
	self.close();
}, false);

document.getElementById('toggle').addEventListener('click', function(evt){
	// Send status change to background, then update button
	nowListening = !nowListening;
	browser.runtime.sendMessage(
		{ toggle: nowListening }
	).then((response) => {
		if (nowListening == true){
			document.getElementById('toggle').src = 'icons/on-status.png';
			if (document.getElementById('hostlist').children.length > 0) document.getElementById('btnGo').removeAttribute('disabled');
		} else{
			document.getElementById('toggle').src = 'icons/off-status.png';
			document.getElementById('btnGo').setAttribute('disabled', 'disabled');
		}
	}).catch((err) => {
		document.getElementById('errs').textContent = 'Error toggling listener: ' + err.message;
	});
}, false);