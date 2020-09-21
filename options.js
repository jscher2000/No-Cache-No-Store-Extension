/* 
  Copyright 2020. Jefferson "jscher2000" Scher. License: MPL-2.0.
  v0.5 - initial design
*/

/*** Initialize Options Page ***/

// Call Permissions API to get allowed origins
let arrMatches = [];
browser.permissions.getAll().then((perms) => {
	arrMatches = perms.origins;
	document.getElementById('hostlist').value = arrMatches.map(function(s){return s.split('/')[2]}).join('\n');
});

// Preferences
let oPrefs = {
	types: ["text/css"]		// Content-Types to intercept
};

// Update oPrefs from storage, fill form controls
let nowListening;
function updateForm(){
	// Update status switch
	browser.runtime.sendMessage({
		status: ''
	}).then((response) => {
		nowListening = response.status;
		if (nowListening == true) document.getElementById('toggle').src = 'icons/on-status.png';
		else document.getElementById('toggle').src = 'icons/off-status.png';
	}).catch((err) => {
		//document.getElementById('errs').textContent = 'Problem getting status: ' + err.message;
	});
	// Get any pending host names
	browser.runtime.sendMessage({
		getpending: ''
	}).then((response) => {
		var pendingHosts = response.getpending;
		if (pendingHosts.length > 0){
			document.getElementById('newhostlist').value += pendingHosts.join('\n');
		}
	}).catch((err) => {
		//document.getElementById('errs').textContent = 'Problem getting pending host list: ' + err.message;
	});
	browser.storage.local.get("userprefs").then((results) => {
		if (results.userprefs != undefined){
			if (JSON.stringify(results.userprefs) != '{}'){
				var arrSavedPrefs = Object.keys(results.userprefs)
				for (var j=0; j<arrSavedPrefs.length; j++){
					oPrefs[arrSavedPrefs[j]] = results.userprefs[arrSavedPrefs[j]];
				}
			}
		}
		// Populate checkboxes
		var chks = document.querySelectorAll('input[type="checkbox"]');
		for (var i=0; i<chks.length; i++){
			if (oPrefs.types.includes(chks[i].value)) chks[i].checked = true;
			else chks[i].checked = false;
		}
	}).catch((err) => {console.log('Error retrieving storage: '+err.message);});
}
updateForm();

/*** Handle User Actions ***/

// Save host list changes
function optionalPerm(evt){
	// Update host permissions
	var hosts = document.getElementById('hostlist').value + '\n' + document.getElementById('newhostlist').value;
	hosts = hosts.split(/\s+/);
	var toRequest = [];
	for (var i=0; i<hosts.length; i++){
		if (hosts[i] !== ''){
			toRequest.push('*://' + hosts[i] + '/*');
		}
	}
	// Request permission
	browser.permissions.request({
		origins: toRequest
	}).then((result) => {
		if (result === false){
			alert('Permissions not changed!');
		} else {
			// Handle the removals
			var toRemove = [];
			for (i=0; i<arrMatches.length; i++){
				if (!toRequest.includes(arrMatches[i])){
					toRemove.push(arrMatches[i]);
				}
			}
			if (toRemove.length > 0) {
				browser.permissions.remove({
					origins: toRemove
				}).then((results) => {
					if (results){
						console.log('Remove origins successful for ' + toRemove.join(', '));
					} else {
						alert('Permission revocation for ' + toRemove.join(', ') + ' was not successul for some reason.');
					}
				});
			}
			// Update arrMatches and list in page
			browser.permissions.getAll().then((perms) => {
				arrMatches = perms.origins;
				document.getElementById('hostlist').value = arrMatches.map(function(s){return s.split('/')[2]}).join('\n');
				document.getElementById('newhostlist').value = '';
			});
			// Clear the new host list
			browser.runtime.sendMessage(
				{ newHosts: [] }
			);
		}
	});
}

// Update storage
function updateForms(evt){
	// Checkboxes
	var chks = document.querySelectorAll('.chk input[type="checkbox"]');
	var arrTypes = [];
	for (var i=0; i<chks.length; i++){
		if (chks[i].checked) arrTypes.push(chks[i].value);
	}
	oPrefs.types = arrTypes;
	// Update storage
	browser.storage.local.set(
		{userprefs: oPrefs}
	).catch((err) => {
		document.getElementById('oops').textContent = 'Error on browser.storage.local.set(): ' + err.message;
	});
}

// Attach event handlers 
document.getElementById('btnHost').addEventListener('click', optionalPerm, false);
document.querySelector('input[name="css"]').addEventListener('click', updateForms, false);
document.querySelector('input[name="javascript"]').addEventListener('click', updateForms, false);
document.querySelector('input[name="html"]').addEventListener('click', updateForms, false);
document.getElementById('toggle').addEventListener('click', function(evt){
	// Send status change to background, then update button
	nowListening = !nowListening;
	browser.runtime.sendMessage(
		{ toggle: nowListening }
	).then((response) => {
		if (nowListening == true){
			document.getElementById('toggle').src = 'icons/on-status.png';
		} else{
			document.getElementById('toggle').src = 'icons/off-status.png';
		}
	}).catch((err) => {
		document.getElementById('errs').textContent = 'Error toggling listener: ' + err.message;
	});
}, false);