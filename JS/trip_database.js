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
    
    fetch(`../PHP/trip/get_trip_items.php?uid=${encodeURIComponent(uid)}`)
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
                            title: dbItem.Product_type === 'tour' ? (dbItem.Supplier_product || '') : (dbItem.Supplier_naam || ''),
                            hotelName: dbItem.Product_type === 'tour' ? (dbItem.Supplier_product || '') : (dbItem.Supplier_naam || ''),
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
        fetch('../PHP/trip/save_trip_item.php', {
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
    fetch('../PHP/trip/save_trip_item.php', {
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
    
    fetch(`../PHP/trip/get_trip_items.php?uid=${encodeURIComponent(uid)}`)
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
                
                console.log('Found main item to edit:', mainItem.ReisID, 'with', extras.length, 'extras');
                
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
                
                // Set main type based on Product_type and show the appropriate fields
                const mainTypeSelect = document.getElementById('mainType');
                if (mainTypeSelect) {
                    if (mainItem.Product_type === 'tour') {
                        mainTypeSelect.value = 'excursie';
                        if (typeof handleTypeChange === 'function') {
                            handleTypeChange(); // This will show the tour fields
                        }
                        
                        // For tours, search and select the tour
                        const tourNameInput = document.getElementById('tourName');
                        if (tourNameInput) tourNameInput.value = mainItem.Supplier_product || '';
                        
                        // Search for tours if we have location data
                        if (mainItem.Locatie_stad) {
                            // Fill in the search city field
                            const searchCityInput = document.getElementById('searchTourCity');
                            if (searchCityInput) {
                                searchCityInput.value = mainItem.Locatie_stad;
                            }
                            
                            setTimeout(() => {
                                if (typeof searchTours === 'function') {
                                    console.log('Starting tour search for editing...');
                                    searchTours().then(tours => {
                                        console.log('Tour search completed, found tours:', tours);
                                        
                                        // Auto-select the tour after search
                                        setTimeout(() => {
                                            console.log('Auto-selecting tour with Product_code:', mainItem.Product_code);
                                            
                                            if (tours && tours.length > 0) {
                                                const matchingTour = tours.find(tour => 
                                                    tour.Code === mainItem.Product_code || tour.tourID === mainItem.Product_code
                                                );
                                                
                                                console.log('Found matching tour:', matchingTour);
                                                
                                                if (matchingTour) {
                                                    // Find the corresponding card
                                                    const tourCards = document.querySelectorAll('.tour-card');
                                                    
                                                    let matchingCard = null;
                                                    tourCards.forEach((card, index) => {
                                                        const tourCode = card.getAttribute('data-tour-code');
                                                        const tourId = card.getAttribute('data-tour-id');
                                                        
                                                        // Prioritize exact tourID match first, then fallback to Code match
                                                        if (!matchingCard) {
                                                            if (tourId === matchingTour.tourID) {
                                                                matchingCard = card;
                                                            } else if (tourCode === matchingTour.Code) {
                                                                matchingCard = card;
                                                            }
                                                        }
                                                    });
                                                    
                                                    if (matchingCard && typeof selectTour === 'function') {
                                                        console.log('Auto-selecting tour for editing:', matchingTour);
                                                        selectTour(matchingTour, matchingCard);
                                                        
                                                        // Load tour extras and time selection after selection
                                                        setTimeout(() => {
                                                            loadTourExtrasForEditing(mainItem, extras);
                                                            
                                                            // Restore time selection if available
                                                            console.log('Restoring timeslot for tour:', mainItem.Product_code);
                                                            
                                                            // Use Product_code if Product_id is undefined
                                                            const tourId = mainItem.Product_id || mainItem.Product_code;
                                                            
                                                            if (tourId && (mainItem.Service || mainItem.Tijd_aanvang)) {
                                                                // Create a corrected item with the right tour ID field
                                                                const itemForRestoration = { ...mainItem, Product_id: tourId };
                                                                restoreTourTimeSelection(itemForRestoration);
                                                            } else {
                                                                console.log('No tour ID or timeslot data to restore');
                                                            }
                                                        }, 1000);
                                                    } else {
                                                        console.error('Could not find matching tour card or selectTour function');
                                                    }
                                                } else {
                                                    console.error('No matching tour found in search results');
                                                }
                                            } else {
                                                console.error('No tours returned from search');
                                            }
                                        }, 500);
                                    }).catch(error => {
                                        console.error('Tour search failed:', error);
                                    });
                                } else {
                                    console.error('searchTours function not available');
                                }
                            }, 500);
                        }
                    } else {
                        // Handle accommodations (existing logic)
                        mainTypeSelect.value = 'accommodatie';
                        if (typeof handleTypeChange === 'function') {
                            handleTypeChange(); // This will show the accommodation fields
                        }
                        
                        // Search for the hotel to load it in the interface
                        if (mainItem.Supplier_naam || mainItem.Locatie_stad) {
                            if (typeof searchHotels === 'function') {
                                console.log('Starting hotel search for editing...');
                                searchHotels();
                            }
                            
                            // Wait for hotels to load, then auto-select
                            setTimeout(() => {
                                console.log('Attempting to find hotel for editing...', mainItem.Supplier_naam);
                                if (typeof allHotels !== 'undefined') {
                                    const hotel = allHotels.find(h => 
                                        h.Product === mainItem.Supplier_naam || 
                                        h.Code === mainItem.Product_code
                                    );
                                    
                                    if (hotel && typeof selectHotel === 'function') {
                                        console.log('Found matching hotel for editing, calling selectHotel:', hotel);
                                        selectHotel(hotel.Code, parseInt(nightsInput.value) || 1, hotel.Currency);
                                        
                                        // Wait for room types to load, then auto-select room
                                        setTimeout(() => {
                                            if (typeof autoSelectRoomAndExtras === 'function') {
                                                autoSelectRoomAndExtras(mainItem, extras);
                                            }
                                        }, 500);
                                    } else {
                                        console.error('Hotel not found or selectHotel function missing:', {
                                            hotel: hotel,
                                            selectHotelAvailable: typeof selectHotel === 'function',
                                            searchedName: mainItem.Supplier_naam,
                                            searchedCode: mainItem.Product_code,
                                            availableHotels: allHotels ? allHotels.length : 0
                                        });
                                    }
                                } else {
                                    console.error('allHotels not available for hotel selection');
                                }
                            }, 1000); // Increased timeout to ensure search completes
                        }
                    }
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

// Load tour extras for editing
function loadTourExtrasForEditing(mainItem, extras) {
    console.log('Loading tour extras for editing:', extras);
    
    // Set PAX value if available
    const paxInput = document.getElementById('pax');
    if (paxInput) {
        // Estimate PAX from price if tour is per-person
        // This is approximate since we don't store PAX directly
        paxInput.value = 1; // Default, user can adjust
    }
    
    // Pre-select extras based on database extras
    extras.forEach(extra => {
        // Find matching extra elements by description
        const extraCheckboxes = document.querySelectorAll('.extra-checkbox');
        const extraQuantities = document.querySelectorAll('.extra-qty-input');
        
        // Try to match by product name
        const productName = extra.Supplier_product;
        
        // Check checkboxes
        extraCheckboxes.forEach(checkbox => {
            const extraName = checkbox.getAttribute('data-extra-name');
            const label = checkbox.nextElementSibling;
            const labelText = label ? label.textContent : '';
            
            if (extraName === productName || labelText.includes(productName)) {
                checkbox.checked = true;
                console.log('Pre-selected extra checkbox:', productName);
            }
        });
        
        // Check quantity inputs
        extraQuantities.forEach(qtyInput => {
            const extraName = qtyInput.getAttribute('data-extra-name');
            const extraDesc = qtyInput.getAttribute('data-description');
            
            if (extraName === productName || extraDesc === productName) {
                // Estimate quantity based on price difference
                const extraCost = parseFloat(qtyInput.getAttribute('data-cost')) || 0;
                if (extraCost > 0) {
                    const quantity = Math.round(extra.Gross / extraCost);
                    qtyInput.value = quantity > 0 ? quantity : 1;
                    console.log('Pre-selected extra quantity:', productName, 'qty:', quantity);
                }
            }
        });
    });
    
    // Update pricing display
    if (typeof updateTourAddButtonValue === 'function') {
        updateTourAddButtonValue();
    }
    
    // Restore tour time selection if available
    restoreTourTimeSelection(mainItem);
}

// Delete item from database
function deleteItemFromDatabase(reisID, callback) {
    const uid = window.currentUID || (window.location.search.match(/uid=([^&]+)/)?.[1] || '');
    
    const formData = new FormData();
    formData.append('action', 'delete_item');
    formData.append('reis_id', reisID);
    formData.append('uid', uid);
    
    fetch('../PHP/trip/save_trip_item.php', {
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
        fetch('../PHP/trip/save_trip_item.php', {
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
    
    const url = `../PHP/file/get_file_info.php?uid=${uid}`;
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
    
    let url = '../PHP/hotel/search_accommodatie.php?';
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
    
    const url = `../PHP/hotel/get_room_types.php?code=${encodeURIComponent(hotelCode)}`;
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
    
    fetch('../PHP/utils/test_connection.php')
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
    
    const url = `../PHP/utils/export_trip_data.php?uid=${encodeURIComponent(uid)}`;
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
    
    fetch('../PHP/utils/import_trip_data.php', {
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
    
    const url = `../PHP/utils/get_trip_statistics.php?uid=${encodeURIComponent(uid)}`;
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

/**
 * Restore tour time selection state when editing from sidebar
 */
function restoreTourTimeSelection(item) {
    console.log('Restoring tour time selection for item:', item.ReisID);
    
    // Prevent multiple calls for the same item
    if (window.currentRestoringItem === item.ReisID) {
        return;
    }
    window.currentRestoringItem = item.ReisID;
    
    if (!item || item.Product_type !== 'tour') {
        window.currentRestoringItem = null;
        return;
    }
    
    if (!window.tourTimeManager) {
        window.currentRestoringItem = null;
        return;
    }
    
    // Prepare restoration criteria from stored data
    const restorationCriteria = {
        slotName: item.Service ? item.Service.replace(' (Custom Times)', '').trim() : null,  // Clean the slot name
        startTime: item.Tijd_aanvang || null,
        endTime: item.Tijd_einde || null
    };
    
    console.log('Restoration criteria (cleaned):', restorationCriteria);
    
    // Ensure we have a valid tourID
    const tourId = item.Product_id || item.Product_code;
    if (!tourId) {
        console.log('❌ No valid tour ID found for restoration');
        window.currentRestoringItem = null;
        return;
    }
    
    // Initialize the time selection system first
    if (typeof window.tourTimeManager.initialize === 'function') {
        console.log('Initializing tour time selection for tourID:', tourId);
        window.tourTimeManager.initialize(tourId);
        
        // Wait a moment for the timeslots to load, then attempt restoration
        setTimeout(() => {
            if (typeof window.tourTimeManager.restoreSelection === 'function') {
                const restored = window.tourTimeManager.restoreSelection(restorationCriteria);
                if (!restored) {
                    console.log('Could not restore specific timeslot, may auto-select if only one option');
                }
            }
            
            // Clear the restoration lock
            window.currentRestoringItem = null;
        }, 1000); // Increased timeout to ensure timeslots load
    } else {
        window.currentRestoringItem = null;
    }
}

console.log("Trip Database - Module loaded");
