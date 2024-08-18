

// Add an item to IndexedDB and server DB
function addItem(item) {
    return initializeItemInputDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['itemInput'], 'readwrite');
            const store = transaction.objectStore('itemInput');

            // Add or update the item in IndexedDB
            const request = store.put(item);

            
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

/*function initializeItemInputSync() {
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
*/
