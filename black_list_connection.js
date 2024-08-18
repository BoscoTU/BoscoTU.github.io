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
    //syncBlacklistFromServerToLocal(blacklistDBName).catch(error => {
        console.error('Error initializing blacklist sync:', error);
    };






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

function deleteBlackListEntry(id) {
    // First, delete the entry from the server
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

        // Now, delete the entry from the local IndexedDB
        openBlacklistDB().then(db => {
            const transaction = db.transaction(['blacklist'], 'readwrite');
            const objectStore = transaction.objectStore('blacklist');

            const request = objectStore.delete(id);

            request.onsuccess = () => {
                console.log('Entry deleted from local DB.');
                fetchBlackList(); // Refresh the list
            };

            request.onerror = () => {
                console.error('Error deleting entry from local DB:', request.error);
            };
        }).catch(error => {
            console.error('Error opening local DB:', error);
        });
    })
    .catch(error => {
        console.error('Error deleting blacklist entry from server:', error);
    });
}

//new function ,need use
async function find_people_from_black_list(id) {
    try {
        // Try fetching data from the server first
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
        console.error('Error fetching blacklist data from server:', error);
        
        // If server fetch fails, try fetching from local DB
        try {
            const db = await openBlacklistDB();
            const transaction = db.transaction(['blacklist'], 'readonly');
            const objectStore = transaction.objectStore('blacklist');
            const request = objectStore.get(id);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    if (request.result) {
                        console.log('Found entry in local DB:', request.result);
                        resolve(request.result);
                    } else {
                        console.log(`No local DB entry found for ID ${id}.`);
                        resolve(null);
                    }
                };

                request.onerror = () => {
                    console.error('Error fetching data from local DB:', request.error);
                    reject(null);
                };
            });
        } catch (dbError) {
            console.error('Error accessing local DB:', dbError);
            return null;
        }
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

