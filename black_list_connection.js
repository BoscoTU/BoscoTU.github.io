function openBlacklistDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('blacklist', 1); // Use the actual DB name and version

        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            console.log('Upgrading database...');

            if (!db.objectStoreNames.contains('blacklist')) {
                const objectStore = db.createObjectStore('blacklist', { keyPath: 'id' });
                
                // Create indices for the object store
                objectStore.createIndex('byName', 'name', { unique: false });
                objectStore.createIndex('byClass', 'class', { unique: false });
                objectStore.createIndex('byClassNumber', 'class_number', { unique: false });
            }
        };

        request.onsuccess = function(event) {
            console.log('Database opened successfully.');
            resolve(event.target.result);
        };

        request.onerror = function(event) {
            console.error('Error opening database:', event.target.error);
            reject(event.target.error);
        };

        request.onblocked = function() {
            console.error('Database upgrade blocked. Please close other tabs or applications using this database.');
            reject(new Error('Database upgrade blocked.'));
        };
    });
}

function initializeBlacklistSync() {
    const blacklistDBName = 'blacklist';
    syncBlacklistFromServerToLocal(blacklistDBName).catch(error => {
        console.error('Error initializing blacklist sync:', error);
    });
}

function syncBlacklistFromServerToLocal(dbName) {
    console.log("Starting syncBlacklistFromServerToLocal with database:", dbName);

    return fetch('handle_all_blacklist.php', {
        method: 'GET', // Sending a GET request to retrieve blacklist data
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("Blacklist server data received:", data);

        if (Array.isArray(data) && data.length > 0) {
            console.log("Blacklist data is an array and contains elements.");

            // Delete the old database
            console.log("Deleting old blacklist database...");
            return deleteOldBlacklistDatabase(dbName)
                .then(() => {
                    console.log("Old blacklist database deleted. Opening new IndexedDB instance...");
                    return openBlacklistDB(dbName);
                })
                .then(db => {
                    console.log("New blacklist IndexedDB instance opened:", db);

                    const transaction = db.transaction('blacklist', 'readwrite');
                    const store = transaction.objectStore('blacklist');

                    data.forEach(doc => {
                        try {
                            store.put(doc);
                            console.log("Stored blacklist document:", doc);
                        } catch (error) {
                            console.error('Error adding blacklist document to store:', error);
                        }
                    });

                    return new Promise((resolve, reject) => {
                        transaction.oncomplete = () => {
                            console.log("Blacklist transaction complete. All records stored.");
                            resolve();
                        };

                        transaction.onerror = function(event) {
                            console.error('Blacklist transaction error:', event.target.error);
                            reject(event.target.error);
                        };
                    });
                });
        } else {
            console.warn("No blacklist data received from the server or data is not in the expected format.");
            return Promise.resolve(); // Resolve if no data or incorrect format
        }
    })
    .catch(error => {
        console.error("Error during blacklist initial sync:", error);
    });
}



function deleteOldBlacklistDatabase(dbName) {
    return new Promise((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(dbName);

        deleteRequest.onsuccess = function() {
            console.log('Old blacklist database deleted successfully');
            resolve();
        };

        deleteRequest.onerror = function(event) {
            console.error('Error deleting old blacklist database:', event.target.error);
            reject(event.target.error);
        };

        deleteRequest.onblocked = function() {
            console.warn('Blacklist delete operation blocked. Please close all other tabs with this database open.');
            reject(new Error('Blacklist delete operation blocked'));
        };
    });
}

function syncLocalBlacklistWithServer() {
    blacklistDB.allDocs({ include_docs: true }) // Replace with actual PouchDB for blacklist
        .then(function (result) {
            let syncData = result.rows.map(row => row.doc);

            return fetch('sync_blacklist_data.php', { // Assuming this PHP file handles syncing
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(syncData)
            });
        })
        .then(response => response.json())
        .then(data => {
            console.log('Blacklist sync complete:', data);
        })
        .catch(error => {
            console.error('Blacklist sync error:', error);
        });
}

async function sendBlacklistDataToServer(blacklistEntry, method) {
    try {
        const response = await fetch('blacklist_handler.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ...blacklistEntry, method }),
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.success) {
            console.log(`Blacklist entry successfully ${method === 'add' ? 'added' : 'removed'} from the server.`);
        } else {
            console.error(`Failed to ${method === 'add' ? 'add' : 'remove'} blacklist entry from the server:`, result.message);
        }
    } catch (error) {
        console.error('Error sending blacklist data to server:', error);
    }
}



function writeToLocalBlacklist(blacklistEntry) {
    return openBlacklistDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('blacklist', 'readwrite');
            const store = transaction.objectStore('blacklist');

            const request = store.put(blacklistEntry);

            request.onsuccess = function(event) {
                console.log('Entry added to local blacklist:', blacklistEntry);
                resolve(event);
            };

            request.onerror = function(event) {
                console.error('Error adding to local blacklist:', event.target.error);
                reject(event.target.error);
            };

            transaction.oncomplete = function() {
                console.log('Transaction completed: database modification finished.');
            };

            transaction.onerror = function(event) {
                console.error('Transaction not opened due to error:', event.target.error);
                reject(event.target.error);
            };

            transaction.onabort = function(event) {
                console.error('Transaction aborted due to error:', event.target.error);
                reject(event.target.error);
            };
        });
    });
}

// Fetch blacklist from server


// Delete a blacklist entry
function deleteBlackListEntry(id) {
    fetch('handle_all_blacklist.php', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ id: id })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data.message);
        fetchBlackList(); // Refresh the list
    })
    .catch(error => {
        console.error('Error deleting blacklist entry:', error);
    });
}

async function find_people_from_black_list(id) {
    try {
        const response = await fetch('handle_all_blacklist.php', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }

        const blacklist = await response.json();
        console.log('Blacklist Data:', blacklist); // Debugging line

        const entry = blacklist.find(person => parseInt(person.id) === parseInt(id));

        if (entry) {
            return entry;
        } else {
            console.log(`No blacklist entry found for ID ${id}.`);
            return null;
        }
    } catch (error) {
        console.error('Error fetching blacklist data:', error);
        return null;
    }
}

async function deleteFromLocalBlacklist(id) {
    try {
        // Open the IndexedDB
        const db = await openBlacklistDB();
        const transaction = db.transaction(['blacklist'], 'readwrite');
        const objectStore = transaction.objectStore('blacklist');

        // Delete the entry with the specified ID
        const request = objectStore.delete(id);

        // Handle success
        request.onsuccess = function() {
            console.log(`Blacklist entry with ID ${id} deleted successfully from local database.`);
        };

        // Handle errors
        request.onerror = function(event) {
            console.error(`Error deleting blacklist entry with ID ${id}:`, event.target.error);
        };

        // Wait for the transaction to complete
        await new Promise((resolve, reject) => {
            transaction.oncomplete = function() {
                resolve();
            };
            transaction.onerror = function(event) {
                reject(event.target.error);
            };
        });

    } catch (error) {
        console.error('Error opening or deleting from the local blacklist database:', error);
    }
}

