let actionHistoryDB; // Declare actionHistoryDB in the global scope

// Function to initialize synchronization on page load
function initializeSync() {
    // Pass the correct database name to syncFromServerToLocal
    const dbName = 'actionHistoryDB'; // Replace with your actual database name
    /*syncFromServerToLocal(dbName).catch(error => {
        console.error('Error initializing sync:', error);
    }*/;
}

/*function syncFromServerToLocal(dbName) {
    console.log("Starting syncFromServerToLocal with database:", dbName);

    return fetch('get_initial_data.php')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Server data received:", data);

            if (Array.isArray(data) && data.length > 0) {
                console.log("Data is an array and contains elements.");

                // Data is in the expected format, proceed to delete the old database
                console.log("Deleting old database...");
                return deleteOldDatabase(dbName)
                    .then(() => {
                        console.log("Old database deleted. Opening new IndexedDB instance...");
                        return openIndexedDB(dbName);
                    })
                    .then(db => {
                        console.log("New IndexedDB instance opened:", db);

                        const transaction = db.transaction('actionHistoryDB', 'readwrite');
                        const store = transaction.objectStore('actionHistoryDB');

                        // Filter out records with can_borrow: 1 before storing
                        const filteredData = data.filter(doc => doc.can_borrow !== 1);
                        console.log("Filtered data to be stored:", filteredData);

                        filteredData.forEach(doc => {
                            try {
                                store.put(doc);
                                console.log("Stored document:", doc);
                            } catch (error) {
                                console.error('Error adding document to store:', error);
                            }
                        });

                        // Ensure the filtered data is added before proceeding
                        return new Promise((resolve, reject) => {
                            transaction.oncomplete = () => {
                                console.log("Transaction complete. Now deleting records with can_borrow: 1...");
                                const deleteTransaction = db.transaction('actionHistoryDB', 'readwrite');
                                const deleteStore = deleteTransaction.objectStore('actionHistoryDB');
                                const deleteRequest = deleteStore.openCursor();

                                deleteRequest.onsuccess = function(event) {
                                    const cursor = event.target.result;
                                    if (cursor) {
                                        if (cursor.value.can_borrow === '1') {
                                            console.log("Deleting document:", cursor.value);
                                            cursor.delete();
                                        }
                                        cursor.continue();
                                    } else {
                                        console.log("All records processed. Resolving deletion promise.");
                                        resolve();
                                    }
                                };

                                deleteRequest.onerror = function(event) {
                                    console.error('Error while deleting records:', event.target.error);
                                    reject(event.target.error);
                                };
                            };

                            transaction.onerror = function(event) {
                                console.error('Transaction error:', event.target.error);
                                reject(event.target.error);
                            };
                        });
                    });
            } else {
                console.warn("No data received from the server or data is not in the expected format.");
                return Promise.resolve(); // Resolve if no data or incorrect format
            }
        })
        .catch(error => {
            console.error("Error during initial sync:", error);
        });
}
*/





function deleteOldDatabase(dbName) {
    return new Promise((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(dbName);

        deleteRequest.onsuccess = function () {
            console.log(`Database ${dbName} deleted successfully.`);
            resolve();
        };

        deleteRequest.onerror = function (event) {
            console.error(`Failed to delete the database ${dbName}:`, event.target.errorCode);
            reject(new Error('Failed to delete the old database.'));
        };

        deleteRequest.onblocked = function () {
            console.warn(`Delete request for ${dbName} database is blocked.`);
            reject(new Error('Delete request is blocked.'));
        };
    });
}

function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('actionHistoryDB', 2); // Use correct database name and version

        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            console.log('Upgrading actionHistoryDB database...');

            if (!db.objectStoreNames.contains('actionHistoryDB')) {
                const objectStore = db.createObjectStore('actionHistoryDB', { keyPath: 'id' });
                // Define indices if needed
                objectStore.createIndex('byTimestamp', 'timestamp', { unique: false });
                objectStore.createIndex('byAction', 'action', { unique: false });
                objectStore.createIndex('byCanBorrow', 'can_borrow', { unique: false });
                objectStore.createIndex('byName', 'name', { unique: false });
                objectStore.createIndex('byClass', 'class', { unique: false });
                objectStore.createIndex('byClassNumber', 'class_number', { unique: false });
                objectStore.createIndex('byDate', 'date', { unique: false });
                objectStore.createIndex('byPeriod', 'period', { unique: false });
                objectStore.createIndex('byItemDealtWith', 'item_dealt_with', { unique: false });
                objectStore.createIndex('byAdditionalInformation', 'additional_information', { unique: false });
            }
        };

        request.onsuccess = function(event) {
            console.log('actionHistoryDB opened successfully.');
            resolve(event.target.result);
        };

        request.onerror = function(event) {
            console.error('Error opening actionHistoryDB:', event.target.error);
            reject(event.target.error);
        };

        request.onblocked = function() {
            console.error('Database upgrade blocked. Please close other tabs or applications using this database.');
            reject(new Error('Database upgrade blocked.'));
        };
    });
}

function get_detail(userid, type) {
    console.log("Starting get_detail with userid:", userid, "and type:", type);

    return openIndexedDB() // Ensure the database is open
        .then(db => {
            console.log("IndexedDB opened successfully.");

            return getFromLocalDB(db, userid, type) // Get from local DB with the open database
                .then(value => {
                    console.log("Retrieved value from local DB:", value);

                    // Check if the value meets the expected criteria
                    if (value !== null && typeof value === 'object' && value.hasOwnProperty(type)) {
                        console.log("Data found in local DB:", value);
                        return value;
                    } else {
                        console.log("Data not found in local DB or does not meet criteria. Fetching from server...");
                        // Data not found or does not meet criteria, fall back to server
                        /*return fetchFromServer(userid, type)
                            .then(serverData => {
                                console.log("Data fetched from server:", serverData);

                                // Validate and store the fetched data in IndexedDB
                                if (serverData && typeof serverData === 'object' && serverData.hasOwnProperty(type)) {
                                    const transaction = db.transaction('actionHistoryDB', 'readwrite');
                                    const store = transaction.objectStore('actionHistoryDB');
                                    
                                    store.put({ id: userid, [type]: serverData });

                                    return new Promise((resolve, reject) => {
                                        transaction.oncomplete = () => {
                                            console.log("Data stored in local DB successfully.");
                                            resolve(serverData);
                                        };

                                        transaction.onerror = (event) => {
                                            console.error("Transaction error:", event.target.error);
                                            reject(event.target.error);
                                        };
                                    });
                                } else {
                                    console.log("Fetched data from server does not meet criteria.");
                                    return null;
                                }
                            });*/
                    }
                });
        })
        .catch(err => {
            console.error("Error getting user detail:", err);
            // On error, fall back to fetching data from the server
            //return fetchFromServer(userid, type);
        });
}

function getFromLocalDB(db, id, type) {
    console.log("Retrieving from local DB with id:", id, "and type:", type);

    return new Promise((resolve, reject) => {
        if (!(db instanceof IDBDatabase)) {
            reject('Invalid database instance.');
            return;
        }

        const transaction = db.transaction('actionHistoryDB', 'readonly'); // Correct object store name
        const store = transaction.objectStore('actionHistoryDB'); // Correct object store name

        const request = store.get(id);

        request.onsuccess = function (event) {
            const data = event.target.result;
            console.log("Raw data retrieved from local DB:", data);

            if (data !== null && typeof data === 'object' && data.hasOwnProperty(type)) {
                console.log("Data meets criteria:", data);
                resolve(data); // Return the whole data object that meets the criteria
            } else {
                console.log("No data found or does not meet criteria in local DB for id:", id);
                resolve(null); // No data found or does not meet criteria
            }
        };

        request.onerror = function (event) {
            console.error('Error retrieving data from local DB:', event.target.errorCode);
            reject('Error retrieving data: ' + event.target.errorCode);
        };
    });
}



// Execute the initialization function when the page is fully loaded



function sendBorrowDataToServer(borrowData) {
    // Ensure IndexedDB is initialized before proceeding
    return openIndexedDB()
        .then(db => {
            // Once IndexedDB is initialized, perform the save and sync operations
            const transaction = db.transaction('actionHistoryDB', 'readwrite');
            const store = transaction.objectStore('actionHistoryDB');

            return new Promise((resolve, reject) => {
                const request = store.put(borrowData);
                request.onsuccess = function () {
                    resolve(); // Resolve once local save is successful
                };
                request.onerror = function (event) {
                    reject('Error saving data to local IndexedDB: ' + event.target.errorCode);
                };
            });
        })
        
}

// Function to sync local PouchDB with MySQL through PHP
function syncLocalDBWithServer() {
 
}

