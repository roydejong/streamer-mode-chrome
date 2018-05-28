class CensorDb {
    static init() {
        this.connection = idb.open('streamermode-filters', 1, this.handleUpgrade.bind(this));
    }

    static handleUpgrade(uDb) {
        console.log(`[Streamer Mode] Creating or upgrading database schema. Old version: ${uDb.oldVersion}`);

        // ! \\  WARNING:       Do not use "break", the fall through behavior is what we want here!
        switch (uDb.oldVersion) {
            // Version 0 -> 1: Database creation
            case 0:
                uDb.createObjectStore('rules', {
                    autoIncrement: true
                });
        }
        // ! \\  WARNING:       Do not use "break", the fall through behavior is what we want here!
    }

    static addOrUpdateRule(ruleObj) {
        return new Promise((resolve, reject) => {
            this.connection.then((db) => {
                let tx = db.transaction('rules', 'readwrite');

                let updateKey = ruleObj.key || undefined;
                if (updateKey) delete ruleObj.key;

                tx.objectStore('rules').put(ruleObj, updateKey)
                    .then((a) => resolve(a))
                    .catch(err => reject(err));
            })
            .catch(err => reject(err));
        });
    }

    static getAllRules() {
        return new Promise((resolve, reject) => {
            this.connection.then((db) => {
                let tx = db.transaction('rules');
                let objs = {};

                tx.objectStore('rules').iterateCursor(cursor => {
                    if (!cursor) return;
                    objs[cursor.primaryKey] = cursor.value;
                    cursor.continue();
                })

                tx.complete.then(() => {
                    console.log('getall', objs);
                    resolve(objs);
                })
                    .catch(err => reject(err));
            })
                .catch(err => reject(err));
        });
    }

    static dbPromise() {
        return this.connection;
    }
}

CensorDb.init();