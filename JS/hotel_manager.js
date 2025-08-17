// hotel_manager.js - Hotel search, selection, rooms & pricing management

// Global variables
let hotelsFetched = false;
let allHotels = [];

// Picture slider instances
let hotelPictureSlider = null;
let roomPictureSlider = null;

// Initialize hotel manager
function initializeHotelManager() {
    console.log("Hotel Manager - Initializing...");
    
    // Fetch hotels data on initialization
    fetchHotelsData();
    
    console.log("Hotel Manager - Initialized successfully");
}

// Fetch hotels data from server
function fetchHotelsData() {
  fetch('../PHP/search_accommodatie.php?stad=')
    .then(response => response.json())
    .then(data => {
      console.log("Fetched hotel data:", data);
      allHotels = data;
      hotelsFetched = true;
    })
    .catch(error => {
      console.error('Error fetching hotels:', error);
    });
}

// Search hotels based on criteria
function searchHotels() {
    const city = document.getElementById("searchCity").value.toLowerCase();
    const nights = parseInt(document.getElementById("searchNights").value) || 1;
    const nameFilter = document.getElementById("searchName").value.toLowerCase();

    // Filter hotels from allHotels array
    const filtered = allHotels.filter(hotel => {
        const matchCity = hotel.Locatie_stad.toLowerCase().includes(city);
        const matchName = hotel.Product.toLowerCase().includes(nameFilter);
        return matchCity && matchName;
    });

    console.log("Filtered hotels:", filtered.length, "results");
    displayHotelResults(filtered, nights);
}

// Filter hotel results (re-trigger search)
function filterHotelResults() {
    searchHotels();
}

// Display hotel search results
function displayHotelResults(hotels, nights) {
    const container = document.getElementById("hotel-results");
    container.innerHTML = "";

    hotels.forEach(hotel => {
        const card = document.createElement("div");
        card.className = "hotel-card";
        card.setAttribute("data-hotel-code", hotel.Code);

        card.innerHTML = `
          <img src="${hotel.Foto}" alt="${hotel.Product}" />
          <div class="hotel-info">
            <h4>${hotel.Product}</h4>
            <p>${hotel.Beschrijving_kort}</p>
            <p class="hotel-price">${hotel.Prijs_vanaf !== 'geen prijs bekend' ? 'Vanaf ' : ''}${formatHotelPrice(hotel)}</p>
          </div>
        `;

        card.addEventListener("click", () => selectHotel(hotel.Code, nights, hotel.Currency));
        console.log("Hotel card created for:", hotel.Code);

        container.appendChild(card);
    });
}

// Format hotel price display
function formatHotelPrice(hotel) {
  const currency = hotel.Currency || "€";
  if (hotel.Prijs_vanaf && hotel.Prijs_vanaf !== 'geen prijs bekend' && hotel.Gross != null) {
    return `${currency} ${parseFloat(hotel.Gross).toFixed(2)}`;
  }
  return 'Prijs onbekend';
}

// Select a hotel
function selectHotel(code, nights, currency = "€") {
  const hotel = allHotels.find(h => h.Code === code);
  if (!hotel) return;

  // Store current hotel selection in global state
  if (typeof currentSelection !== 'undefined') {
    currentSelection.hotel = hotel;
    currentSelection.hotelCode = code;
    currentSelection.room = null;
    currentSelection.roomType = null;
  }

  // Remove existing selection highlight
  document.querySelectorAll(".hotel-card").forEach(card => card.classList.remove("selected"));

  // Highlight selected card
  const selectedCard = document.querySelector(`[data-hotel-code="${code}"]`);
  if (selectedCard) selectedCard.classList.add("selected");

  // Show product info panel
  const productPanel = document.getElementById("product-info-panel");
  productPanel.classList.add("visible");

  // Clear any tour selection when switching to hotels
  if (typeof currentSelection !== 'undefined') {
    currentSelection.tour = null;
  }
  document.querySelectorAll(".tour-card.selected").forEach(card => {
    card.classList.remove("selected");
  });

  // Clear tour-specific content
  if (typeof clearTourContent === 'function') {
    clearTourContent();
  }

  // Update description title for hotels
  const descriptionTitle = document.getElementById('description-title');
  if (descriptionTitle) {
    descriptionTitle.textContent = 'Hotelbeschrijving';
  }

  // Update panel title with hotel name - force update
  const titleElement = productPanel.querySelector('.section-title');
  console.log('Updating hotel panel title...', {
    titleElement: titleElement,
    hotelProduct: hotel.Product,
    hotelProductnaam: hotel.Productnaam,
    hotel: hotel
  });
  if (titleElement) {
    const hotelName = hotel.Product || hotel.Productnaam;
    if (hotelName) {
      titleElement.textContent = hotelName;
      console.log('Set title to hotel name:', hotelName);
    } else {
      titleElement.textContent = 'Hotel Information';
      console.log('Set title to fallback: Hotel Information');
    }
  } else {
    console.error('Title element not found in product panel');
  }

  // Also update product title if it exists
  const productTitle = document.getElementById('product-title');
  if (productTitle) {
    const hotelName = hotel.Product || hotel.Productnaam;
    if (hotelName) {
      productTitle.textContent = hotelName;
    } else {
      productTitle.textContent = 'Hotel Information';
    }
  }

  // Initialize main picture slider for hotel
  initializeHotelPictureSlider(hotel);

  // Fill description
  const descP = document.getElementById("product-description-content");
  if (descP) {
    if (hotel.Beschrijving_lang && hotel.Beschrijving_lang.trim() !== '') {
      descP.innerHTML = hotel.Beschrijving_lang;
    } else {
      descP.innerHTML = '&nbsp;';
    }
  }

  // Clear hotel checklist and extras
  const hotelChecklist = document.getElementById("product-checklist");
  if (hotelChecklist) hotelChecklist.innerHTML = "";
  const extrasList = document.getElementById("product-extras-list");
  if (extrasList) extrasList.innerHTML = "";

  // Load room types and options
  fetch(`../PHP/get_room_types.php?code=${encodeURIComponent(hotel.Code)}`)
    .then(response => response.json())
    .then(data => {
      const rooms = data.rooms || [];
      const options = data.options || [];
      window.lastRoomOptions = options;
      window.lastRooms = rooms;
      console.log('Fetched rooms:', rooms);
      console.log('Fetched options:', options);

      // Hotel-wide checklist
      if (hotelChecklist) {
        const hotelOptions = options.filter(opt => opt.Code === hotel.Code && (!opt.roomCode || opt.roomCode === ""));
        let hasChecklist = false;
        hotelOptions.forEach(opt => {
          if (opt.Inclusief) {
            const li = document.createElement("li");
            li.innerHTML = `✅ <strong>${opt.Inclusief}</strong>`;
            li.style.listStyleType = "none";
            hotelChecklist.appendChild(li);
            hasChecklist = true;
          } else if (opt.Exclusief) {
            const li = document.createElement("li");
            li.innerHTML = `❌ <strong>${opt.Exclusief}</strong>`;
            li.style.listStyleType = "none";
            hotelChecklist.appendChild(li);
            hasChecklist = true;
          }
        });
        if (!hasChecklist) {
          hotelChecklist.innerHTML = "<li>Geen opties voor dit hotel.</li>";
        }
      }

      // Hotel-wide extras
      if (extrasList) {
        const roomIDs = rooms.map(r => r.ID);
        const hotelExtras = options.filter(opt => opt.Code === hotel.Code && opt.Extra && !roomIDs.includes(opt.ID));
        hotelExtras.forEach(opt => {
          const label = opt.Extra;
          const price = opt.Gross ? ` (${currency} ${parseFloat(opt.Gross).toFixed(2)}` : "";
          const perPax = opt.perPax ? parseInt(opt.perPax) : 0;
          const canAddMore = opt.canAddMore ? parseInt(opt.canAddMore) : 0;
          const div = document.createElement("div");
          
          if (canAddMore > 0) {
            // Multi-unit: show plus/minus input
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
            qtyInput.id = `extra_qty_${opt.ID}`;
            qtyInput.className = "extra-qty-input";
            const lbl = document.createElement("label");
            lbl.htmlFor = qtyInput.id;
            lbl.innerHTML = `${label}${price}${perPax > 0 ? ' p.p.' : ''})`;
            div.appendChild(minusBtn);
            div.appendChild(qtyInput);
            div.appendChild(plusBtn);
            div.appendChild(lbl);
            
            plusBtn.addEventListener('click', () => {
              qtyInput.value = parseInt(qtyInput.value) + 1;
              if (typeof updateAddButtonValue === 'function') updateAddButtonValue();
            });
            minusBtn.addEventListener('click', () => {
              qtyInput.value = Math.max(0, parseInt(qtyInput.value) - 1);
              if (typeof updateAddButtonValue === 'function') updateAddButtonValue();
            });
            qtyInput.addEventListener('input', () => {
              if (typeof updateAddButtonValue === 'function') updateAddButtonValue();
            });
          } else {
            // Single unit: checkbox
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = `extra_${opt.ID}`;
            checkbox.name = `extra_${opt.ID}`;
            const lbl = document.createElement("label");
            lbl.htmlFor = checkbox.id;
            lbl.innerHTML = `${label}${price}${perPax > 0 ? ' p.p.' : ''})`;
            div.appendChild(checkbox);
            div.appendChild(lbl);
            checkbox.addEventListener('change', () => {
              if (typeof updateAddButtonValue === 'function') updateAddButtonValue();
            });
          }
          extrasList.appendChild(div);
        });
      }

      // Load room types
      loadRoomTypesWithData(rooms, options, currency);
    })
    .catch(error => {
      console.error("Error loading room types:", error);
    });

  // Toggle save button
  if (typeof toggleSaveButton === 'function') {
    toggleSaveButton();
  }
}

// Load room types with data
function loadRoomTypesWithData(rooms, options, currency) {
  if (typeof clearRoomSelection === 'function') {
    clearRoomSelection();
  }

  const container = document.getElementById("product-options");
  if (!container) {
    console.error("No container with ID 'product-options' found");
    return;
  }
  container.innerHTML = "";

  rooms.forEach(room => {
    const card = document.createElement("div");
    card.classList.add("room-card");

    // Image
    const img = document.createElement("img");
    img.src = room.ImageURL || "/Pictures/placeholder_room.jpg";
    card.appendChild(img);

    // Name
    const name = document.createElement("div");
    name.classList.add("room-name");
    name.textContent = room.Productnaam || "Onbekende kamer";
    card.appendChild(name);

    // Price
    const priceDiv = document.createElement("div");
    priceDiv.classList.add("room-price");
    if (room.Gross != null && room.Gross !== "") {
        priceDiv.textContent = `${currency} ${parseFloat(room.Gross).toFixed(2)}`;
    } else {
        priceDiv.textContent = "Prijs onbekend";
    }
    card.appendChild(priceDiv);
    
    // Bed configuration dropdown (initially hidden)
    const bedConfigDiv = document.createElement("div");
    bedConfigDiv.classList.add("bed-config-selection");
    bedConfigDiv.style.display = "none";
    
    const bedLabel = document.createElement("label");
    bedLabel.textContent = "Bed Configuration:";
    bedLabel.style.fontSize = "0.9em";
    bedLabel.style.fontWeight = "bold";
    bedLabel.style.display = "block";
    bedLabel.style.marginTop = "10px";
    bedLabel.style.marginBottom = "5px";
    
    const bedSelect = document.createElement("select");
    bedSelect.id = "bed-configuration"; // Add ID for easier selection
    bedSelect.classList.add("bed-config-select");
    bedSelect.style.width = "100%";
    bedSelect.style.padding = "5px";
    bedSelect.style.fontSize = "0.9em";
    bedSelect.style.border = "1px solid #ddd";
    bedSelect.style.borderRadius = "4px";
    
    // Default option
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Loading bed options...";
    bedSelect.appendChild(defaultOption);
    
    bedConfigDiv.appendChild(bedLabel);
    bedConfigDiv.appendChild(bedSelect);
    card.appendChild(bedConfigDiv);
    
    card.addEventListener("click", () => {
      // Store current room selection
      // Check if this is a different room
      const isDifferentRoom = typeof currentSelection === 'undefined' || 
                             !currentSelection.room || 
                             currentSelection.room.ID !== room.ID;
      
      if (typeof currentSelection !== 'undefined') {
        console.log('🏠 Room selection triggered:');
        console.log('   Previous room ID:', currentSelection.room?.ID);
        console.log('   New room ID:', room.ID);
        console.log('   Is different room?', isDifferentRoom);
        
        currentSelection.room = room;
        currentSelection.roomType = room.Productnaam || "Onbekende kamer";
        
        if (isDifferentRoom) {
          console.log('Different room selected, resetting bed configuration');
          currentSelection.bedConfiguration = null; // Reset only for different rooms
        } else {
          console.log('🏠 Same room reselected, keeping bed configuration:', currentSelection.bedConfiguration);
        }
      }
      
      container.querySelectorAll(".room-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      
      // Load bed configurations for this room (only if different room)
        if (isDifferentRoom) {
            loadBedConfigurations(room.ID, bedSelect, bedConfigDiv);
        }      // Update picture sliders with room-specific images
      if (typeof currentSelection !== 'undefined' && currentSelection.hotel && room) {
        console.log('Room selected - Hotel code:', currentSelection.hotel.Code);
        console.log('Room object:', room);
        console.log('Room fields:', Object.keys(room));
        
        // Try different possible room code fields
        const roomCode = room.Code || room.ID || room.Kamer_code || room.Room_code || room.Productnaam;
        console.log('Using room code:', roomCode);
        
        updateHotelSliderWithRoom(currentSelection.hotel, roomCode);
        initializeRoomPictureSlider(currentSelection.hotel, roomCode);
      } else {
        console.log('Room selection issue - Hotel:', currentSelection?.hotel?.Code, 'Room object:', room);
      }

      // Show Add button and calculate price
      const addBtn = document.getElementById("add-selection-btn");
      if (addBtn) {
        addBtn.style.display = 'block';
        addBtn.classList.add('visible');
        addBtn.disabled = false;
        
        // Use the unified calculation function
        setTimeout(() => {
          if (typeof updateAddButtonValue === 'function') {
            updateAddButtonValue();
          }
        }, 10);
      }

      // Attach listeners for live updates
      const extrasList = document.getElementById("product-extras-list");
      if (extrasList) {
        const checkboxes = extrasList.querySelectorAll("input[type='checkbox']");
        checkboxes.forEach(cb => {
          cb.addEventListener('change', () => {
            if (typeof updateAddButtonValue === 'function') updateAddButtonValue();
          });
        });
        
        const qtyInputs = extrasList.querySelectorAll('input.extra-qty-input');
        qtyInputs.forEach(input => {
          input.addEventListener('input', () => {
            if (typeof updateAddButtonValue === 'function') updateAddButtonValue();
          });
        });
      }
    });
    container.appendChild(card);
  });

  // Auto-select if only 1 room
  if (rooms.length === 1) {
    const singleCard = container.querySelector(".room-card");
    if (singleCard) {
      singleCard.click();
      const addBtn = document.getElementById("add-selection-btn");
      if (addBtn) {
        addBtn.style.display = 'block';
        addBtn.classList.add('visible');
        addBtn.disabled = false;
      }
    }
  }
}

// Clear hotel results
function clearHotelResults() {
  const container = document.getElementById("hotel-results");
  if (container) {
    container.innerHTML = "";
  }
  if (typeof clearRoomSelection === 'function') {
    clearRoomSelection();
  }
}

// Unified calculation function
function calculateRoomAndExtras(hotel, roomType) {
  // Get options from window.lastRoomOptions if available
  let options = [];
  if (window.lastRoomOptions && Array.isArray(window.lastRoomOptions)) options = window.lastRoomOptions;
  
  // Get rooms from window.lastRooms if available
  let rooms = [];
  if (window.lastRooms && Array.isArray(window.lastRooms)) rooms = window.lastRooms;
  
  // Find room object
  let roomObj = null;
  if (rooms.length > 0) {
    roomObj = rooms.find(r => (r.Productnaam || 'Onbekende kamer') === roomType);
  } else if (hotel && hotel.rooms && hotel.rooms.length > 0) {
    roomObj = hotel.rooms.find(r => (r.Productnaam || 'Onbekende kamer') === roomType);
  }
  
  let price = 0;
  let roomCurrency = hotel?.Currency || 'EUR';
  if (roomObj && roomObj.Gross != null && roomObj.Gross !== '') {
    price = parseFloat(roomObj.Gross);
    roomCurrency = roomObj.Currency || hotel.Currency || 'EUR';
  }
  
  // Get pax
  let pax = 1;
  const paxInput = document.getElementById('pax');
  if (paxInput) pax = parseInt(paxInput.value) || 1;
  
  // Get nights
  let nights = 1;
  const nightsInput = document.getElementById('searchNights');
  if (nightsInput) nights = parseInt(nightsInput.value) || 1;
  
  // Calculate extras
  const extrasList = document.getElementById('product-extras-list');
  let extras = [];
  let extrasTotal = 0;
  
  if (extrasList) {
    // Checkboxes
    const checkboxes = extrasList.querySelectorAll("input[type='checkbox']");
    checkboxes.forEach(box => {
      if (box.checked) {
        const label = extrasList.querySelector(`label[for='${box.id}']`);
        if (label) {
          const name = label.textContent.split('(')[0].trim();
          let opt = options.find(o => (o.Extra && o.Extra.split('(')[0].trim() === name));
          let pricePerUnit = opt && opt.Gross ? parseFloat(opt.Gross) : 0;
          let perPaxValue = opt && (typeof opt.perPax !== 'undefined') ? parseInt(opt.perPax) : 0;
          let perNight = opt && (typeof opt.perNight !== 'undefined') ? parseInt(opt.perNight) : 0;
          let multiplier = 1;
          if (perPaxValue > 0) multiplier *= Math.ceil(pax / perPaxValue);
          if (perNight > 0) multiplier *= nights;
          let total = pricePerUnit * multiplier;
          extrasTotal += total;
          extras.push({ name, qty: 1, pricePerUnit, perPaxValue, perNight, total });
        }
      }
    });
    
    // Plus/minus inputs
    const qtyInputs = extrasList.querySelectorAll('input.extra-qty-input');
    qtyInputs.forEach(input => {
      const val = parseInt(input.value) || 0;
      if (val > 0) {
        const label = extrasList.querySelector(`label[for='${input.id}']`);
        if (label) {
          const name = label.textContent.split('(')[0].trim();
          let opt = options.find(o => (o.Extra && o.Extra.split('(')[0].trim() === name));
          let pricePerUnit = opt && opt.Gross ? parseFloat(opt.Gross) : 0;
          let perPaxValue = opt && (typeof opt.perPax !== 'undefined') ? parseInt(opt.perPax) : 0;
          let perNight = opt && (typeof opt.perNight !== 'undefined') ? parseInt(opt.perNight) : 0;
          
          // For quantity inputs with perPax=1, the quantity represents how many people want this extra
          // So we just use the quantity value directly (not multiply by total pax)
          let multiplier = val;
          if (perNight > 0) multiplier *= nights;
          let total = pricePerUnit * multiplier;
          extrasTotal += total;
          extras.push({ name, qty: val, pricePerUnit, perPaxValue, perNight, total });
        }
      }
    });
  }
  
  let mainTotal = price * nights;
  return {
    price,
    roomCurrency,
    pax,
    nights,
    extras,
    mainTotal,
    extrasTotal,
    grandTotal: mainTotal + extrasTotal
  };
}

// Update Add button value (live)
function updateAddButtonValue() {
  console.log('updateAddButtonValue called');
  console.log('Current Selection:', currentSelection);
  
  // Use stored selections instead of relying on DOM classes
  if (typeof currentSelection === 'undefined' || !currentSelection.hotel || !currentSelection.room) {
    console.log('No hotel or room selection stored:', currentSelection);
    return;
  }
  
  const hotel = currentSelection.hotel;
  const roomType = currentSelection.roomType;
  
  console.log('🏨 Hotel:', hotel?.Product);
  console.log('🏠 Room Type:', roomType);
  
  const calc = calculateRoomAndExtras(hotel, roomType);
  console.log('💰 Calculation result:', calc);
  
  const priceSpan = document.getElementById("add-total-price");
  const addBtn = document.getElementById("add-selection-btn");
  
  console.log('🔘 Add button element:', addBtn);
  
  if (addBtn) {
    addBtn.style.display = 'block';
    addBtn.classList.add('visible');
    addBtn.disabled = false;
    
    // Check if we're in edit mode and use appropriate text
    const isEditMode = typeof editingItem !== 'undefined' && editingItem !== null;
    const buttonText = isEditMode ? 'Update' : 'Add';
    
    const totalPrice = calc?.grandTotal || 0;
    const currency = calc?.roomCurrency || 'EUR';
    
    addBtn.innerHTML = `${buttonText}: ${currency} <span id="add-total-price">${totalPrice.toFixed(2)}</span>`;
    
    console.log(`Button updated: "${buttonText}: ${currency} ${totalPrice.toFixed(2)}"`);
    
    // Ensure proper styling for edit mode
    if (isEditMode) {
        addBtn.setAttribute('data-mode', 'update');
        addBtn.style.backgroundColor = '#ff8c00';
        addBtn.style.color = 'white';
    }
  }
  if (priceSpan) {
    priceSpan.textContent = `${(calc?.grandTotal || 0).toFixed(2)}`;
  }
}

// Generate ReisID
function generateReisID(uid, seq, suffix = "") {
  return `${uid}_${seq}${suffix}`;
}

// Create database items
function createDatabaseItems(hotel, roomType, calc, existingReisID = null) {
    // Compose item for DB
    let UID = window.currentUID || (window.location.search.match(/uid=([^&]+)/)?.[1] || '');
    if (!UID) {
      UID = 'UID';
      console.warn('No UID found in window.currentUID or URL, using fallback UID');
    }
    
    let ReisID;
    let Sequence;
    
    if (existingReisID) {
        // Use existing ReisID for updates
        ReisID = existingReisID;
        // Extract sequence from existing ReisID
        const parts = existingReisID.split('_');
        Sequence = parts[parts.length - 1];
    } else {
        // Create new ReisID for new items - find next available sequence
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
        Sequence = (maxSequence + 1).toString().padStart(3, '0');
        ReisID = UID + '_' + Sequence;
        
        console.log('Creating new item with sequence:', Sequence, 'existing sequences:', existingSequences);
    }
    
    const Datum_aanvang = document.getElementById('date')?.value || null;
    const Tijd_aanvang = document.getElementById('time')?.value || '';
    let Datum_einde = null;
    if (Datum_aanvang) {
      const startDate = new Date(Datum_aanvang);
      startDate.setDate(startDate.getDate() + calc.nights);
      Datum_einde = startDate.toISOString().slice(0, 10);
    }
    const Tijd_einde = '';
    const Locatie_stad = (hotel && typeof hotel.Locatie_stad !== 'undefined') ? hotel.Locatie_stad : '';
    let Locaties_adres = '';
    if (hotel) {
      if (typeof hotel.Locatie_straat !== 'undefined' && hotel.Locatie_straat) {
        Locaties_adres = hotel.Locatie_straat;
      } else if (typeof hotel.Adres !== 'undefined' && hotel.Adres) {
        Locaties_adres = hotel.Adres;
      } else if (typeof hotel.Adres1 !== 'undefined' && hotel.Adres1) {
        Locaties_adres = hotel.Adres1;
      }
    }
    const Inbounder = (hotel && hotel.Inbounder) ? hotel.Inbounder : '';
    const Inbounder_bookingref = '';
    const Supplier_naam = hotel?.Product || '';
    const Supplier_product = roomType || '';
    const Supplier_bookingref = '';
    const Service = '';
    const Product_type = 'accommodatie';
    const Product_code = hotel?.Code || '';
    const Nett = null;
    const Nett_valuta = '';
    const Gross = calc.mainTotal;
    const Gross_valuta = calc.roomCurrency;
    const Beschrijving_kort = hotel?.Beschrijving_kort || '';
    const Beschrijving_lang = hotel?.Beschrijving_lang || '';
    const Note_random = '';
    const Note_alert = '';

    // Main item
    const bedConfigurationId = (typeof currentSelection !== 'undefined' && currentSelection.bedConfiguration) ? 
                               parseInt(currentSelection.bedConfiguration.id) : null;
    
    console.log('💾 Creating database item with bed configuration ID:', bedConfigurationId);
    console.log('💾 Current selection bed config:', currentSelection?.bedConfiguration);
    
    const dbItem = {
      ReisID,
      UID,
      Sequence,
      Datum_aanvang,
      Tijd_aanvang,
      Datum_einde,
      Tijd_einde,
      Locatie_stad,
      Locaties_adres,
      Inbounder,
      Inbounder_bookingref,
      Supplier_naam,
      Supplier_product,
      Supplier_bookingref,
      Service,
      Product_type,
      Product_code,
      Nett,
      Nett_valuta,
      Gross,
      Gross_valuta,
      Beschrijving_kort,
      Beschrijving_lang,
      Note_random,
      Note_alert,
      Bed_configuratie_ID: bedConfigurationId
    };
    
    const dbItems = [dbItem];
    
    if (calc.extras.length > 0) {
      const suffixes = 'abcdefghijklmnopqrstuvwxyz'.split('');
      calc.extras.forEach((extra, idx) => {
        let total = extra.pricePerUnit * (extra.qty || 1);
        if (extra.perPaxValue > 0) total *= Math.ceil(calc.pax / extra.perPaxValue);
        if (extra.perNight > 0) total *= calc.nights;
        const extraDbItem = {
          ReisID: ReisID + suffixes[idx],
          UID,
          Sequence,
          Datum_aanvang,
          Tijd_aanvang,
          Datum_einde,
          Tijd_einde,
          Locatie_stad: '',
          Locaties_adres: '',
          Inbounder: '',
          Inbounder_bookingref: '',
          Supplier_naam: '',
          Supplier_product: extra.name,
          Supplier_bookingref: '',
          Service: '',
          Product_type: 'extra',
          Product_code: '',
          Nett: null,
          Nett_valuta: '',
          Gross: total,
          Gross_valuta: calc.roomCurrency,
          Beschrijving_kort: '',
          Beschrijving_lang: '',
          Note_random: '',
          Note_alert: ''
        };
        dbItems.push(extraDbItem);
      });
    }
    
    return dbItems;
}

// ========== PICTURE SLIDER INTEGRATION ==========

/**
 * Initialize hotel picture slider
 * @param {Object} hotel - Hotel object with Code for media lookup
 */
function initializeHotelPictureSlider(hotel) {
    // Clean up existing slider
    if (hotelPictureSlider) {
        hotelPictureSlider.destroy();
    }
    
    // Create new slider for main hotel images
    if (typeof createPictureSlider === 'function') {
        hotelPictureSlider = createPictureSlider('product-main-slider', {
            height: '400px',
            clickToModal: true,
            showCounter: true,
            showNavigation: true
        });
        
        // Load hotel media by code
        if (hotel && hotel.Code) {
            hotelPictureSlider.loadMedia(hotel.Code);
            console.log('Loading hotel media for code:', hotel.Code);
        } else {
            console.warn('No hotel code available for media loading');
        }
    } else {
        console.warn('createPictureSlider function not available');
    }
}

/**
 * Initialize room picture slider and update with room+hotel images
 * @param {Object} hotel - Hotel object
 * @param {string} roomCode - Room-specific code for additional images
 */
function initializeRoomPictureSlider(hotel, roomCode) {
    const roomSliderSection = document.getElementById('room-picture-slider');
    
    if (!roomCode || !hotel) {
        // Hide room slider if no room selected
        if (roomSliderSection) {
            roomSliderSection.style.display = 'none';
        }
        return;
    }
    
    // Show room slider section
    if (roomSliderSection) {
        roomSliderSection.style.display = 'block';
    }
    
    // Clean up existing room slider
    if (roomPictureSlider) {
        roomPictureSlider.destroy();
    }
    
    // Create new slider for room images
    if (typeof createPictureSlider === 'function') {
        roomPictureSlider = createPictureSlider('room-main-slider', {
            height: '300px',
            clickToModal: true,
            showCounter: true,
            showNavigation: true
        });
        
        // Load room media (hotel code + room code for combined images)
        console.log('Loading room media - Hotel code:', hotel.Code, 'Room code:', roomCode);
        roomPictureSlider.loadMedia(hotel.Code, roomCode);
    } else {
        console.warn('createPictureSlider function not available');
    }
}

/**
 * Update main hotel slider to include room images when room is selected
 * @param {Object} hotel - Hotel object
 * @param {string} roomCode - Room-specific code
 */
function updateHotelSliderWithRoom(hotel, roomCode) {
    if (hotelPictureSlider && hotel && hotel.Code) {
        // Update main slider to include both hotel and room images
        console.log('Updating main hotel slider with room images - Hotel:', hotel.Code, 'Room:', roomCode);
        hotelPictureSlider.loadMedia(hotel.Code, roomCode);
    }
}

/**
 * Reset picture sliders (called when clearing form or changing hotels)
 */
function resetPictureSliders() {
    if (hotelPictureSlider) {
        hotelPictureSlider.destroy();
        hotelPictureSlider = null;
    }
    
    if (roomPictureSlider) {
        roomPictureSlider.destroy();
        roomPictureSlider = null;
    }
    
    // Hide room slider section
    const roomSliderSection = document.getElementById('room-picture-slider');
    if (roomSliderSection) {
        roomSliderSection.style.display = 'none';
    }
    
    console.log('Picture sliders reset');
}

// Auto-select room and extras based on database data
function autoSelectRoomAndExtras(mainItem, extras) {
    console.log('Loading saved room and bed configuration...');
    
    // Auto-select the room
    const roomCards = document.querySelectorAll('.room-card');
    roomCards.forEach(card => {
        const roomName = card.querySelector('.room-name');
        if (roomName && roomName.textContent.trim() === mainItem.Supplier_product) {
            card.click(); // This will select the room and show extras
            
            // Wait for extras and bed configurations to load, then auto-select them
            setTimeout(() => {
                selectExtrasFromDatabase(extras);
                
                // Load and select bed configuration if available
                if (mainItem.Bed_configuratie_ID) {
                    selectBedConfigurationFromDatabase(mainItem.Bed_configuratie_ID);
                }
            }, 200);
        }
    });
}

// Select extras based on database data
function selectExtrasFromDatabase(extras) {
    const extrasList = document.getElementById('product-extras-list');
    if (!extrasList || !extras.length) return;
    
    extras.forEach(extra => {
        const extraName = extra.Supplier_product;
        
        // Find matching checkbox or quantity input
        const labels = extrasList.querySelectorAll('label');
        labels.forEach(label => {
            if (label.textContent.includes(extraName)) {
                // Check if it's a checkbox
                const checkbox = extrasList.querySelector(`#${label.getAttribute('for')}`);
                if (checkbox && checkbox.type === 'checkbox') {
                    checkbox.checked = true;
                }
                
                // Check if it's a quantity input
                const qtyInput = extrasList.querySelector(`#${label.getAttribute('for')}`);
                if (qtyInput && qtyInput.type === 'number') {
                    // Calculate quantity from database
                    qtyInput.value = 1; // Default to 1, might need more complex logic
                }
            }
        });
    });
    
    // Update the add button value after selecting extras
    setTimeout(() => {
        if (typeof updateAddButtonValue === 'function') {
            updateAddButtonValue();
        }
    }, 100);
}

// Select bed configuration based on database ID
function selectBedConfigurationFromDatabase(bedConfigId) {
    console.log('Selecting bed configuration ID:', bedConfigId);
    
    // Function to attempt selection
    const attemptSelection = () => {
        const bedConfigSelect = document.getElementById('bed-configuration');
        if (!bedConfigSelect) {
            return false;
        }
        
        // Check if options are loaded (more than just the default "Loading..." option)
        const options = bedConfigSelect.options;
        if (options.length <= 1 || options[0].textContent.includes('Loading')) {
            return false;
        }
        
        // Find the option with matching value
        let foundMatch = false;
        for (let i = 0; i < options.length; i++) {
            if (options[i].value == bedConfigId) {
                console.log('Selected bed configuration:', options[i].text);
                bedConfigSelect.selectedIndex = i;
                foundMatch = true;
                
                // Trigger change event to update the selection
                const changeEvent = new Event('change', { bubbles: true });
                bedConfigSelect.dispatchEvent(changeEvent);
                
                // Update currentSelection object
                if (window.currentSelection) {
                    window.currentSelection.bedConfiguration = {
                        id: bedConfigId,
                        name: options[i].text
                    };
                }
                
                break;
            }
        }
        
        if (!foundMatch) {
            console.log('No matching bed configuration found for ID:', bedConfigId);
        }
        
        return true; // Selection attempted successfully
    };
    
    // Try selection immediately
    if (attemptSelection()) {
        return;
    }
    
    // If not successful, retry with intervals
    let retryCount = 0;
    const maxRetries = 10;
    const retryInterval = 300; // 300ms intervals
    
    const retryTimer = setInterval(() => {
        retryCount++;
        
        if (attemptSelection() || retryCount >= maxRetries) {
            clearInterval(retryTimer);
            if (retryCount >= maxRetries) {
                console.log('Failed to select bed configuration after retries');
            }
        }
    }, retryInterval);
}

// Load bed configurations for a room
async function loadBedConfigurations(roomId, selectElement, containerDiv) {
    console.log('Loading bed configurations for room:', roomId);
    
    try {
        const response = await fetch(`../PHP/bed_config_api.php?action=room_options&room_id=${roomId}`);
        const data = await response.json();
        
        if (data.success && data.options.length > 0) {
            
            // Clear existing options
            selectElement.innerHTML = '';
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select bed configuration...';
            selectElement.appendChild(defaultOption);
            
            // Add bed configuration options
            data.options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.ID;
                optionElement.textContent = `${option.Configuratie_naam} - ${option.Totaal_personen} people`;
                optionElement.dataset.capacity = option.Totaal_personen;
                optionElement.dataset.summary = option.bed_summary;
                optionElement.dataset.notes = option.notes || '';
                selectElement.appendChild(optionElement);
            });
            
            // Show the bed configuration dropdown
            containerDiv.style.display = 'block';
            containerDiv.style.padding = '10px';
            containerDiv.style.margin = '10px 0';
            
            // Handle bed configuration selection
            selectElement.addEventListener('change', function() {
                const selectedOption = this.options[this.selectedIndex];
                
                if (selectedOption.value && typeof currentSelection !== 'undefined') {
                    const bedConfig = {
                        id: selectedOption.value,
                        name: selectedOption.textContent,
                        capacity: selectedOption.dataset.capacity,
                        summary: selectedOption.dataset.summary,
                        notes: selectedOption.dataset.notes
                    };
                    
                    currentSelection.bedConfiguration = bedConfig;
                    
                    // Update add button if it exists
                    if (typeof updateAddButtonValue === 'function') {
                        updateAddButtonValue();
                    }
                } else if (typeof currentSelection !== 'undefined') {
                    currentSelection.bedConfiguration = null;
                } else {
                    console.error('currentSelection is undefined!');
                }
            });
            
        } else {
            // No bed configurations available
            selectElement.innerHTML = '<option value="">No bed configurations available</option>';
            containerDiv.style.display = 'block';
        }
        
    } catch (error) {
        console.error('❌ Error loading bed configurations:', error);
        selectElement.innerHTML = '<option value="">Error loading bed options</option>';
        containerDiv.style.display = 'block';
    }
}

console.log("Hotel Manager - Module loaded");
