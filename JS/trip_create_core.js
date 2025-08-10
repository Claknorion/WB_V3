// trip_create_core.js - Main trip creation coordinator and UI logic

// Global state
let editingItem = null;
const tripItems = [];
let currentSelection = {
  hotel: null,
  room: null,
  hotelCode: null,
  roomType: null
};

// Editor panel collapse functionality
function toggleEditorPanel() {
  const editorPanel = document.querySelector('.editor-panel');
  const indicator = document.getElementById('collapse-indicator');
  
  if (editorPanel) {
    editorPanel.classList.toggle('collapsed');
    if (indicator) {
      indicator.textContent = editorPanel.classList.contains('collapsed') ? '+' : '−';
    }
  }
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  console.log("Trip Create Core - Initializing...");
  
  // Initialize modules
  if (typeof initializeHotelManager === 'function') {
    initializeHotelManager();
  }
  if (typeof initializeTripDatabase === 'function') {
    initializeTripDatabase();
  }
  
  // Core UI listeners
  setupMainTypeListener();
  setupFormListeners();
  setupAddButtonListener();
  
  // Initialize data
  initializeFileData();
  resetSmartDatesCache();
  
  // Clean sidebar placeholders
  cleanSidebarPlaceholders();
  
  console.log("Trip Create Core - Initialized successfully");
});

// Main type change handler
function handleTypeChange() {
    clearSelection();

    const selected = document.getElementById("mainType").value;

    // Apply smart dates when type is selected (only if not in edit mode)
    if (!editingItem && selected) {
        console.log('Type changed to:', selected, '- applying smart dates');
        applySmartDates();
    }

    // Hide all dynamic field blocks first
    document.getElementById("accommodatieFields").style.display = "none";
    document.getElementById("vluchtFields").style.display = "none";
    document.getElementById("excursieFields").style.display = "none";

    // Clear hotel results if switching away from "accommodatie"
    if (selected !== "accommodatie") {
        if (typeof clearHotelResults === 'function') {
            clearHotelResults();
        }
        clearRoomSelection();
        
        // Hide product info panel
        const productPanel = document.getElementById("product-info-panel");
        if (productPanel) {
            productPanel.classList.remove("visible");
        }
    }

    // Clear tour results if switching away from "excursie"
    if (selected !== "excursie") {
        if (typeof clearTourResults === 'function') {
            clearTourResults();
        }
        clearTourSelection();
    }

    // Show the correct block and load hotels if needed
    if (selected === "accommodatie") {
        document.getElementById("accommodatieFields").style.display = "block";

        // Only show hotels when accommodation is specifically selected and there's search input
        const cityVal = document.getElementById("searchCity").value.trim();
        const nameVal = document.getElementById("searchName").value.trim();
        if ((cityVal.length > 0 || nameVal.length > 0) && typeof searchHotels === 'function') {
            searchHotels();
        }
    } else if (selected === "excursie") {
        document.getElementById("excursieFields").style.display = "block";

        // Only show tours when excursie is specifically selected and there's search input
        const cityVal = document.getElementById("searchTourCity").value.trim();
        const nameVal = document.getElementById("searchTourName").value.trim();
        if ((cityVal.length > 0 || nameVal.length > 0) && typeof searchTours === 'function') {
            searchTours();
        }
    } else if (selected === "vlucht") {
        document.getElementById("vluchtFields").style.display = "block";
    }
}

// Clear current selections
function clearSelection() {
  // Clear stored selections
  currentSelection.hotel = null;
  currentSelection.room = null;
  currentSelection.hotelCode = null;
  currentSelection.roomType = null;
  
  // Remove selection highlight from all hotel cards
  document.querySelectorAll(".hotel-card.selected").forEach(card => {
    card.classList.remove("selected");
  });

  // Clear room description and checklist
  clearRoomSelection();

  // Disable the save button
  toggleSaveButton();
}

// Clear room selection
function clearRoomSelection() {
  // Clear stored room selection
  currentSelection.room = null;
  currentSelection.roomType = null;
  
  // Reset room picture slider and hide room pictures section
  if (typeof roomPictureSlider !== 'undefined' && roomPictureSlider) {
    roomPictureSlider.destroy();
    roomPictureSlider = null;
  }
  const roomSliderSection = document.getElementById('room-picture-slider');
  if (roomSliderSection) {
    roomSliderSection.style.display = 'none';
  }
  
  // Reset main hotel slider to show only hotel images (no room images)
  if (typeof hotelPictureSlider !== 'undefined' && hotelPictureSlider && currentSelection.hotel) {
    hotelPictureSlider.loadMedia(currentSelection.hotel.Code);
  }
  
  const descriptionBox = document.getElementById("room-description-box");
  if (descriptionBox) {
    descriptionBox.style.display = "none";
  }
  
  // Clear description and checklist
  const descriptionContent = document.getElementById("room-description-content");
  if (descriptionContent) descriptionContent.textContent = "";

  const checklist = document.getElementById("room-checklist");
  if (checklist) checklist.innerHTML = "";

  // Hide and clear the Add button
  const addBtn = document.getElementById("add-selection-btn");
  if (addBtn) {
    addBtn.style.display = "none";
    addBtn.classList.remove("visible");
    addBtn.disabled = true;
    addBtn.innerHTML = 'Add';
    let priceSpanLocal = document.getElementById("add-total-price");
    if (priceSpanLocal) priceSpanLocal.textContent = "";
  }
}

// Clear tour selection
function clearTourSelection() {
  // Clear stored tour selection
  currentSelection.tour = null;
  
  // Remove selection highlight from all tour cards
  document.querySelectorAll(".tour-card.selected").forEach(card => {
    card.classList.remove("selected");
  });
  
  // Hide product info panel
  const productPanel = document.getElementById("product-info-panel");
  if (productPanel) {
    productPanel.classList.remove("visible");
  }
}

// Search tours function
function searchTours() {
  const city = document.getElementById("searchTourCity").value.trim();
  const name = document.getElementById("searchTourName").value.trim();
  
  if (city.length === 0 && name.length === 0) {
    if (typeof clearTourResults === 'function') {
      clearTourResults();
    }
    return;
  }
  
  const params = new URLSearchParams();
  if (city) params.append('stad', city);
  if (name) params.append('query', name);
  
  fetch(`PHP/search_tours.php?${params.toString()}`)
    .then(response => response.json())
    .then(data => {
      if (typeof displayTourResults === 'function') {
        displayTourResults(data);
      }
    })
    .catch(error => {
      console.error('Error fetching tours:', error);
    });
}

// Filter tour results function
function filterTourResults() {
  searchTours(); // Just call search again with updated name filter
}

// Clear tour results function
function clearTourResults() {
  const container = document.getElementById("hotel-results");
  if (container) {
    container.innerHTML = "";
  }
  currentSelection.tour = null;
}

// Display tour results function
function displayTourResults(tours) {
  const container = document.getElementById("hotel-results");
  if (!container) return;
  
  container.innerHTML = "";
  
  if (!tours || tours.length === 0) {
    container.innerHTML = '<div class="no-results">Geen excursies gevonden</div>';
    return;
  }
  
  tours.forEach(tour => {
    const tourCard = document.createElement("div");
    tourCard.className = "hotel-card tour-card";
    tourCard.setAttribute("data-tour-code", tour.Code);
    
    tourCard.innerHTML = `
      <div class="hotel-image">
        ${tour.Foto ? `<img src="${tour.Foto}" alt="${tour.Product}" onerror="this.style.display='none'">` : '<div class="no-image">Geen foto</div>'}
      </div>
      <div class="hotel-details">
        <h3 class="hotel-name">${tour.Product}</h3>
        <p class="hotel-location">${tour.Locatie_stad}</p>
        <p class="hotel-description">${tour.Beschrijving_kort || ''}</p>
        <div class="hotel-price">
          <span class="price-label">Vanaf: </span>
          <span class="price-amount">${tour.Currency} ${tour.Prijs_vanaf}</span>
        </div>
      </div>
    `;
    
    tourCard.addEventListener('click', () => selectTour(tour, tourCard));
    container.appendChild(tourCard);
  });
}

// Select tour function
function selectTour(tour, tourCard) {
  // Remove previous selection
  document.querySelectorAll(".tour-card.selected").forEach(card => {
    card.classList.remove("selected");
  });
  
  // Mark new selection
  tourCard.classList.add("selected");
  currentSelection.tour = tour;
  
  // Show product info panel with tour details
  const productPanel = document.getElementById("product-info-panel");
  if (productPanel) {
    productPanel.classList.add("visible");
    
    // Update product info with tour details
    const titleElement = productPanel.querySelector('.section-title');
    if (titleElement) {
      titleElement.textContent = tour.Product;
    }
    
    // Initialize picture slider for tour
    if (typeof initializePictureSlider === 'function') {
      initializePictureSlider(tour.Code);
    }
  }
  
  // Enable the add button
  const addBtn = document.getElementById('add-selection-btn');
  if (addBtn) {
    addBtn.style.display = 'block';
    addBtn.classList.add('visible');
  }
}

// Toggle save button state
function toggleSaveButton() {
  const saveBtn = document.querySelector('.save-button');
  const hotelSelected = document.querySelector('.hotel-card.selected') !== null;

  if (saveBtn) {
    if (hotelSelected) {
      saveBtn.classList.add('enabled');
      saveBtn.disabled = false;
    } else {
      saveBtn.classList.remove('enabled');
      saveBtn.disabled = true;
    }
  }
}

// Setup event listeners
function setupMainTypeListener() {
  const mainTypeSelect = document.getElementById('mainType');
  if (mainTypeSelect) {
    mainTypeSelect.addEventListener('change', () => {
      console.log("mainType changed, calling handleTypeChange");
      handleTypeChange();
    });
  } else {
    console.warn("mainType select not found!");
  }
}

function setupFormListeners() {
  const cityInput = document.getElementById('searchCity');
  const nightsInput = document.getElementById('searchNights');
  const nameInput = document.getElementById('searchName');
  const tourCityInput = document.getElementById('searchTourCity');
  const tourNameInput = document.getElementById('searchTourName');
  const tourPaxInput = document.getElementById('searchTourPax');
  const paxInput = document.getElementById('pax');
  const dateInput = document.getElementById('date');

  function triggerSearchIfInputExists() {
    const cityVal = cityInput ? cityInput.value.trim() : '';
    const nameVal = nameInput ? nameInput.value.trim() : '';
    if ((cityVal.length > 0 || nameVal.length > 0) && typeof searchHotels === 'function') {
      searchHotels();
    } else if (typeof clearHotelResults === 'function') {
      clearHotelResults();
    }
  }

  function triggerTourSearchIfInputExists() {
    const cityVal = tourCityInput ? tourCityInput.value.trim() : '';
    const nameVal = tourNameInput ? tourNameInput.value.trim() : '';
    if ((cityVal.length > 0 || nameVal.length > 0) && typeof searchTours === 'function') {
      searchTours();
    } else if (typeof clearTourResults === 'function') {
      clearTourResults();
    }
  }

  if (cityInput) cityInput.addEventListener('input', triggerSearchIfInputExists);
  if (nightsInput) nightsInput.addEventListener('input', triggerSearchIfInputExists);
  if (nameInput) nameInput.addEventListener('input', triggerSearchIfInputExists);
  
  if (tourCityInput) tourCityInput.addEventListener('input', triggerTourSearchIfInputExists);
  if (tourNameInput) tourNameInput.addEventListener('input', triggerTourSearchIfInputExists);

  // Global listeners for Add button updates
  function handlePaxNightsChange() {
    console.log('Pax/Nights changed, current selection:', currentSelection);
    
    // Update smart dates when nights change (for accommodations)
    if (!editingItem && currentSelection.hotel) {
      applySmartDates();
    }
    
    if (currentSelection.hotel && currentSelection.room && typeof updateAddButtonValue === 'function') {
      updateAddButtonValue();
    }
  }

  if (paxInput) paxInput.addEventListener('input', handlePaxNightsChange);
  if (nightsInput) nightsInput.addEventListener('input', handlePaxNightsChange);

  // Listen for manual date changes
  if (dateInput) {
    dateInput.addEventListener('change', storeUserModifiedDate);
  }
}

function setupAddButtonListener() {
  const addBtn = document.getElementById('add-selection-btn');
  if (addBtn) {
    addBtn.style.display = 'none';
    addBtn.classList.remove('visible');
    addBtn.disabled = true;
    addBtn.innerHTML = 'Add';
    
    let priceSpanLocal = document.getElementById("add-total-price");
    if (priceSpanLocal) priceSpanLocal.textContent = "";

    addBtn.addEventListener('click', () => {
      if (!currentSelection.hotel || !currentSelection.room) {
        alert('Selecteer eerst een hotel en kamer.');
        return;
      }
      
      const isUpdating = addBtn.getAttribute('data-mode') === 'update';
      
      if (isUpdating) {
        handleUpdateItem();
      } else {
        handleAddItem();
      }
    });
  } else {
    console.warn('Add button with id add-selection-btn not found in DOM!');
  }
}

function cleanSidebarPlaceholders() {
  const container = getSidebarContainer();
  if (container) {
    // Only remove + buttons and actual placeholder content, keep structure
    const plusButtons = container.querySelectorAll('#sidebar-add, .sidebar-add, .sidebar-plus');
    plusButtons.forEach(el => el.remove());
    
    // Remove any elements that just contain "+" text
    Array.from(container.children).forEach(el => {
      if (el.textContent && el.textContent.trim() === '+') el.remove();
    });
    
    // Clear placeholder text content but keep the styling structure
    const placeholders = container.querySelectorAll('.item:not([data-reis-id])');
    placeholders.forEach(el => {
      el.style.display = 'none';
    });
  }
}

// Handle add new item
function handleAddItem() {
    if (typeof calculateRoomAndExtras !== 'function' || typeof createDatabaseItems !== 'function') {
        console.error('Required hotel manager functions not available');
        return;
    }
    
    // Validate date is selected
    const dateInput = document.getElementById('date');
    if (!dateInput || !dateInput.value || dateInput.value.trim() === '') {
        const userChoice = confirm(
            'No date has been selected for this trip item.\n\n' +
            'It\'s recommended to set a date for proper trip organization.\n\n' +
            'Click "OK" to continue without a date, or "Cancel" to go back and select a date.'
        );
        
        if (!userChoice) {
            // User chose to cancel and add a date
            console.log('User chose to add a date before continuing');
            
            // Focus on the date input to help user
            if (dateInput) {
                dateInput.focus();
                // Add a visual highlight to draw attention
                dateInput.style.border = '2px solid #ff6b6b';
                setTimeout(() => {
                    dateInput.style.border = '';
                }, 3000);
            }
            return; // Exit without adding the item
        }
        
        console.log('User chose to continue without a date');
    }
    
    // Validate number of nights for accommodatie
    const mainTypeSelect = document.getElementById('mainType');
    if (mainTypeSelect && mainTypeSelect.value === 'accommodatie') {
        const nightsInput = document.getElementById('searchNights');
        if (!nightsInput || !nightsInput.value || nightsInput.value.trim() === '' || parseInt(nightsInput.value) < 1) {
            const userChoice = confirm(
                'No number of nights has been specified for this accommodation.\n\n' +
                'Number of nights is required for accommodation items.\n\n' +
                'Click "OK" to continue without nights (not recommended), or "Cancel" to go back and enter the number of nights.'
            );
            
            if (!userChoice) {
                // User chose to cancel and add nights
                console.log('User chose to add number of nights before continuing');
                
                // Focus on the nights input to help user
                if (nightsInput) {
                    nightsInput.focus();
                    // Add a visual highlight to draw attention
                    nightsInput.style.border = '2px solid #ff6b6b';
                    setTimeout(() => {
                        nightsInput.style.border = '';
                    }, 3000);
                }
                return; // Exit without adding the item
            }
            
            console.log('User chose to continue without specifying nights');
        }
    }
    
    const mainType = document.getElementById('mainType');
    const selectedType = mainType ? mainType.value : '';
    
    if (selectedType === 'accommodatie') {
        // Handle accommodation
        const hotel = currentSelection.hotel;
        const roomType = currentSelection.roomType;
        
        if (!hotel || !roomType) {
            alert('Selecteer eerst een hotel en kamer.');
            return;
        }
        
        const calc = calculateRoomAndExtras(hotel, roomType);
        const dbItems = createDatabaseItems(hotel, roomType, calc);
        
        if (typeof saveToDBThenReloadSidebar === 'function') {
            saveToDBThenReloadSidebar(dbItems);
        }
    } else if (selectedType === 'excursie') {
        // Handle tour/excursie
        const tour = currentSelection.tour;
        
        if (!tour) {
            alert('Selecteer eerst een excursie.');
            return;
        }
        
        const tourDbItems = createTourDatabaseItems(tour);
        
        if (typeof saveToDBThenReloadSidebar === 'function') {
            saveToDBThenReloadSidebar(tourDbItems);
        }
    } else {
        alert('Selecteer eerst een type en product.');
        return;
    }
}

// Create database items for tours
function createTourDatabaseItems(tour) {
    const dateInput = document.getElementById('date');
    const timeInput = document.getElementById('time');
    const paxInput = document.getElementById('pax');
    const tourPaxInput = document.getElementById('searchTourPax');
    
    const date = dateInput ? dateInput.value : '';
    const time = timeInput ? timeInput.value : '';
    const pax = paxInput ? parseInt(paxInput.value) || 1 : 1;
    const tourPax = tourPaxInput ? parseInt(tourPaxInput.value) || pax : pax;
    
    return [{
        type: 'excursie',
        date: date,
        time: time,
        pax: tourPax,
        code: tour.Code,
        product: tour.Product,
        location: tour.Locatie_stad,
        description: tour.Beschrijving_kort || '',
        price_gross: tour.Gross_raw || 0,
        price_nett: tour.Nett_raw || 0,
        currency: tour.Currency || 'EUR',
        inbounder: tour.Inbounder || ''
    }];
}

// Handle update existing item
function handleUpdateItem() {
    if (!editingItem) {
        alert('No item selected for editing');
        return;
    }
    
    if (typeof calculateRoomAndExtras !== 'function' || typeof createDatabaseItems !== 'function') {
        console.error('Required hotel manager functions not available');
        return;
    }
    
    // Validate date is selected (same as add item)
    const dateInput = document.getElementById('date');
    if (!dateInput || !dateInput.value || dateInput.value.trim() === '') {
        const userChoice = confirm(
            'No date has been selected for this trip item.\n\n' +
            'It\'s recommended to set a date for proper trip organization.\n\n' +
            'Click "OK" to continue without a date, or "Cancel" to go back and select a date.'
        );
        
        if (!userChoice) {
            // User chose to cancel and add a date
            console.log('User chose to add a date before updating');
            
            // Focus on the date input to help user
            if (dateInput) {
                dateInput.focus();
                // Add a visual highlight to draw attention
                dateInput.style.border = '2px solid #ff6b6b';
                setTimeout(() => {
                    dateInput.style.border = '';
                }, 3000);
            }
            return; // Exit without updating the item
        }
        
        console.log('User chose to continue updating without a date');
    }
    
    // Validate number of nights for accommodatie (same as add item)
    const mainTypeSelect = document.getElementById('mainType');
    if (mainTypeSelect && mainTypeSelect.value === 'accommodatie') {
        const nightsInput = document.getElementById('searchNights');
        if (!nightsInput || !nightsInput.value || nightsInput.value.trim() === '' || parseInt(nightsInput.value) < 1) {
            const userChoice = confirm(
                'No number of nights has been specified for this accommodation.\n\n' +
                'Number of nights is required for accommodation items.\n\n' +
                'Click "OK" to continue without nights (not recommended), or "Cancel" to go back and enter the number of nights.'
            );
            
            if (!userChoice) {
                // User chose to cancel and add nights
                console.log('User chose to add number of nights before updating');
                
                // Focus on the nights input to help user
                if (nightsInput) {
                    nightsInput.focus();
                    // Add a visual highlight to draw attention
                    nightsInput.style.border = '2px solid #ff6b6b';
                    setTimeout(() => {
                        nightsInput.style.border = '';
                    }, 3000);
                }
                return; // Exit without updating the item
            }
            
            console.log('User chose to continue updating without specifying nights');
        }
    }
    
    const mainType = document.getElementById('mainType');
    const selectedType = mainType ? mainType.value : '';
    
    // First delete the existing item and its extras
    const uid = window.currentUID || (window.location.search.match(/uid=([^&]+)/)?.[1] || '');
    
    const formData = new FormData();
    formData.append('action', 'delete_item');
    formData.append('reis_id', editingItem);
    formData.append('uid', uid);
    
    fetch('../PHP/save_trip_item.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let dbItems;
            
            if (selectedType === 'accommodatie') {
                // Handle accommodation update
                const hotel = currentSelection.hotel;
                const roomType = currentSelection.roomType;
                
                if (!hotel || !roomType) {
                    alert('Selecteer eerst een hotel en kamer.');
                    return;
                }
                
                const calc = calculateRoomAndExtras(hotel, roomType);
                dbItems = createDatabaseItems(hotel, roomType, calc, editingItem);
            } else if (selectedType === 'excursie') {
                // Handle tour update
                const tour = currentSelection.tour;
                
                if (!tour) {
                    alert('Selecteer eerst een excursie.');
                    return;
                }
                
                dbItems = createTourDatabaseItems(tour);
                // Set the ReisID for updating
                dbItems.forEach(item => item.ReisID = editingItem);
            } else {
                alert('Selecteer eerst een type en product.');
                return;
            }
            
            // Save the updated items
            if (typeof saveToDBThenReloadSidebar === 'function') {
                saveToDBThenReloadSidebar(dbItems);
            }
        } else {
            console.error('Error deleting existing item:', data.error);
            alert('Error updating item: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error updating item:', error);
        alert('Error updating item');
    });
}

// Load item for editing
function loadItemForEditing(reisID) {
    // If we're already editing a different item, clear that state first
    if (editingItem && editingItem !== reisID) {
        updateButtonsForEditMode(false);
    }
    
    editingItem = reisID;
    console.log('Loading item for editing:', reisID);
    
    if (typeof loadItemFromDatabase === 'function') {
        loadItemFromDatabase(reisID);
    }
}

// Update buttons for edit mode
function updateButtonsForEditMode(isEditing) {
    const addBtn = document.getElementById('add-selection-btn');
    
    if (isEditing) {
        // Change Add button to Update with orange styling
        if (addBtn) {
            console.log('Current button innerHTML before update:', addBtn.innerHTML);
            
            // More robust text replacement
            let currentHTML = addBtn.innerHTML;
            
            if (currentHTML.includes('Add:')) {
                currentHTML = currentHTML.replace(/Add:/g, 'Update:');
            } else if (currentHTML.includes('Add ')) {
                currentHTML = currentHTML.replace(/Add /g, 'Update ');
            } else if (currentHTML.trim() === 'Add') {
                currentHTML = 'Update';
            }
            
            addBtn.innerHTML = currentHTML;
            addBtn.setAttribute('data-mode', 'update');
            addBtn.style.backgroundColor = '#ff8c00';
            addBtn.style.color = 'white';
            addBtn.style.right = '328px';
            console.log('Button updated to Update mode:', currentHTML);
        }
        
        // Add Delete and Cancel buttons if they don't exist
        createEditModeButtons();
        
    } else {
        // Change Update button back to Add with original styling
        if (addBtn) {
            console.log('Current button innerHTML before reset:', addBtn.innerHTML);
            
            let currentHTML = addBtn.innerHTML;
            
            if (currentHTML.includes('Update:')) {
                currentHTML = currentHTML.replace(/Update:/g, 'Add:');
            } else if (currentHTML.includes('Update ')) {
                currentHTML = currentHTML.replace(/Update /g, 'Add ');
            } else if (currentHTML.trim() === 'Update') {
                currentHTML = 'Add';
            }
            
            addBtn.innerHTML = currentHTML;
            addBtn.removeAttribute('data-mode');
            addBtn.style.backgroundColor = '';
            addBtn.style.color = '';
            addBtn.style.right = '';
            console.log('Button updated to Add mode:', currentHTML);
        }
        
        // Remove Delete and Cancel buttons
        removeEditModeButtons();
        
        // Remove edit indicators from sidebar
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.querySelectorAll('.item').forEach(item => item.classList.remove('editing'));
        }
    }
}

function createEditModeButtons() {
    // Create Delete button
    let deleteBtn = document.getElementById('delete-selection-btn');
    if (!deleteBtn) {
        deleteBtn = document.createElement('button');
        deleteBtn.id = 'delete-selection-btn';
        deleteBtn.className = 'floating-delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.style.cssText = `
            position: fixed; right: 32px; bottom: 32px; z-index: 1000;
            width: auto; min-width: 120px; background-color: #dc3545;
            color: #fff; border: none; border-radius: 24px;
            padding: 16px 32px; font-size: 20px; font-weight: 600;
            box-shadow: 0 4px 16px rgba(0,0,0,0.15); cursor: pointer;
            display: block; opacity: 1; transition: opacity 0.3s, transform 0.3s, background-color 0.3s;
        `;
        
        deleteBtn.addEventListener('mouseenter', () => {
            deleteBtn.style.backgroundColor = '#c82333';
        });
        deleteBtn.addEventListener('mouseleave', () => {
            deleteBtn.style.backgroundColor = '#dc3545';
        });
        
        document.body.appendChild(deleteBtn);
        deleteBtn.addEventListener('click', handleDeleteItem);
        console.log('Delete button created and added as floating button');
    }
    
    // Create Cancel button
    let cancelBtn = document.getElementById('cancel-edit-btn');
    if (!cancelBtn) {
        cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancel-edit-btn';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = `
            position: fixed; right: 180px; bottom: 32px; z-index: 1000;
            width: auto; min-width: 120px; background-color: #6c757d;
            color: #fff; border: none; border-radius: 24px;
            padding: 16px 32px; font-size: 20px; font-weight: 600;
            box-shadow: 0 4px 16px rgba(0,0,0,0.15); cursor: pointer;
            display: block; opacity: 1; transition: opacity 0.3s, transform 0.3s, background-color 0.3s;
        `;
        
        cancelBtn.addEventListener('mouseenter', () => {
            cancelBtn.style.backgroundColor = '#5a6268';
        });
        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.backgroundColor = '#6c757d';
        });
        
        document.body.appendChild(cancelBtn);
        cancelBtn.addEventListener('click', handleCancelEdit);
        console.log('Cancel button created and added');
    }
}

function removeEditModeButtons() {
    const deleteBtn = document.getElementById('delete-selection-btn');
    if (deleteBtn) {
        deleteBtn.remove();
        console.log('Delete button removed');
    }
    
    const cancelBtn = document.getElementById('cancel-edit-btn');
    if (cancelBtn) {
        cancelBtn.remove();
        console.log('Cancel button removed');
    }
}

// Handle delete item
function handleDeleteItem() {
    if (!editingItem) return;
    
    if (confirm('Are you sure you want to delete this item and all its extras?')) {
        const uid = window.currentUID || (window.location.search.match(/uid=([^&]+)/)?.[1] || '');
        
        const formData = new FormData();
        formData.append('action', 'delete_item');
        formData.append('reis_id', editingItem);
        formData.append('uid', uid);
        
        fetch('../PHP/save_trip_item.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Item deleted successfully');
                if (typeof loadSidebarFromDatabase === 'function') {
                    loadSidebarFromDatabase();
                }
                clearUIAfterAdd();
            } else {
                console.error('Error deleting item:', data.error);
                alert('Error deleting item: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error deleting item:', error);
            alert('Error deleting item');
        });
    }
}

// Handle cancel edit
function handleCancelEdit() {
    console.log('Canceling edit mode');
    
    editingItem = null;
    clearForm();
    updateButtonsForEditMode(false);
    clearUIAfterAdd();
    
    console.log('Edit mode canceled, UI completely cleared and reset');
}

// Clear UI after operations
function clearUIAfterAdd() {
    const productPanel = document.getElementById("product-info-panel");
    if (productPanel) {
        productPanel.classList.remove("visible");
        const productTitle = document.getElementById("product-title");
        if (productTitle) productTitle.textContent = "";
        const productDescription = document.getElementById("product-description-content");
        if (productDescription) productDescription.innerHTML = "";
    }
    
    if (typeof clearHotelResults === 'function') {
        clearHotelResults();
    }
    
    // Clear search fields
    const timeInput = document.getElementById("time");
    if (timeInput) timeInput.value = "";
    
    const cityInput = document.getElementById("searchCity");
    if (cityInput) cityInput.value = "";
    
    const nightsInput = document.getElementById("searchNights");
    if (nightsInput) nightsInput.value = "";
    
    const hotelNameInput = document.getElementById("searchName");
    if (hotelNameInput) hotelNameInput.value = "";
    
    clearSelection();
    
    editingItem = null;
    updateButtonsForEditMode(false);
    clearForm();
}

// Clear form fields
function clearForm() {
    // Reset dropdowns
    const hotelSelect = document.getElementById('hotel-select');
    const roomTypeSelect = document.getElementById('room-type-select');
    
    if (hotelSelect) hotelSelect.selectedIndex = 0;
    if (roomTypeSelect) {
        roomTypeSelect.innerHTML = '<option value="">Select a room type...</option>';
        roomTypeSelect.selectedIndex = 0;
    }
    
    // Reset dates
    const checkInDate = document.getElementById('check-in-date');
    const checkOutDate = document.getElementById('check-out-date');
    
    if (checkInDate) checkInDate.value = '';
    if (checkOutDate) checkOutDate.value = '';
    
    // Reset extras
    const extrasContainer = document.querySelector('#extras-container .extras-wrapper');
    if (extrasContainer) {
        const checkboxes = extrasContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => checkbox.checked = false);
    }
    
    // Reset room options
    const roomOptionsContainer = document.getElementById('room-options');
    if (roomOptionsContainer) {
        const selects = roomOptionsContainer.querySelectorAll('select');
        selects.forEach(select => select.selectedIndex = 0);
    }
    
    // Clear calculated totals
    const totalCostElement = document.getElementById('total-cost');
    const grandTotalElement = document.getElementById('grand-total');
    if (totalCostElement) totalCostElement.textContent = '';
    if (grandTotalElement) grandTotalElement.textContent = '';
    
    // Hide and reset add button
    const addBtn = document.getElementById('add-selection-btn');
    if (addBtn) {
        addBtn.innerHTML = 'Add';
        addBtn.style.display = 'none';
        addBtn.classList.remove('visible');
        addBtn.disabled = true;
    }
    
    // Clear room details
    const roomDetailsContainer = document.getElementById('room-details');
    if (roomDetailsContainer) {
        roomDetailsContainer.style.display = 'none';
    }
    
    // Reset picture sliders
    if (typeof resetPictureSliders === 'function') {
        resetPictureSliders();
    }
    
    // Reset extras pricing display
    const extrasTotal = document.querySelector('.extras-total');
    if (extrasTotal) {
        extrasTotal.textContent = '';
    }
    
    // Reset type selector
    const typeSelect = document.getElementById('mainType');
    if (typeSelect) {
        typeSelect.selectedIndex = 0;
    }
    
    // Clear smart dates cache
    resetSmartDatesCache();
    
    console.log('Form completely cleared and reset');
}

// Initialize file data and smart defaults
async function initializeFileData() {
    const uid = window.currentUID || (window.location.search.match(/uid=([^&]+)/)?.[1] || '');
    console.log('initializeFileData called with UID:', uid);
    
    if (!uid || uid === 'UID') {
        console.log('No valid UID found, skipping file data initialization');
        return;
    }
    
    console.log('Fetching file info for UID:', uid);
    
    try {
        const url = `../PHP/get_file_info.php?uid=${uid}`;
        console.log('Fetching from URL:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const responseText = await response.text();
        console.log('Raw response from server:', responseText);
        
        let fileInfo;
        try {
            fileInfo = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse JSON response:', parseError);
            console.error('Response was:', responseText);
            throw new Error('Invalid JSON response from server');
        }
        
        console.log('Parsed file info:', fileInfo);
        
        if (fileInfo && fileInfo.PAX) {
            const paxInput = document.getElementById('pax');
            console.log('PAX input element:', paxInput);
            console.log('Current PAX input value:', paxInput?.value);
            console.log('PAX from database:', fileInfo.PAX);
            
            if (paxInput && (!paxInput.value || paxInput.value === '1' || paxInput.value === '2')) {
                paxInput.value = fileInfo.PAX;
                console.log('Set PAX input to:', paxInput.value);
            } else {
                console.log('PAX input not updated - current value:', paxInput?.value);
            }
            
            window.fileInfo = fileInfo;
        } else {
            console.log('No PAX found in file info response:', fileInfo);
        }
    } catch (error) {
        console.error('Error loading file info:', error);
        // Set a reasonable default PAX if file info fails
        const paxInput = document.getElementById('pax');
        if (paxInput && (!paxInput.value || paxInput.value === '1')) {
            paxInput.value = '2';
            console.log('Set default PAX to 2 due to file info error');
        }
    }
}

// Smart dates cache and functionality
let smartDatesCache = {
    calculated: {},
    userModified: {},
    hasCalculated: {}
};

function resetSmartDatesCache() {
    smartDatesCache = {
        calculated: {},
        userModified: {},
        hasCalculated: {}
    };
    console.log('Smart dates cache reset');
}

function storeUserModifiedDate() {
    const typeSelect = document.getElementById('mainType');
    const dateInput = document.getElementById('date');
    
    if (typeSelect && dateInput && typeSelect.value && dateInput.value) {
        smartDatesCache.userModified[typeSelect.value] = dateInput.value;
        console.log(`Stored user-modified date for ${typeSelect.value}:`, dateInput.value);
    }
}

function resetCurrentTypeCalculation() {
    const typeSelect = document.getElementById('mainType');
    if (typeSelect && typeSelect.value) {
        const currentType = typeSelect.value;
        delete smartDatesCache.calculated[currentType];
        delete smartDatesCache.hasCalculated[currentType];
        console.log(`Reset calculation cache for current type: ${currentType}`);
    }
}

function calculateSmartDates() {
    const typeSelect = document.getElementById('mainType');
    const selectedType = typeSelect ? typeSelect.value : 'accommodatie';
    
    if (!tripItems || tripItems.length === 0) {
        console.log('No existing items, no smart date calculation needed');
        return null;
    }
    
    console.log('Calculating smart dates for type:', selectedType);
    console.log('Available trip items:', tripItems);
    
    const sortedItems = [...tripItems].sort((a, b) => {
        const dateA = new Date(a.Datum_einde || a.Datum_aanvang || a.date || a.Date || '1900-01-01');
        const dateB = new Date(b.Datum_einde || b.Datum_aanvang || b.date || b.Date || '1900-01-01');
        return dateB - dateA;
    });
    
    console.log('Sorted items by date:', sortedItems);
    
    let newDate = null;
    
    switch (selectedType.toLowerCase()) {
        case 'excursie':
            const lastAccommodationForTour = sortedItems.find(item => 
                item.Product_type === 'accommodatie' || 
                item.type === 'accommodatie' || item.category === 'accommodatie' || 
                item.type === 'accommodation' || item.category === 'accommodation'
            );
            
            if (lastAccommodationForTour) {
                const startDate = lastAccommodationForTour.Datum_aanvang || lastAccommodationForTour.date || lastAccommodationForTour.Date;
                if (startDate) {
                    newDate = addDays(new Date(startDate), 1);
                    console.log('Tour date: last accommodation start date + 1:', startDate, '→', newDate);
                }
            }
            break;
            
        case 'accommodatie':
        case 'vlucht':
        case 'vervoer':
            const lastAccommodation = sortedItems.find(item => 
                item.Product_type === 'accommodatie' || 
                item.productType === 'accommodatie' ||
                item.type === 'accommodatie' || item.category === 'accommodatie' || 
                item.type === 'accommodation' || item.category === 'accommodation'
            );
            
            console.log('Looking for last accommodation:', lastAccommodation);
            
            if (lastAccommodation) {
                const endDate = lastAccommodation.Datum_einde || lastAccommodation.endDate || lastAccommodation.date;
                console.log('Found accommodation end date:', endDate);
                if (endDate) {
                    newDate = new Date(endDate);
                    console.log('Accommodation/Flight/Transport date: last accommodation end date:', endDate, '→', newDate);
                }
            } else {
                const lastItem = sortedItems[0];
                console.log('No accommodation found, using last item:', lastItem);
                if (lastItem) {
                    const lastItemDate = lastItem.Datum_einde || lastItem.endDate || lastItem.Datum_aanvang || lastItem.date;
                    if (lastItemDate) {
                        newDate = addDays(new Date(lastItemDate), 1);
                        console.log('No accommodation found, using last item + 1:', lastItemDate, '→', newDate);
                    }
                }
            }
            break;
            
        case 'route':
        case 'notitie':
        default:
            const lastItem = sortedItems[0];
            if (lastItem) {
                const lastItemDate = lastItem.Datum_einde || lastItem.Datum_aanvang || lastItem.date || lastItem.Date;
                if (lastItemDate) {
                    newDate = addDays(new Date(lastItemDate), 1);
                    console.log('Route/Note date: last item + 1:', lastItemDate, '→', newDate);
                }
            }
            break;
    }
    
    console.log('Final calculated smart date:', newDate, 'for type:', selectedType);
    return {
        date: newDate
    };
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function formatDateForInput(date) {
    if (!date) return '';
    return date.toISOString().split('T')[0];
}

function applySmartDates() {
    if (editingItem) {
        console.log('In edit mode, not applying smart dates');
        return;
    }
    
    const typeSelect = document.getElementById('mainType');
    const dateInput = document.getElementById('date');
    
    if (!typeSelect || !dateInput || !typeSelect.value) {
        console.log('Type not selected or inputs not found');
        return;
    }
    
    const selectedType = typeSelect.value;
    
    if (smartDatesCache.userModified[selectedType]) {
        dateInput.value = smartDatesCache.userModified[selectedType];
        console.log(`Applied user-modified date for ${selectedType}:`, dateInput.value);
        return;
    }
    
    if (smartDatesCache.hasCalculated[selectedType]) {
        if (smartDatesCache.calculated[selectedType]) {
            dateInput.value = formatDateForInput(smartDatesCache.calculated[selectedType]);
            console.log(`Applied cached calculated date for ${selectedType}:`, dateInput.value);
        }
        return;
    }
    
    const smartDates = calculateSmartDates();
    if (smartDates && smartDates.date) {
        smartDatesCache.calculated[selectedType] = smartDates.date;
        smartDatesCache.hasCalculated[selectedType] = true;
        
        dateInput.value = formatDateForInput(smartDates.date);
        console.log(`Calculated and applied new smart date for ${selectedType}:`, dateInput.value);
    } else {
        smartDatesCache.hasCalculated[selectedType] = true;
        console.log(`No smart date calculated for ${selectedType}, marked as calculated`);
    }
}

// Sidebar helpers
function formatDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return '';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d).padStart(2,'0')}-${months[m-1]}-${String(y).toString().slice(-2)}`;
}

function escapeHtml(str) {
  return (str || '').toString()
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

function getSidebarContainer() {
  return document.getElementById('sidebar-items')
      || document.getElementById('trip-sidebar')
      || document.querySelector('.sidebar-items')
      || document.querySelector('#sidebar .items')
      || document.querySelector('.sidebar .items')
      || document.querySelector('.sidebar');
}

// Sidebar update
function updateSidebar() {
  const container = getSidebarContainer();
  if (!container) {
    console.warn('Sidebar container not found');
    return;
  }
  
  // Remove existing trip items but keep the structure/styling
  const oldItems = container.querySelectorAll('.item[data-reis-id], .sidebar-item[data-reis-id]');
  oldItems.forEach(el => el.remove());

  // Handle placeholders
  const placeholders = container.querySelectorAll('.item:not([data-reis-id])');
  if (!tripItems.length) {
    placeholders.forEach(el => {
      el.style.display = 'none';
    });
    return;
  }

  placeholders.forEach(el => {
    el.style.display = 'none';
  });

  // Sort items chronologically
  const sortedItems = [...tripItems].sort((a, b) => {
    const dateA = a.date || '9999-12-31';
    const dateB = b.date || '9999-12-31';
    const timeA = a.time || '00:00';
    const timeB = b.time || '00:00';
    
    const datetimeA = `${dateA} ${timeA}`;
    const datetimeB = `${dateB} ${timeB}`;
    
    return datetimeA.localeCompare(datetimeB);
  });

  sortedItems.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'item';
    div.setAttribute('data-reis-id', item.id || '');
    div.style.cursor = 'pointer';

    const dateStr = formatDate(item.date);
    const cityStr = escapeHtml(item.city || '');
    const titleStr = escapeHtml(item.title || item.hotelName || item.roomName || '');
    const totalNum = Number(item.total ?? item.price ?? 0);
    const currency = item.currency || '';
    const totalStr = `${currency} ${totalNum.toFixed(2)}`;

    div.innerHTML = `
      <div class="item-content">
        <div class="item-header">
          <span class="item-date">${dateStr}</span>
          <span class="item-city">${cityStr}</span>
        </div>
        <div class="item-title">
          ${titleStr}
        </div>
        <div class="item-price">
          ${totalStr}
        </div>
      </div>
    `;
    
    div.addEventListener('click', () => {
      console.log('Sidebar item clicked:', item.id);
      loadItemForEditing(item.id);
    });
    
    container.appendChild(div);
  });
}

// Modal functionality
function openEditor() {
    document.getElementById('modal').style.display = 'flex';
}

function saveItem() {
    alert("Saving item... (placeholder)");
}

window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// Edit mode functions
function enableEditMode() {
    const actionDiv = document.getElementById("actionButtons");

    if (!document.getElementById("deleteItemBtn")) {
        const deleteBtn = document.createElement("button");
        deleteBtn.id = "deleteItemBtn";
        deleteBtn.className = "delete-btn";
        deleteBtn.textContent = "Delete";

        actionDiv.appendChild(deleteBtn);
    }

    document.getElementById("deleteItemBtn").onclick = () => {
        if (confirm("Weet je zeker dat je dit item wilt verwijderen?")) {
            // deleteItemFunction();
        }
    };
}

function enableCreateMode() {
    const deleteBtn = document.getElementById("deleteItemBtn");
    if (deleteBtn) deleteBtn.remove();
}

console.log("Trip Create Core - Module loaded");
