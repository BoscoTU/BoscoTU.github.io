function initializeItemInputDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('itemInputDB', 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('itemInput')) {
                db.createObjectStore('itemInput', { keyPath: 'item' });
            }
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject('Error opening IndexedDB');
        };
    });
}


// Add an item to IndexedDB and server DB
function addItem(item) {
    return initializeItemInputDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['itemInput'], 'readwrite');
            const store = transaction.objectStore('itemInput');

            // Add or update the item in IndexedDB
            const request = store.put(item);

            request.onsuccess = () => {
                // If successful, add the item to the server DB
                fetch('add_item.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(item)
                })
                .then(response => response.json())
                .then(serverResponse => {
                    if (serverResponse.success) {
                        resolve(serverResponse.message);
                    } else {
                        reject(serverResponse.message);
                    }
                })
                .catch(error => {
                    reject('Error adding item to server: ' + error);
                });
            };

            request.onerror = () => {
                reject('Error adding item to IndexedDB');
            };
        });
    });
}


// Delete an item from IndexedDB and server DB by its item name
function removeItemByName(itemName) {
    return initializeItemInputDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['itemInput'], 'readwrite');
            const store = transaction.objectStore('itemInput');

            // Delete the item from IndexedDB
            const request = store.delete(itemName);

            request.onsuccess = () => {
                // If successful, delete the item from the server DB
                fetch('remove_item.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ item: itemName })
                })
                .then(response => response.json())
                .then(serverResponse => {
                    if (serverResponse.success) {
                        resolve(serverResponse.message);
                    } else {
                        reject(serverResponse.message);
                    }
                })
                .catch(error => {
                    reject('Error deleting item from server: ' + error);
                });
            };

            request.onerror = () => {
                reject('Error deleting item from IndexedDB');
            };
        });
    });
}



function fetchItemInputFromLocalDB() {
    return initializeItemInputDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['itemInput'], 'readonly');
            const store = transaction.objectStore('itemInput');
            const request = store.getAll();

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = () => {
                reject('Error fetching items from IndexedDB');
            };
        });
    });
}


// Fetch item_input data from the server
function fetchItemInputFromServer() {
    fetch('read_item_input.php', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        // Update local IndexedDB with the latest data from the server
        updateLocalItemInputDB(data);
        populateItemInputTable(data);
    })
    .catch(error => {
        console.error('Error fetching item input from server:', error);
    });
}

// Update local IndexedDB with data from the server
function updateLocalItemInputDB(data) {
    return initializeItemInputDB().then(db => {
        const transaction = db.transaction(['itemInput'], 'readwrite');
        const store = transaction.objectStore('itemInput');

        data.forEach(item => {
            store.put(item);
        });
    });
}

function initializeItemInputSync() {
    return new Promise((resolve, reject) => {
        // Step 1: Open and initialize IndexedDB
        initializeItemInputDB()
            .then(db => {
                // Step 2: Fetch data from the server
                return fetch('read_item_input.php', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    // Step 3: Store data in IndexedDB
                    const transaction = db.transaction('itemInput', 'readwrite');
                    const objectStore = transaction.objectStore('itemInput');
                    
                    data.forEach(item => {
                        const request = objectStore.put(item); // Use put to update or add
                        request.onsuccess = () => {
                            console.log('Data added to IndexedDB:', item);
                        };
                        request.onerror = () => {
                            console.error('Error adding data to IndexedDB:', request.error);
                        };
                    });

                    transaction.oncomplete = () => {
                        resolve('Synchronization complete');
                    };

                    transaction.onerror = () => {
                        reject('Error during transaction');
                    };
                })
                .catch(error => {
                    reject(`Error fetching data from server: ${error.message}`);
                });
            })
            .catch(error => {
                reject(`Error initializing IndexedDB: ${error}`);
            });
    });
}

