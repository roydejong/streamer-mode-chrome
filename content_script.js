/**
 * Represents an instruction to censor something.
 */
class CensorInstruction {
    /**
     * Initialize a new instruction.
     *
     * @param {string} cssSelector CSS Selector, must compatible with `document.querySelector()`.
     */
    constructor (cssSelector) {
        this.cssSelector = cssSelector;
    }

    /**
     * Queries the CSS selector in the document.
     *
     * @param document
     * @return {Element | HTMLElementTagNameMap[*] | SVGElementTagNameMap[*]}
     */
    queryCssSelectorAll(document) {
        return document.querySelectorAll(this.cssSelector);
    }
}

/**
 * Static utilities for executing censorship ops on the page.
 */
class CensorMan {
    static executeInstruction(censorInstruction) {
        let amountAffected = 0;

        if (censorInstruction.cssSelector) {
            console.log('CensorMan: Censor ' + censorInstruction.cssSelector);

            let selectedNodes = censorInstruction.queryCssSelectorAll(document);

            for (let i = 0; i < selectedNodes.length; i++) {
                CensorMan.applyCssCensor(selectedNodes[i]);
                amountAffected++;
            }
        }

        return amountAffected;
    }

    static applyCssCensor(htmlNode) {
        if (!htmlNode) {
            return false;
        }

        // Clear out the text component
        let prevText = htmlNode.textContent;
        htmlNode.textContent = "";

        for (let i = 0; i < prevText.length; i++) {
            htmlNode.textContent += "*";
        }

        // Ensure text & color have the same style, and no effects to reveal it
        htmlNode.style.cssText = "color: #ccc !important;" +
            "background: #ccc !important;" +
            "text-shadow: none !important;" +
            "word-wrap: break-word !important;"
        ;

        return true;
    }
}

/**
 * Utility class that monitors the DOM and runs filters if needed.
 */
class CensorRunner {
    constructor() {
        /**
         * Repository of censorship instructions to run in current context.
         *
         * @type {CensorInstruction[]}
         */
        this.instructions = [];
        /**
         * Controls whether censorship should be executed.
         * (This is updated to reflect the state of the streamer mode toggle)
         *
         * @type {boolean}
         */
        this.enabled = false;

        /**
         * Controls whether we have received any instructions.
         *
         * @type {boolean}
         */
        this.gotInstructions = false;
    }

    onDomReady() {
        this.interval = 100;
        this.resetIntervalTimer();
    }

    start(nodePollInterval, setInstructions) {
        if (setInstructions && setInstructions.length) {
            this.setInstructions(setInstructions);
        }

        this.userInterval = nodePollInterval || 1000;
        this.interval = 0;

        this.resetIntervalTimer();
    }

    resetIntervalTimer() {
        if (this.intervalTimer) {
            clearInterval(this.intervalTimer);
            this.intervalTimer = null;
        }

        this.intervalTimer = setInterval(() => {
            this.intervalTick();
        }, this.interval);
    }

    intervalTick() {
        chrome.runtime.sendMessage({text: "sync"}, (response) => {
            if (!response) {
                return;
            }

            response = JSON.parse(response);

            this.enabled = !!response.enabled;

            let forceRun = false;

            if (response.instructions_changed || !this.gotInstructions) {
                let instructions = [];

                for (let i = 0; i < response.instructions.length; i++) {
                    let instrData = response.instructions[i];
                    instructions.push(new CensorInstruction(instrData.selectors, instrData.sites));
                }

                if (instructions && instructions.length > 0) {
                    console.log(`[Streamer Mode] Received new filter list with ${instructions.length} items`);
                    this.setInstructions(instructions);
                    forceRun = true;
                }
            }

            if (this.enabled || forceRun) {
                this.run(forceRun);
            }
        });
    }

    /**
     * Add an instructions, and optionally forces a run.
     *
     * @param {CensorInstruction} instruction
     * @param {boolean} forceRun
     */
    addInstruction(instruction, forceRun) {
        this.instructions.push(instruction);

        if (forceRun) {
            this.run(true);
        }
    }

    /**
     * Set the list of instructions, and forces a run.
     *
     * @param {CensorInstruction[]} instructions
     */
    setInstructions(instructions) {
        this.instructions = instructions;
        this.run(true);

        if (instructions && instructions.length) {
            this.gotInstructions = true;
        }
    }

    /**
     * Performs a run.
     *
     * @param {boolean} forceRun
     */
    run(forceRun) {
        if (forceRun) {
            this.elementsInLastRun = -1;
        }

        // ---

        if (!this.enabled) {
            // Disabled (streamer mode is not enabled)
            return;
        }

        if (!this.instructions || !this.instructions.length) {
            // Nothing to do
            return;
        }

        // ---

        let elementsInRun = document.querySelectorAll("*").length || 0;

        if (elementsInRun === this.elementsInLastRun) {
            return;
        }

        this.elementsInLastRun = elementsInRun;

        // ---

        let total = 0;

        for (let i = 0; i < this.instructions.length; i++) {
            total = CensorMan.executeInstruction(this.instructions[i]);
        }

        if (total > 0) {
            console.log("Streamer mode censor: Affected " + total + " elements out of " + elementsInRun + " total");
        }
    }
}

// Start
let runner = new CensorRunner();
runner.start();

// Notify runner on DOM ready event
document.addEventListener('DOMContentLoaded', () => {
    runner.onDomReady();
}, false);