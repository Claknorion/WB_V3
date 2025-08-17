// trip_create_core.js - Main trip creation coordinator and UI logic

// Global state
let editingItem = null;
const tripItems = [];
let tourPictureSlider = null;
let currentSelection = {
  hotel: null,
  room: null,
  hotelCode: null,
  roomType: null,
  tour: null
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
        
        // Clean up tour picture slider if switching away from tours
        if (typeof tourPictureSlider !== 'undefined' && tourPictureSlider) {
            tourPictureSlider.destroy();
            tourPictureSlider = null;
        }
        
        // Clear tour selection
        if (typeof currentSelection !== 'undefined') {
            currentSelection.tour = null;
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
  console.log('searchTours() called');
  const city = document.getElementById("searchTourCity").value.trim();
  const name = document.getElementById("searchTourName").value.trim();
  
  console.log('Tour search inputs - City:', city, 'Name:', name);
  
  if (city.length === 0 && name.length === 0) {
    console.log('No search terms, clearing results');
    if (typeof clearTourResults === 'function') {
      clearTourResults();
    }
    return Promise.resolve([]);
  }
  
  const params = new URLSearchParams();
  if (city) params.append('stad', city);
  if (name) params.append('query', name);
  
  const url = `../PHP/tour/search_tours.php?${params.toString()}`;
  console.log('Fetching tours from:', url);
  
  return fetch(url)
    .then(response => {
      console.log('Tour search response status:', response.status);
      return response.json();
    })
    .then(data => {
      console.log('Tour search data received:', data);
      if (typeof displayTourResults === 'function') {
        displayTourResults(data);
      } else {
        console.error('displayTourResults function not found');
      }
      return data; // Return the data for use by caller
    })
    .catch(error => {
      console.error('Error fetching tours:', error);
      return [];
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

// Format tour duration for display
function formatTourDuration(days, hours) {
  const daysNum = parseInt(days) || 0;
  let hoursNum = 0;
  
  // Handle different hour formats: DOUBLE (2.5), TIME format ("04:30:00"), or integer
  if (typeof hours === 'string' && hours.includes(':')) {
    // TIME format: "04:30:00" -> 4.5 hours
    const timeParts = hours.split(':');
    hoursNum = parseInt(timeParts[0]) || 0;
    if (timeParts[1]) {
      hoursNum += (parseInt(timeParts[1]) || 0) / 60; // Add minutes as fraction
    }
  } else {
    // DOUBLE or integer: 2.5, 4, etc.
    hoursNum = parseFloat(hours) || 0;
  }
  
  if (daysNum === 0 && hoursNum === 0) return '';
  
  if (daysNum === 0) {
    // Format hours: 2.5 -> "2,5 uur", 4 -> "4 uur"
    const hoursFormatted = hoursNum % 1 === 0 ? hoursNum.toString() : hoursNum.toFixed(1).replace('.', ',');
    return `${hoursFormatted} uur`;
  }
  
  if (hoursNum === 0) {
    return `${daysNum} dag${daysNum > 1 ? 'en' : ''}`;
  }
  
  // Both days and hours
  const hoursFormatted = hoursNum % 1 === 0 ? hoursNum.toString() : hoursNum.toFixed(1).replace('.', ',');
  return `${daysNum} dag${daysNum > 1 ? 'en' : ''} ${hoursFormatted} uur`;
}

/**
 * Initialize tour picture slider
 * @param {Object} tour - Tour object with Code for media lookup
 */
function initializeTourPictureSlider(tour) {
    // Clean up existing slider
    if (tourPictureSlider) {
        tourPictureSlider.destroy();
    }
    
    // Create new slider for tour images
    if (typeof createPictureSlider === 'function') {
        tourPictureSlider = createPictureSlider('product-main-slider', {
            height: '400px',
            clickToModal: true,
            showCounter: true,
            showNavigation: true
        });
        
        // Load tour media by tourID
        if (tour && tour.tourID) {
            tourPictureSlider.loadMedia(tour.tourID);
            console.log('Loading tour media for tourID:', tour.tourID);
        }
    } else {
        console.error('createPictureSlider function not available');
    }
}

// Display tour results function
function displayTourResults(tours) {
  console.log('displayTourResults called with:', tours);
  
  // Store tour results for later use (e.g., editing)
  window.lastTourSearchResults = tours;
  
  const container = document.getElementById("hotel-results");
  if (!container) {
    console.error('hotel-results container not found');
    return;
  }
  
  container.innerHTML = "";
  
  // Check if we got an error response
  if (tours && tours.error) {
    console.error('Tour search error:', tours.error);
    container.innerHTML = `<div class="no-results">Fout bij zoeken: ${tours.error}</div>`;
    return;
  }
  
  if (!tours || !Array.isArray(tours) || tours.length === 0) {
    console.log('No tours to display');
    container.innerHTML = '<div class="no-results">Geen excursies gevonden</div>';
    return;
  }
  
  console.log('Displaying', tours.length, 'tours');

  tours.forEach(tour => {
    const tourCard = document.createElement("div");
    tourCard.className = "hotel-card tour-card";
    tourCard.setAttribute("data-tour-code", tour.Code);
    tourCard.setAttribute("data-tour-id", tour.tourID); // Add tourID for better matching
    
    // Calculate display price based on perPax/perTour - show per person price
    const paxInput = document.getElementById('pax');
    const pax = paxInput ? parseInt(paxInput.value) || 1 : 1;
    
    let displayPrice = 0;
    let priceText = '';
    
    if (tour.perTour === '1') {
      displayPrice = parseFloat(tour.Gross_raw) || 0;
      priceText = `${tour.Currency} ${displayPrice.toFixed(2)} per tour`;
    } else if (tour.perPax === '1') {
      displayPrice = parseFloat(tour.Gross_raw) || 0; // Price per person
      priceText = `${tour.Currency} ${displayPrice.toFixed(2)} p.p.`;
    } else {
      displayPrice = parseFloat(tour.Gross_raw) || 0;
      priceText = `${tour.Currency} ${displayPrice.toFixed(2)}`;
    }
    
    const durationText = formatTourDuration(tour.Days, tour.Hours);
    
    tourCard.innerHTML = `
      <div class="hotel-image">
        ${tour.Foto ? `<img src="${tour.Foto}" alt="${tour.Product}" onerror="this.style.display='none'">` : '<div class="no-image">Geen foto</div>'}
      </div>
      <div class="hotel-details">
        <h3 class="hotel-name">${tour.Product}</h3>
        <p class="hotel-location">${tour.Locatie_stad}</p>
        <p class="hotel-description">${tour.Beschrijving_kort || ''}</p>
        ${durationText ? `<p class="tour-duration">⏱️ ${durationText}</p>` : ''}
        <div class="hotel-price">
          <span class="price-label">Prijs: </span>
          <span class="price-amount">${priceText}</span>
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
  
  // Clear any hotel selection when switching to tours
  if (typeof currentSelection !== 'undefined') {
    currentSelection.hotel = null;
    currentSelection.room = null;
    currentSelection.hotelCode = null;
    currentSelection.roomType = null;
  }
  document.querySelectorAll(".hotel-card.selected").forEach(card => {
    card.classList.remove("selected");
  });
  
  // Clean up hotel picture slider when switching to tours
  if (typeof hotelPictureSlider !== 'undefined' && hotelPictureSlider) {
    hotelPictureSlider.destroy();
    hotelPictureSlider = null;
  }
  
  // Clear room selection dropdown
  const roomSelect = document.getElementById("room-type-select");
  if (roomSelect) {
    roomSelect.innerHTML = '<option value="">Select a room type...</option>';
    roomSelect.style.display = 'none';
  }
  
  // Mark new selection
  tourCard.classList.add("selected");
  currentSelection.tour = tour;
  
  // Show product info panel with tour details
  const productPanel = document.getElementById("product-info-panel");
  if (productPanel) {
    productPanel.classList.add("visible");
    
    // Update product info with tour details - force title update
    const titleElement = productPanel.querySelector('.section-title');
    if (titleElement) {
      titleElement.textContent = tour.Product || 'Tour Information';
    }

    // Also update product title if it exists
    const productTitle = document.getElementById('product-title');
    if (productTitle) {
      productTitle.textContent = tour.Product || 'Tour Information';
    }
    
    // Update description title for tours
    const descriptionTitle = document.getElementById('description-title');
    if (descriptionTitle) {
      descriptionTitle.textContent = 'Tour omschrijving';
    }
    
    // Clear hotel-specific content and load tour content
    clearHotelContent();
    loadTourContent(tour);
    
    // Clear any existing picture slider and initialize for tour
    if (typeof clearPictureSlider === 'function') {
      clearPictureSlider();
    }
    if (typeof initializePictureSlider === 'function') {
      initializePictureSlider(tour.Code);
    }
    
    // Initialize tour time selection system with tourID instead of Code
    if (typeof window.tourTimeManager !== 'undefined') {
      console.log('Initializing tour time selection with tourID:', tour.tourID);
      window.tourTimeManager.initialize(tour.tourID || tour.Code);
    }
  }
  
  // Update and show the add button with pricing
  updateTourAddButtonValue();
}

// Clear hotel-specific content when switching to tours
function clearHotelContent() {
  // Clear description
  const descriptionContent = document.getElementById("product-description-content");
  if (descriptionContent) {
    descriptionContent.innerHTML = "";
  }
  
  // Clear checklist (inclusions/exclusions)
  const checklist = document.getElementById("product-checklist");
  if (checklist) {
    checklist.innerHTML = "";
  }
  
  // Clear extras list
  const extrasList = document.getElementById("product-extras-list");
  if (extrasList) {
    extrasList.innerHTML = "";
  }
  
  // Clear room selection dropdown and room cards
  const roomSelect = document.getElementById("room-type-select");
  if (roomSelect) {
    roomSelect.innerHTML = '<option value="">Select a room type...</option>';
    roomSelect.style.display = 'none';
  }
  
  // Hide room selection label
  const roomLabel = document.querySelector('label[for="room-type-select"]');
  if (roomLabel) {
    roomLabel.style.display = 'none';
  }
  
  // Clear any room cards
  const roomCards = document.querySelectorAll('.room-card');
  roomCards.forEach(card => card.remove());
  
  // Clear picture slider content
  const pictureContainer = document.querySelector('.picture-slider-container');
  if (pictureContainer) {
    pictureContainer.innerHTML = '';
  }
}

// Clear tour-specific content when switching to hotels
function clearTourContent() {
  // Clear description
  const descriptionContent = document.getElementById("product-description-content");
  if (descriptionContent) {
    descriptionContent.innerHTML = "";
  }
  
  // Clear checklist (inclusions/exclusions)
  const checklist = document.getElementById("product-checklist");
  if (checklist) {
    checklist.innerHTML = "";
  }
  
  // Clear extras list
  const extrasList = document.getElementById("product-extras-list");
  if (extrasList) {
    extrasList.innerHTML = "";
  }
  
  // Clear picture slider content
  const pictureContainer = document.querySelector('.picture-slider-container');
  if (pictureContainer) {
    pictureContainer.innerHTML = '';
  }
  
  // Clear tour time selection
  if (typeof window.tourTimeManager !== 'undefined') {
    window.tourTimeManager.clear();
  }
}

// Load tour-specific content
function loadTourContent(tour) {
  // Set tour description
  const descriptionContent = document.getElementById("product-description-content");
  if (descriptionContent && tour.Beschrijving_lang) {
    descriptionContent.innerHTML = tour.Beschrijving_lang;
  }
  
  // Initialize tour picture slider
  initializeTourPictureSlider(tour);
  
  // Load tour options, inclusions, and extras
  fetch(`../PHP/tour/get_tour_options.php?code=${encodeURIComponent(tour.Code)}`)
    .then(response => response.json())
    .then(data => {
      console.log('Fetched tour options:', data);
      console.log('Tour code used:', tour.Code);
      console.log('Inclusions count:', data.inclusions ? data.inclusions.length : 0);
      console.log('Exclusions count:', data.exclusions ? data.exclusions.length : 0);
      console.log('Extras count:', data.extras ? data.extras.length : 0);
      
      // Update tour currency with the correct value from API
      if (data.currency) {
        tour.Currency = data.currency;
        console.log('Updated tour currency to:', data.currency);
      }
      
      // Update tour with additional fields from get_tour_options
      if (data.tour) {
        tour.Inbounder = data.tour.Inbounder || tour.Inbounder;
        tour.Supplier = data.tour.Supplier || tour.Supplier;
        tour.Locaties_adres = data.tour.Locaties_adres || tour.Locaties_adres;
        console.log('Updated tour fields - Inbounder:', tour.Inbounder, 'Supplier:', tour.Supplier);
      }
      
      // Display inclusions and exclusions
      const checklist = document.getElementById("product-checklist");
      if (checklist) {
        checklist.innerHTML = ""; // Clear existing
        
        // Add location and basic info
        if (tour.Locatie_stad && tour.Locatie_land) {
          const li = document.createElement("li");
          li.innerHTML = `📍 <strong>Locatie: ${tour.Locatie_stad}, ${tour.Locatie_land}</strong>`;
          li.style.listStyleType = "none";
          checklist.appendChild(li);
        }
        
        // Add duration if available
        if (tour.Days || tour.Hours) {
          const durationText = formatTourDuration(tour.Days, tour.Hours);
          if (durationText) {
            const li = document.createElement("li");
            li.innerHTML = `⏱️ <strong>Duur: ${durationText}</strong>`;
            li.style.listStyleType = "none";
            checklist.appendChild(li);
          }
        }
        
        // Add inclusions
        if (data.inclusions && data.inclusions.length > 0) {
          data.inclusions.forEach(inclusion => {
            const li = document.createElement("li");
            li.innerHTML = `✅ <strong>${inclusion.description}</strong>`;
            li.style.listStyleType = "none";
            checklist.appendChild(li);
          });
        }
        
        // Add exclusions
        if (data.exclusions && data.exclusions.length > 0) {
          data.exclusions.forEach(exclusion => {
            const li = document.createElement("li");
            li.innerHTML = `❌ <strong>${exclusion.description}</strong>`;
            li.style.listStyleType = "none";
            checklist.appendChild(li);
          });
        }
      }
      
      // Display optional extras
      const extrasList = document.getElementById("product-extras-list");
      if (extrasList && data.extras && data.extras.length > 0) {
        extrasList.innerHTML = ""; // Clear existing
        
        data.extras.forEach((extra, index) => {
          const extraDiv = document.createElement("div");
          extraDiv.className = "product-extra";
          
          const canAddMore = extra.canAddMore ? parseInt(extra.canAddMore) : 0;
          
          if (canAddMore > 0) {
            // Multi-unit: show plus/minus input (like hotels)
            const minusBtn = document.createElement("button");
            minusBtn.type = "button";
            minusBtn.textContent = "-";
            minusBtn.className = "extra-minus-btn";
            
            const plusBtn = document.createElement("button");
            plusBtn.type = "button";
            plusBtn.textContent = "+";
            plusBtn.className = "extra-plus-btn";
            
            const qtyInput = document.createElement("input");
            qtyInput.type = "number";
            qtyInput.min = "0";
            qtyInput.value = "0";
            qtyInput.id = `tour-extra-qty-${index}`;
            qtyInput.className = "extra-qty-input";
            qtyInput.setAttribute('data-cost', extra.extra_cost);
            qtyInput.setAttribute('data-per-pax', extra.perPax);
            qtyInput.setAttribute('data-extra-name', extra.Extra || extra.description); // Add Extra field
            qtyInput.addEventListener('change', updateTourAddButtonValue);
            
            const label = document.createElement("label");
            label.htmlFor = qtyInput.id;
            label.innerHTML = `${extra.description} (+${data.currency} ${parseFloat(extra.extra_cost).toFixed(2)}${extra.perPax ? ' p.p.' : ''})`;
            
            // Add event listeners for +/- buttons
            minusBtn.addEventListener('click', () => {
              const currentValue = parseInt(qtyInput.value) || 0;
              if (currentValue > 0) {
                qtyInput.value = currentValue - 1;
                updateTourAddButtonValue();
              }
            });
            
            plusBtn.addEventListener('click', () => {
              const currentValue = parseInt(qtyInput.value) || 0;
              qtyInput.value = currentValue + 1;
              updateTourAddButtonValue();
            });
            
            extraDiv.appendChild(minusBtn);
            extraDiv.appendChild(qtyInput);
            extraDiv.appendChild(plusBtn);
            extraDiv.appendChild(label);
            
          } else {
            // Single checkbox (like before)
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = `tour-extra-${index}`;
            checkbox.className = "extra-checkbox";
            checkbox.setAttribute('data-cost', extra.extra_cost);
            checkbox.setAttribute('data-per-pax', extra.perPax);
            checkbox.setAttribute('data-extra-name', extra.Extra || extra.description); // Add Extra field
            checkbox.addEventListener('change', updateTourAddButtonValue);
            
            const label = document.createElement("label");
            label.htmlFor = `tour-extra-${index}`;
            label.innerHTML = `${extra.description} (+${data.currency} ${parseFloat(extra.extra_cost).toFixed(2)}${extra.perPax ? ' p.p.' : ''})`;
            
            extraDiv.appendChild(checkbox);
            extraDiv.appendChild(label);
          }
          
          extrasList.appendChild(extraDiv);
        });
      }
    })
    .catch(error => {
      console.error('Error loading tour options:', error);
      
      // Fallback: show basic info
      const checklist = document.getElementById("product-checklist");
      if (checklist) {
        checklist.innerHTML = "";
        
        if (tour.Locatie_stad && tour.Locatie_land) {
          const li = document.createElement("li");
          li.innerHTML = `📍 <strong>Locatie: ${tour.Locatie_stad}, ${tour.Locatie_land}</strong>`;
          li.style.listStyleType = "none";
          checklist.appendChild(li);
        }
      }
    });
}

// Update tour add button with pricing
function updateTourAddButtonValue() {
  const addBtn = document.getElementById('add-selection-btn');
  if (!addBtn || !currentSelection.tour) return;
  
  // Check if time selection is required and if one is selected
  const timeSelection = (typeof window.tourTimeManager !== 'undefined') ? 
      window.tourTimeManager.getCurrentSelection() : null;
  
  // If we have time selection system active, check if a timeslot is selected
  const timeContainer = document.getElementById('tour-time-selection');
  const hasTimeSelection = timeContainer && timeContainer.style.display !== 'none';
  
  if (hasTimeSelection) {
    const hasMultipleSlots = document.querySelectorAll('.time-slot-card').length > 1;
    const hasSelectedSlot = document.querySelector('.time-slot-card.selected') !== null;
    
    // If there are multiple time slots but none selected, hide the button
    if (hasMultipleSlots && !hasSelectedSlot) {
      addBtn.style.display = 'none';
      return;
    }
  }
  
  const tour = currentSelection.tour;
  const paxInput = document.getElementById('pax');
  const pax = paxInput ? parseInt(paxInput.value) || 1 : 1;
  
  let totalPrice = 0;
  let basePrice = parseFloat(tour.Gross_raw) || 0;
  
  if (tour.perTour === '1') {
    totalPrice = basePrice;
  } else if (tour.perPax === '1') {
    totalPrice = basePrice * pax;
  } else {
    totalPrice = basePrice;
  }
  
  // Add extras pricing
  const extraCheckboxes = document.querySelectorAll('.extra-checkbox:checked');
  const extraQuantities = document.querySelectorAll('.extra-qty-input');
  let extrasTotal = 0;
  
  // Handle checkboxes (single items)
  extraCheckboxes.forEach(checkbox => {
    const extraCost = parseFloat(checkbox.getAttribute('data-cost')) || 0;
    const perPax = checkbox.getAttribute('data-per-pax') === '1';
    if (perPax) {
      extrasTotal += extraCost * pax;
    } else {
      extrasTotal += extraCost;
    }
  });
  
  // Handle quantity inputs (multi-unit items)
  extraQuantities.forEach(qtyInput => {
    const quantity = parseInt(qtyInput.value) || 0;
    if (quantity > 0) {
      const extraCost = parseFloat(qtyInput.getAttribute('data-cost')) || 0;
      const perPax = qtyInput.getAttribute('data-per-pax') === '1';
      // For quantity inputs with perPax=1, the quantity represents how many people want this extra
      // So we just multiply extraCost * quantity (not * total_pax)
      extrasTotal += extraCost * quantity;
    }
  });
  
  totalPrice += extrasTotal;
  
  // Add time slot price modifier (per person pricing)
  if (hasTimeSelection && timeSelection && timeSelection.timeslotId) {
    // Get the price modifier from the time manager
    const timeManagerSelection = timeSelection;
    
    // Try to get the selected timeslot data from the DOM
    const selectedCard = document.querySelector('.time-slot-card.selected');
    if (selectedCard) {
      // Look for the stored price modifier in the timeslot data
      // We need to access the original timeslot data that was used to create the card
      const timeslotContainer = document.getElementById('tour-timeslots-list');
      if (timeslotContainer) {
        // Get all timeslot cards and find the selected one's price modifier
        const allCards = timeslotContainer.querySelectorAll('.time-slot-card');
        allCards.forEach(card => {
          if (card.classList.contains('selected')) {
            // Parse the price from the price element if it exists
            const priceElement = card.querySelector('.time-slot-price');
            if (priceElement && priceElement.textContent.trim()) {
              const priceText = priceElement.textContent.trim();
              const modifierMatch = priceText.match(/([+-])€(\d+\.?\d*)/);
              if (modifierMatch) {
                const sign = modifierMatch[1] === '-' ? -1 : 1;
                const modifierAmount = parseFloat(modifierMatch[2]) || 0;
                const priceModifier = sign * modifierAmount;
                
                // Price modifier is per person, so multiply by PAX
                const timeslotPriceTotal = priceModifier * pax;
                totalPrice += timeslotPriceTotal;
                console.log('Added timeslot price modifier:', priceModifier, 'per person x', pax, 'people =', timeslotPriceTotal);
              }
            }
          }
        });
      }
    }
  }
  
  const currency = tour.Currency || 'EUR';
  
  addBtn.innerHTML = `Toevoegen: ${currency} ${totalPrice.toFixed(2)}`;
  addBtn.style.display = 'block';
  addBtn.classList.add('visible');
  addBtn.disabled = false;
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
    
    // Update tour pricing when PAX changes
    if (currentSelection.tour && typeof updateTourAddButtonValue === 'function') {
      updateTourAddButtonValue();
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
      const mainType = document.getElementById('mainType');
      const selectedType = mainType ? mainType.value : '';
      
      // Validate selection based on type
      if (selectedType === 'accommodatie') {
        if (!currentSelection.hotel || !currentSelection.room) {
          alert('Selecteer eerst een hotel en kamer.');
          return;
        }
      } else if (selectedType === 'excursie') {
        if (!currentSelection.tour) {
          alert('Selecteer eerst een excursie.');
          return;
        }
      } else {
        alert('Selecteer eerst een type (accommodatie of excursie).');
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
        
        console.log('Tour database items created:', tourDbItems);
        console.log('First item structure:', JSON.stringify(tourDbItems[0], null, 2));
        console.log('Tour object fields - Inbounder:', tour.Inbounder, 'Supplier:', tour.Supplier, 'tourID:', tour.tourID);
        
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
    
    const Datum_aanvang = dateInput ? dateInput.value : null;
    const Tijd_aanvang = timeInput ? timeInput.value : '';
    const pax = paxInput ? parseInt(paxInput.value) || 1 : 1;
    
    // Get time selection data
    const timeSelection = (typeof window.tourTimeManager !== 'undefined') ? 
        window.tourTimeManager.getCurrentSelection() : null;
    
    console.log('Time selection for database save:', timeSelection);
    
    // Determine actual times and service description
    let actualStartTime = Tijd_aanvang; // Default from time input
    let actualEndTime = '';
    let serviceDescription = '';
    
    if (timeSelection && timeSelection.timeslotId && timeSelection.timeslotId !== 'default') {
        // Get the selected timeslot details
        const selectedCard = document.querySelector(`[data-slot-id="${timeSelection.timeslotId}"]`);
        if (selectedCard) {
            const slotNameElement = selectedCard.querySelector('.time-slot-name');
            // Store ONLY the clean slot name without any extra text for precise matching
            serviceDescription = slotNameElement ? slotNameElement.textContent.trim() : '';
            
            // Use custom times if available, otherwise use slot times
            if (timeSelection.customStartTime && timeSelection.customEndTime) {
                actualStartTime = timeSelection.customStartTime;
                actualEndTime = timeSelection.customEndTime;
                // Don't add extra text to serviceDescription - keep it clean for restoration
            } else {
                // Get times from the display
                const timeElements = selectedCard.querySelectorAll('.time-display');
                if (timeElements.length >= 2) {
                    actualStartTime = timeElements[0].textContent.trim();
                    actualEndTime = timeElements[1].textContent.trim();
                }
            }
        }
    } else if (timeSelection && timeSelection.customStartTime && timeSelection.customEndTime) {
        // Fallback for custom times without slot selection
        actualStartTime = timeSelection.customStartTime;
        actualEndTime = timeSelection.customEndTime;
        serviceDescription = 'Custom Tour Times'; // Keep this clean without extra formatting
    }
    
    console.log('Final tour times:', { actualStartTime, actualEndTime, serviceDescription });
    
    // Generate ReisID for tour - find next available sequence
    const UID = window.currentUID || (window.location.search.match(/uid=([^&]+)/)?.[1] || '');
    
    const existingSequences = typeof tripItems !== 'undefined' ? tripItems
        .map(item => {
            if (item.id && item.id.includes('_')) {
                const parts = item.id.split('_');
                const lastPart = parts[parts.length - 1];
                // Remove any letter suffixes (a, b, c) to get base sequence
                const baseSequence = lastPart.replace(/[a-z]+$/, '');
                return parseInt(baseSequence) || 0;
            }
            return 0;
        })
        .filter(seq => seq > 0) : [];
    
    // Find the next available sequence number
    const maxSequence = existingSequences.length > 0 ? Math.max(...existingSequences) : 0;
    const Sequence = (maxSequence + 1).toString().padStart(3, '0');
    const ReisID = UID + '_' + Sequence;
    
    console.log('Creating new tour item with sequence:', Sequence, 'existing sequences:', existingSequences);
    
    // Calculate end date based on tour duration
    let Datum_einde = null;
    if (Datum_aanvang && (tour.Days || tour.Hours)) {
        const startDate = new Date(Datum_aanvang);
        const days = parseInt(tour.Days) || 0;
        let hours = 0;
        
        // Handle different hour formats: DOUBLE (2.5), TIME format ("04:30:00"), or integer
        if (typeof tour.Hours === 'string' && tour.Hours.includes(':')) {
            // TIME format: "04:30:00" -> 4.5 hours
            const timeParts = tour.Hours.split(':');
            hours = parseInt(timeParts[0]) || 0;
            if (timeParts[1]) {
                hours += (parseInt(timeParts[1]) || 0) / 60; // Add minutes as fraction
            }
        } else {
            // DOUBLE or integer: 2.5, 4, etc.
            hours = parseFloat(tour.Hours) || 0;
        }
        
        // Add days and hours to start date
        const endDateTime = new Date(startDate);
        endDateTime.setDate(endDateTime.getDate() + days);
        
        // Handle fractional hours: 2.5 hours = 2 hours + 30 minutes
        const wholeHours = Math.floor(hours);
        const minutes = Math.round((hours - wholeHours) * 60);
        endDateTime.setHours(endDateTime.getHours() + wholeHours);
        endDateTime.setMinutes(endDateTime.getMinutes() + minutes);
        
        // Format end date as YYYY-MM-DD
        Datum_einde = endDateTime.toISOString().split('T')[0];
    }
    
    let basePrice = parseFloat(tour.Gross_raw) || 0;
    let Gross = 0;
    
    if (tour.perTour === '1') {
        Gross = basePrice;
    } else if (tour.perPax === '1') {
        Gross = basePrice * pax;
    } else {
        Gross = basePrice;
    }
    
    // Calculate net price
    let Nett = tour.perPax === '1' ? (parseFloat(tour.Nett_raw) || 0) * pax : (parseFloat(tour.Nett_raw) || 0);
    
    // Add extras pricing
    const extraCheckboxes = document.querySelectorAll('.extra-checkbox:checked');
    const extraQuantities = document.querySelectorAll('.extra-qty-input');
    let extrasTotal = 0;
    let selectedExtras = [];
    
    // Handle checkboxes (single items)
    extraCheckboxes.forEach(checkbox => {
        const extraCost = parseFloat(checkbox.getAttribute('data-cost')) || 0;
        const extraLabel = checkbox.nextElementSibling ? checkbox.nextElementSibling.textContent : 'Extra option';
        const extraName = checkbox.getAttribute('data-extra-name') || extraLabel; // Get the actual Extra field
        const perPax = checkbox.getAttribute('data-per-pax') === '1';
        
        let extraTotal = perPax ? extraCost * pax : extraCost;
        extrasTotal += extraTotal;
        
        selectedExtras.push({
            description: extraLabel,
            extraName: extraName, // Store the Extra field value
            cost: extraCost,
            total: extraTotal
        });
    });
    
    // Handle quantity inputs (multi-unit items)
    extraQuantities.forEach(qtyInput => {
        const quantity = parseInt(qtyInput.value) || 0;
        if (quantity > 0) {
            const extraCost = parseFloat(qtyInput.getAttribute('data-cost')) || 0;
            const extraLabel = qtyInput.getAttribute('data-description') || 'Extra option';
            const extraName = qtyInput.getAttribute('data-extra-name') || extraLabel; // Get the actual Extra field
            
            let extraTotal = extraCost * quantity;
            extrasTotal += extraTotal;
            
            selectedExtras.push({
                description: extraLabel,
                extraName: extraName, // Store the Extra field value
                cost: extraCost,
                quantity: quantity,
                total: extraTotal
            });
        }
    });
    
    // Calculate time pricing modifier
    let timePriceModifier = 0;
    if (timeSelection && timeSelection.timeslotId && timeSelection.timeslotId !== 'default') {
        // Get the price modifier from the selected timeslot
        const selectedCard = document.querySelector(`[data-slot-id="${timeSelection.timeslotId}"]`);
        if (selectedCard) {
            const priceElement = selectedCard.querySelector('.time-slot-price');
            if (priceElement && priceElement.textContent.includes('€')) {
                const priceText = priceElement.textContent;
                const match = priceText.match(/[+-]?€(\d+(?:\.\d{2})?)/);
                if (match) {
                    timePriceModifier = parseFloat(match[1]);
                    if (priceText.includes('-')) timePriceModifier = -timePriceModifier;
                }
            }
        }
    }
    
    Gross += timePriceModifier;
    Nett += timePriceModifier * 0.8;
    
    // Main tour item using database field names
    const dbItem = {
        ReisID,
        UID,
        Sequence,
        Datum_aanvang,
        Tijd_aanvang: actualStartTime,
        Datum_einde,
        Tijd_einde: actualEndTime,
        Locatie_stad: tour.Locatie_stad || '',
        Locaties_adres: tour.Locaties_adres || '',
        Inbounder: tour.Inbounder || '',
        Inbounder_bookingref: '',
        Supplier_naam: tour.Supplier || '',
        Supplier_product: tour.Product || '',
        Supplier_bookingref: '',
        Service: serviceDescription, // Store timeslot name here
        Product_type: 'tour',
        Product_code: tour.tourID || tour.Code,
        Product_id: tour.tourID || tour.Code, // Add Product_id for timeslot restoration
        Nett,
        Nett_valuta: tour.Currency || 'EUR',
        Gross,
        Gross_valuta: tour.Currency || 'EUR',
        Beschrijving_kort: tour.Beschrijving_kort || '',
        Beschrijving_lang: tour.Beschrijving_lang || '',
        Note_random: '',
        Note_alert: ''
    };
    
    const dbItems = [dbItem];
    
    // Add extra items as separate entries if needed (similar to hotel extras)
    if (selectedExtras.length > 0) {
        const suffixes = 'abcdefghijklmnopqrstuvwxyz'.split('');
        selectedExtras.forEach((extra, idx) => {
            if (idx < suffixes.length) {
                dbItems.push({
                    ReisID: ReisID + suffixes[idx],
                    UID,
                    Sequence: Sequence, // Same sequence as main item
                    Datum_aanvang,
                    Tijd_aanvang,
                    Datum_einde,
                    Tijd_einde: '',
                    Locatie_stad: tour.Locatie_stad || '',
                    Locaties_adres: tour.Locaties_adres || '',
                    Inbounder: tour.Inbounder || '',
                    Inbounder_bookingref: '',
                    Supplier_naam: tour.Supplier || '',
                    Supplier_product: extra.extraName || extra.description,
                    Supplier_bookingref: '',
                    Service: '',
                    Product_type: 'extra',
                    Product_code: tour.tourID || tour.Code,
                    Nett: extra.total * 0.8,
                    Nett_valuta: tour.Currency || 'EUR',
                    Gross: extra.total,
                    Gross_valuta: tour.Currency || 'EUR',
                    Beschrijving_kort: extra.description,
                    Beschrijving_lang: `Extra voor ${tour.Product}`,
                    Note_random: '',
                    Note_alert: ''
                });
            }
        });
    }
    
    return dbItems;
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
    
    fetch('../PHP/trip/save_trip_item.php', {
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
        
        fetch('../PHP/trip/save_trip_item.php', {
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
        const url = `../PHP/file/get_file_info.php?uid=${uid}`;
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
