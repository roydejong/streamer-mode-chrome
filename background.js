class CensorSwitch {
    static init() {
        chrome.storage.sync.get("streamer_mode_on", (result) => {
            this._value = (!!result);
        });
    }

    static getIsOn() {
        return !!this._value;
    }

    static getIsOff() {
        return !this._value;
    }

    static turnOn() {
        this._value = true;
        chrome.storage.sync.set({"streamer_mode_on": true});
        console.log('StreamerMode is now enabled.');
    }

    static turnOff() {
        this._value = false;
        chrome.storage.sync.set({"streamer_mode_on": false});
        console.log('StreamerMode is now disabled.');
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

            default:
                console.warn("[StreamerMode:background] Cannot process extension message; unrecognized header:", msg);
                break;
        }
    }

    static handleContentMessage(msg, sender, reply) {
        reply(JSON.stringify({
            "enabled": !!CensorSwitch.getIsOn()
        }));
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

        let censorIsOn = CensorSwitch.getIsOn();

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
        }
    }
}

CensorSwitch.init();
CensorServer.listen();
