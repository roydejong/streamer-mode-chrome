class CensorSwitch {
    static init() {
        this._valueOn = false;
        this._valueClearHistory = false;

        chrome.storage.sync.get(["streamer_mode_on", "clear_history"], (result) => {
            console.log(result);

            this._valueOn = !!result.streamer_mode_on;
            this._valueClearHistory = !!result.clear_history;
        });
    }

    static getIsOn() {
        return !!this._valueOn;
    }

    static turnOn() {
        this._valueOn = true;
        chrome.storage.sync.set({"streamer_mode_on": true});
        console.log('StreamerMode is now enabled.');

        if (this.getClearHistoryIsOn()) {
            CensorUtils.clearBrowsingHistory();
        }
    }

    static turnOff() {
        this._valueOn = false;
        chrome.storage.sync.set({"streamer_mode_on": false});
        console.log('StreamerMode is now disabled.');
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
                let turnOn = !CensorSwitch.getClearHistoryIsOn();

                if (turnOn) {
                    CensorSwitch.turnClearHistoryOn();
                } else {
                    CensorSwitch.turnClearHistoryOff();
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
        let options =  {

        };

        chrome.browsingData.removeHistory(options, () => {
            console.log('[StreamerMode]', 'Cleared browsing history.');
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
        }
    }
}

CensorSwitch.init();
CensorServer.listen();
