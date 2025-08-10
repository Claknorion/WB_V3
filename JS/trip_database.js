// trip_database.js - Database operations & data management

// Initialize database module
function initializeTripDatabase() {
    console.log("Trip Database - Initializing...");
    
    // Load sidebar from database on initialization
    loadSidebarFromDatabase();
    
    console.log("Trip Database - Initialized successfully");
}

// Load sidebar from database
function loadSidebarFromDatabase() {
    const uid = window.currentUID || (window.location.search.match(/uid=([^&]+)/)?.[1] || '');
    if (!uid) {
        console.warn('No UID found for loading sidebar from database');
        return;
    }
    
    fetch(`../PHP/get_trip_items.php?uid=${encodeURIComponent(uid)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.items) {
                console.log('All items from database:', data.items);
                
                // Clear current tripItems and repopulate from database
                if (typeof tripItems !== 'undefined') {
                    tripItems.length = 0;
                    
                    // Filter to show only main items (exclude extras ending with a, b, c, etc.)
                    const mainItems = data.items.filter(dbItem => {
                        // Extras end with a single letter (a, b, c, etc.) after the main ReisID
                        const endsWithLetter = /[a-z]$/.test(dbItem.ReisID);
                        console.log(`Item ${dbItem.ReisID}: endsWithLetter=${endsWithLetter}`);
                        return !endsWithLetter; // Exclude items ending with letters (extras)
                    });
                    
                    console.log('Filtered main items:', mainItems);
                    
                    mainItems.forEach(dbItem => {
                        // Calculate total including extras for this main item
                        const relatedExtras = data.items.filter(item => 
                            item.ReisID.startsWith(dbItem.ReisID) && 
                            item.ReisID !== dbItem.ReisID && 
                            /[a-z]$/.test(item.ReisID)
                        );
                        
                        console.log(`Main item ${dbItem.ReisID} has ${relatedExtras.length} extras:`, relatedExtras);
                        
                        const mainTotal = parseFloat(dbItem.Gross || 0);
                        const extrasTotal = relatedExtras.reduce((sum, extra) => 
                            sum + parseFloat(extra.Gross || 0), 0
                        );
                        
                        const item = {
                            id: dbItem.ReisID,
                            date: dbItem.Datum_aanvang,
                            endDate: dbItem.Datum_einde, // Add end date for smart date calculations
                            time: dbItem.Tijd_aanvang || '',
                            city: dbItem.Locatie_stad || '',
                            title: dbItem.Supplier_naam || '',
                            hotelName: dbItem.Supplier_naam || '',
                            roomName: dbItem.Supplier_product || '',
                            total: mainTotal + extrasTotal, // Show combined total
                            currency: dbItem.Gross_valuta || '',
                            sequence: parseInt(dbItem.Sequence || 0),
                            hasExtras: relatedExtras.length > 0,
                            extrasCount: relatedExtras.length,
                            productType: dbItem.Product_type || '', // Add product type for accommodation detection
                            // Keep original database fields for smart date calculations
                            Datum_aanvang: dbItem.Datum_aanvang,
                            Datum_einde: dbItem.Datum_einde,
                            Product_type: dbItem.Product_type
                        };
                        tripItems.push(item);
                    });
                    
                    // Update sidebar display
                    if (typeof updateSidebar === 'function') {
                        updateSidebar();
                    }
                    console.log('Sidebar loaded from database:', tripItems.length, 'main items');
                }
            } else {
                console.error('Failed to load sidebar from database:', data.error);
            }
        })
        .catch(error => {
            console.error('Error loading sidebar from database:', error);
        });
}

// Save to database then reload sidebar
function saveToDBThenReloadSidebar(dbItems) {
    // Save all items to database
    Promise.all(dbItems.map(item => 
        fetch('../PHP/save_trip_item.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        }).then(response => response.json())
    )).then(results => {
        console.log('All items saved to database:', results);
        
        // Reload sidebar from database to ensure sync
        loadSidebarFromDatabase();
        
        // Clear UI after successful save
        if (typeof clearUIAfterAdd === 'function') {
            clearUIAfterAdd();
        }
        
    }).catch(error => {
        console.error('Error saving items to database:', error);
    });
}

// Save trip item to database
function saveTripItemToDB(item, callback) {
    console.log('Saving item to database:', item);
    fetch('../PHP/save_trip_item.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    })
    .then(res => res.json())
    .then(data => {
        if (callback) callback(data);
        if (data.success) {
            console.log('Trip item saved successfully:', item.ReisID);
        } else {
            console.error('Save error:', data.error);
        }
    })
    .catch(err => {
        console.error('Save error:', err);
    });
}

// Load item from database for editing
function loadItemFromDatabase(reisID) {
    const uid = window.currentUID || (window.location.search.match(/uid=([^&]+)/)?.[1] || '');
    
    fetch(`../PHP/get_trip_items.php?uid=${encodeURIComponent(uid)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.items) {
                // Find the main item we're editing
                const mainItem = data.items.find(item => item.ReisID === reisID);
                
                if (!mainItem) {
                    console.error('Main item not found for editing:', reisID);
                    return;
                }
                
                // Find all extras for this main item
                const extras = data.items.filter(item => 
                    item.ReisID.startsWith(reisID) && 
                    item.ReisID !== reisID && 
                    /[a-z]$/.test(item.ReisID)
                );
                
                console.log('Found main item to edit:', mainItem, 'with extras:', extras);
                
                // Fill form fields with existing data
                const dateInput = document.getElementById('date');
                if (dateInput) dateInput.value = mainItem.Datum_aanvang || '';
                
                const timeInput = document.getElementById('time');
                if (timeInput) timeInput.value = mainItem.Tijd_aanvang || '';
                
                const cityInput = document.getElementById('searchCity');
                if (cityInput) cityInput.value = mainItem.Locatie_stad || '';
                
                const nightsInput = document.getElementById('searchNights');
                if (nightsInput) {
                    // Calculate nights from start and end date
                    if (mainItem.Datum_aanvang && mainItem.Datum_einde) {
                        const start = new Date(mainItem.Datum_aanvang);
                        const end = new Date(mainItem.Datum_einde);
                        const nights = Math.round((end - start) / (1000 * 60 * 60 * 24));
                        nightsInput.value = nights;
                    }
                }
                
                const nameInput = document.getElementById('searchName');
                if (nameInput) nameInput.value = mainItem.Supplier_naam || '';
                
                // Set main type to accommodatie and show the fields
                const mainTypeSelect = document.getElementById('mainType');
                if (mainTypeSelect) {
                    mainTypeSelect.value = 'accommodatie';
                    if (typeof handleTypeChange === 'function') {
                        handleTypeChange(); // This will show the accommodation fields
                    }
                }
                
                // Search for the hotel to load it in the interface
                if (mainItem.Supplier_naam || mainItem.Locatie_stad) {
                    if (typeof searchHotels === 'function') {
                        searchHotels();
                    }
                    
                    // Wait a moment for hotels to load, then auto-select
                    setTimeout(() => {
                        if (typeof allHotels !== 'undefined') {
                            const hotel = allHotels.find(h => 
                                h.Product === mainItem.Supplier_naam || 
                                h.Code === mainItem.Product_code
                            );
                            
                            if (hotel && typeof selectHotel === 'function') {
                                console.log('Found matching hotel:', hotel);
                                selectHotel(hotel.Code, parseInt(nightsInput.value) || 1, hotel.Currency);
                                
                                // Wait for room types to load, then auto-select room
                                setTimeout(() => {
                                    if (typeof autoSelectRoomAndExtras === 'function') {
                                        autoSelectRoomAndExtras(mainItem, extras);
                                    }
                                }, 500);
                            }
                        }
                    }, 500);
                }
                
                // Update buttons for edit mode
                if (typeof updateButtonsForEditMode === 'function') {
                    updateButtonsForEditMode(true);
                }
                
                // Add visual indication that we're in edit mode
                const sidebar = document.querySelector('.sidebar');
                if (sidebar) {
                    // Remove any existing edit indicators
                    sidebar.querySelectorAll('.item').forEach(item => item.classList.remove('editing'));
                    // Add edit indicator to selected item
                    const selectedItem = sidebar.querySelector(`[data-reis-id="${reisID}"]`);
                    if (selectedItem) {
                        selectedItem.classList.add('editing');
                    }
                }
            } else {
                console.error('Failed to load items for editing:', data.error);
            }
        })
        .catch(error => {
            console.error('Error loading item for editing:', error);
        });
}

// Delete item from database
function deleteItemFromDatabase(reisID, callback) {
    const uid = window.currentUID || (window.location.search.match(/uid=([^&]+)/)?.[1] || '');
    
    const formData = new FormData();
    formData.append('action', 'delete_item');
    formData.append('reis_id', reisID);
    formData.append('uid', uid);
    
    fetch('../PHP/save_trip_item.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (callback) callback(data);
        if (data.success) {
            console.log('Item deleted successfully from database:', reisID);
        } else {
            console.error('Error deleting item from database:', data.error);
        }
    })
    .catch(error => {
        console.error('Error deleting item from database:', error);
        if (callback) callback({ success: false, error: error.message });
    });
}

// Update item in database
function updateItemInDatabase(dbItems, callback) {
    // Save updated items to database
    Promise.all(dbItems.map(item => 
        fetch('../PHP/save_trip_item.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        }).then(response => response.json())
    )).then(results => {
        console.log('All updated items saved to database:', results);
        
        if (callback) callback({ success: true, results });
        
        // Reload sidebar from database to ensure sync
        loadSidebarFromDatabase();
        
    }).catch(error => {
        console.error('Error updating items in database:', error);
        if (callback) callback({ success: false, error: error.message });
    });
}

// Get file info from database
function getFileInfoFromDatabase(uid, callback) {
    if (!uid || uid === 'UID') {
        console.log('No valid UID provided for file info lookup');
        if (callback) callback({ success: false, error: 'No valid UID' });
        return;
    }
    
    const url = `../PHP/get_file_info.php?uid=${uid}`;
    console.log('Fetching file info from:', url);
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(responseText => {
            console.log('Raw file info response:', responseText);
            
            try {
                const fileInfo = JSON.parse(responseText);
                console.log('Parsed file info:', fileInfo);
                
                if (callback) callback({ success: true, data: fileInfo });
                
                return fileInfo;
            } catch (parseError) {
                console.error('Failed to parse file info JSON:', parseError);
                console.error('Response was:', responseText);
                
                if (callback) callback({ success: false, error: 'Invalid JSON response' });
                throw new Error('Invalid JSON response from server');
            }
        })
        .catch(error => {
            console.error('Error loading file info from database:', error);
            if (callback) callback({ success: false, error: error.message });
        });
}

// Search accommodations from database
function searchAccommodationsFromDatabase(searchParams, callback) {
    const { stad = '', naam = '' } = searchParams;
    
    let url = '../PHP/search_accommodatie.php?';
    if (stad) url += `stad=${encodeURIComponent(stad)}&`;
    if (naam) url += `naam=${encodeURIComponent(naam)}&`;
    
    console.log('Searching accommodations:', url);
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log('Accommodation search results:', data);
            if (callback) callback({ success: true, data });
        })
        .catch(error => {
            console.error('Error searching accommodations:', error);
            if (callback) callback({ success: false, error: error.message });
        });
}

// Get room types from database
function getRoomTypesFromDatabase(hotelCode, callback) {
    if (!hotelCode) {
        console.error('No hotel code provided for room types lookup');
        if (callback) callback({ success: false, error: 'No hotel code provided' });
        return;
    }
    
    const url = `../PHP/get_room_types.php?code=${encodeURIComponent(hotelCode)}`;
    console.log('Fetching room types from:', url);
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log('Room types response:', data);
            if (callback) callback({ success: true, data });
        })
        .catch(error => {
            console.error('Error loading room types from database:', error);
            if (callback) callback({ success: false, error: error.message });
        });
}

// Database utility functions
function validateDatabaseResponse(response, operation = 'database operation') {
    if (!response) {
        throw new Error(`No response received for ${operation}`);
    }
    
    if (response.error) {
        throw new Error(`Database error in ${operation}: ${response.error}`);
    }
    
    if (!response.success) {
        throw new Error(`${operation} failed: ${response.message || 'Unknown error'}`);
    }
    
    return true;
}

function formatDatabaseError(error, operation = 'database operation') {
    console.error(`Database error in ${operation}:`, error);
    return {
        success: false,
        error: error.message || error.toString(),
        operation,
        timestamp: new Date().toISOString()
    };
}

// Database connection test
function testDatabaseConnection(callback) {
    console.log('Testing database connection...');
    
    fetch('../PHP/test_connection.php')
        .then(response => response.json())
        .then(data => {
            console.log('Database connection test result:', data);
            if (callback) callback(data);
        })
        .catch(error => {
            console.error('Database connection test failed:', error);
            if (callback) callback({ success: false, error: error.message });
        });
}

// Backup/export functions
function exportTripData(uid, callback) {
    if (!uid) {
        console.error('No UID provided for trip data export');
        if (callback) callback({ success: false, error: 'No UID provided' });
        return;
    }
    
    const url = `../PHP/export_trip_data.php?uid=${encodeURIComponent(uid)}`;
    console.log('Exporting trip data from:', url);
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log('Trip data export result:', data);
            if (callback) callback(data);
        })
        .catch(error => {
            console.error('Error exporting trip data:', error);
            if (callback) callback({ success: false, error: error.message });
        });
}

function importTripData(uid, tripData, callback) {
    if (!uid || !tripData) {
        console.error('Missing UID or trip data for import');
        if (callback) callback({ success: false, error: 'Missing required data' });
        return;
    }
    
    const formData = new FormData();
    formData.append('uid', uid);
    formData.append('trip_data', JSON.stringify(tripData));
    
    fetch('../PHP/import_trip_data.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log('Trip data import result:', data);
        if (callback) callback(data);
        
        // Reload sidebar after successful import
        if (data.success) {
            loadSidebarFromDatabase();
        }
    })
    .catch(error => {
        console.error('Error importing trip data:', error);
        if (callback) callback({ success: false, error: error.message });
    });
}

// Statistics and analytics
function getTripStatistics(uid, callback) {
    if (!uid) {
        console.error('No UID provided for statistics');
        if (callback) callback({ success: false, error: 'No UID provided' });
        return;
    }
    
    const url = `../PHP/get_trip_statistics.php?uid=${encodeURIComponent(uid)}`;
    console.log('Fetching trip statistics from:', url);
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log('Trip statistics:', data);
            if (callback) callback(data);
        })
        .catch(error => {
            console.error('Error loading trip statistics:', error);
            if (callback) callback({ success: false, error: error.message });
        });
}

console.log("Trip Database - Module loaded");
