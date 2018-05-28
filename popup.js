let bgPort = chrome.runtime.connect();
bgPort.postMessage("SyncPopup");

let btnToggleOn = document.getElementById('btn-toggle-on');
let btnToggleOff = document.getElementById('btn-toggle-off');
let btnReloadHelper = document.getElementById('reload-helper');

btnToggleOn.onclick = (e) => {
    bgPort.postMessage("SwitchOn");
};

btnToggleOff.onclick = (e) => {
    bgPort.postMessage("SwitchOff");
    btnReloadHelper.style.display = 'block';
};

btnReloadHelper.onclick = (e) => {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.update(tabs[0].id, {url: tabs[0].url});
    });

    btnReloadHelper.style.display = 'none';
};

setInterval(() => {
    bgPort.postMessage("SyncPopup");
}, 1000);