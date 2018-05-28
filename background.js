class CensorSwitch {
    static init() {
        this._valueOn = false;
        this._valueClearHistory = false;
        this._valueDisableAutofill = false;

        chrome.storage.sync.get(["streamer_mode_on", "clear_history", "disable_autofill"], (result) => {
            console.log(result);

            if (result.clear_history) {
                this.turnClearHistoryOn();
            }

            if (result.disable_autofill) {
                this.turnDisableAutofillOn();
            }

            if (result.streamer_mode_on) {
                this.turnOn();
            }
        });
    }

    static getIsOn() {
        return !!this._valueOn;
    }

    static turnOn() {
        // Change value
        this._valueOn = true;
        chrome.storage.sync.set({"streamer_mode_on": true});
        console.log('StreamerMode is now enabled.');

        // Clear history, if enabled
        if (this.getClearHistoryIsOn()) {
            CensorUtils.clearBrowsingHistory();
        }

        // Change autofill, if enabled
        if (this.getDisableAutofillIsOn()) {
            CensorUtils.trySetAutofillSetting(false, false);
        }

        // Enable badge
        chrome.browserAction.setBadgeText({ text: " ▶" });
        chrome.browserAction.setBadgeBackgroundColor({ color: "#e74c3c" });
    }

    static turnOff() {
        // Change value
        this._valueOn = false;
        chrome.storage.sync.set({"streamer_mode_on": false});
        console.log('StreamerMode is now disabled.');

        // Release control of the autofill setting (always)
        CensorUtils.trySetAutofillSetting(false, true);

        // Disable badge
        chrome.browserAction.setBadgeText({ text: "" });
    }

    static getClearHistoryIsOn() {
        return !!this._valueClearHistory;
    }

    static turnClearHistoryOn() {
        this._valueClearHistory = true;
        chrome.storage.sync.set({"clear_history": true});
        console.log('Clear history is now enabled.');
    }

    static turnClearHistoryOff() {
        this._valueClearHistory = false;
        chrome.storage.sync.set({"clear_history": false});
        console.log('Clear history is now disabled.');
    }

    static getDisableAutofillIsOn() {
        return !!this._valueDisableAutofill;
    }

    static turnDisableAutofillOn() {
        this._valueDisableAutofill = true;
        chrome.storage.sync.set({"disable_autofill": true});
        console.log('Disable autofill is now enabled.');
    }

    static turnDisableAutofillOff() {
        this._valueDisableAutofill = false;
        chrome.storage.sync.set({"disable_autofill": false});
        console.log('Disable autofill is now disabled.');

        // Release control of the autofill setting (always)
        CensorUtils.trySetAutofillSetting(false, true);
    }
}

class CensorServer {
    static listen() {
        chrome.extension.onConnect.addListener((port) => {
            port.onMessage.addListener((msg) => {
                CensorServer.handlePortMessage(msg);
            });
        });

        chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
            CensorServer.handleContentMessage(msg, sender, sendResponse);
        });
    }

    static handlePortMessage(msg) {
        if (!msg) {
            return;
        }

        let msgParts = msg.split(" ");
        let msgHeader = msgParts[0];

        switch (msgHeader) {
            case "SyncPopup":
                CensorPopup.syncPopup();
                break;

            case "ToggleSwitch":
                if (CensorSwitch.getIsOn()) {
                    CensorSwitch.turnOff();
                } else {
                    CensorSwitch.turnOn();
                }

                CensorPopup.syncPopup();
                break;

            case "SwitchOn":
                CensorSwitch.turnOn();
                CensorPopup.syncPopup();
                break;

            case "SwitchOff":
                CensorSwitch.turnOff();
                CensorPopup.syncPopup();
                break;

            case "ToggleClearHistory":
                let turnOnCh = !CensorSwitch.getClearHistoryIsOn();

                if (turnOnCh) {
                    CensorSwitch.turnClearHistoryOn();
                } else {
                    CensorSwitch.turnClearHistoryOff();
                }

                CensorPopup.syncPopup();
                break;

            case "ToggleDisableAutofill":
                let turnOnDaf = !CensorSwitch.getDisableAutofillIsOn();

                if (turnOnDaf) {
                    CensorSwitch.turnDisableAutofillOn();
                } else {
                    CensorSwitch.turnDisableAutofillOff();
                }

                CensorPopup.syncPopup();
                break;

            default:
                console.warn("[StreamerMode:background] Cannot process extension message; unrecognized header:", msg);
                break;
        }
    }

    static handleContentMessage(msg, sender, reply) {
        reply(JSON.stringify({
            "enabled": !!CensorSwitch.getIsOn(),
            "clear_history": !!CensorSwitch.getClearHistoryIsOn()
        }));
    }
}

class CensorUtils {
    static clearBrowsingHistory() {
        let options = {};

        chrome.browsingData.removeHistory(options, () => {
            console.log('[StreamerMode]', 'Cleared browsing history.');
        });
    }

    static trySetAutofillSetting(newValue, releaseControl) {
        chrome.privacy.services.autofillEnabled.get({}, function (details) {
            console.log(details);

            if (details.levelOfControl === 'controllable_by_this_extension' || details.levelOfControl === 'controlled_by_this_extension') {
                if (releaseControl) {
                    chrome.privacy.services.autofillEnabled.clear({ }, function () {
                        if (chrome.runtime.lastError === undefined) {
                            console.log('[StreamerMode]', 'Autofill setting released.');
                        } else {
                            console.warn('[StreamerMode]', 'Could not release autofill setting:', chrome.runtime.lastError);
                        }
                    });
                } else {
                    chrome.privacy.services.autofillEnabled.set({value: !!newValue}, function () {
                        if (chrome.runtime.lastError === undefined) {
                            console.log('[StreamerMode]', 'Autofill changed to: ' + (newValue ? "on" : "off"));
                        } else {
                            console.warn('[StreamerMode]', 'Could not change autofill:', chrome.runtime.lastError);
                        }
                    });
                }
            } else {
                console.warn('[StreamerMode]', 'Could not set autofill. (not controllable by this extension)');
            }
        });
    }
}

class CensorPopup {
    static syncPopup() {
        let views = chrome.extension.getViews({
            type: "popup"
        });

        let fnSetText = (doc, selectors, value) => {
            selectors = (selectors.constructor === Array) ? selectors : [selectors.toString()];

            for (let i = 0; i < selectors.length; i++) {
                let selector = selectors[i];
                let els = doc.getElementsByClassName(`TXT--${selector}`);

                for (let j = 0; j < els.length; j++) {
                    let el = els[j];
                    el.textContent = value || "";
                }
            }
        };

        let fnToggleVis = (doc, selectors, on) => {
            selectors = (selectors.constructor === Array) ? selectors : [selectors.toString()];

            for (let i = 0; i < selectors.length; i++) {
                let selector = selectors[i];
                let els = doc.getElementsByClassName(`TOG--${selector}`);

                for (let j = 0; j < els.length; j++) {
                    let el = els[j];
                    el.style.display = (on ? "flex" : "none");
                }
            }
        };

        let fnToggleDumTog = (doc, selectors, on) => {
            selectors = (selectors.constructor === Array) ? selectors : [selectors.toString()];

            for (let i = 0; i < selectors.length; i++) {
                let selector = selectors[i];
                let els = doc.getElementsByClassName(`DUMTOG--${selector}`);

                for (let j = 0; j < els.length; j++) {
                    let el = els[j];

                    if (on) {
                        el.classList.add('dum-tog--on');
                    } else {
                        el.classList.remove('dum-tog--on');
                    }
                }
            }
        };

        let censorIsOn = CensorSwitch.getIsOn();
        let clearHistoryIsOn = CensorSwitch.getClearHistoryIsOn();
        let disableAutofillIsOn = CensorSwitch.getDisableAutofillIsOn();

        for (let i = 0; i < views.length; i++) {
            let doc = views[i].document;

            if (censorIsOn)
            {
                fnSetText(doc, "STATUS", "Streamer mode is enabled.");
            }
            else
            {
                fnSetText(doc, "STATUS", "Streamer mode is off.");
            }

            fnToggleVis(doc, "BTN-ON", !censorIsOn);
            fnToggleVis(doc, "BTN-OFF", !!censorIsOn);

            fnToggleVis(doc, "LAMP-ON", !!censorIsOn);
            fnToggleVis(doc, "LAMP-OFF", !censorIsOn);

            fnToggleDumTog(doc, "HISTORY", !!clearHistoryIsOn);
            fnToggleDumTog(doc, "AUTOFILL", !!disableAutofillIsOn);
        }
    }
}

CensorSwitch.init();
CensorServer.listen();
