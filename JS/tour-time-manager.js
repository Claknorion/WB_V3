// tour-time-manager.js - Handles tour time selection logic

// Sample data structure for tour timeslots
const sampleTourTimeslots = {
  "TOUR001": [
    {
      id: 1,
      slotName: "Morning Tour",
      startTime: "09:00",
      endTime: "12:00", 
      isFlexibleStart: false,
      isFlexibleEnd: false,
      priceModifier: 0,
      duration: "3 hours"
    },
    {
      id: 2,
      slotName: "Afternoon Tour", 
      startTime: "14:00",
      endTime: "17:00",
      isFlexibleStart: false,
      isFlexibleEnd: false,
      priceModifier: 0,
      duration: "3 hours"
    }
  ],
  "TOUR002": [
    {
      id: 3,
      slotName: "Flexible Full Day",
      startTime: "08:00",
      endTime: "18:00",
      isFlexibleStart: true,
      isFlexibleEnd: true,
      minDurationHours: 4,
      maxDurationHours: 10,
      priceModifier: 25,
      duration: "4-10 hours (customizable)"
    }
  ],
  "TOUR003": [
    {
      id: 4,
      slotName: "Multi-Day Adventure",
      startTime: "09:00",
      endTime: "17:00", 
      isFlexibleStart: false,
      isFlexibleEnd: false,
      priceModifier: 0,
      duration: "3 days",
      isMultiDay: true,
      days: 3
    }
  ]
};

// Global variables
let currentTourCode = null; // Track current tour code for restoration
let currentTimeSelection = {
  tourCode: null,
  timeslotId: null,
  customStartTime: null,
  customEndTime: null,
  calculatedPrice: 0
};

function initializeTourTimeSelection(tourCode) {
  console.log('Initializing tour time selection for:', tourCode);
  
  // Store current tour code for restoration
  currentTourCode = tourCode;
  
  // Get the existing time selection container from HTML
  let timeContainer = document.getElementById('tour-time-selection');
  if (!timeContainer) {
    console.error('Tour time selection container not found in HTML');
    return;
  }
  
  // Fetch timeslots from server
  fetchTourTimeslots(tourCode)
    .then(timeslots => {
      // Store timeslots globally for restoration purposes
      if (!window.tourTimeslots) {
        window.tourTimeslots = {};
      }
      window.tourTimeslots[tourCode] = timeslots;
      
      if (timeslots.length === 0) {
        // No time options - create a default one and show it
        console.log('No timeslots found, creating default timeslot');
        const defaultTimeslot = [{
          id: 'default',
          slotName: 'Standard Tour',
          startTime: '09:00',
          endTime: '17:00',
          isFlexibleStart: false,
          isFlexibleEnd: false,
          priceModifier: 0.00,
          duration: 'Full day experience',
          isMultiDay: false,
          durationDays: 1
        }];
        
        // Also store the default timeslot globally
        window.tourTimeslots[tourCode] = defaultTimeslot;
        
        timeContainer.style.display = 'block';
        populateTimeSlots(defaultTimeslot, tourCode);
      } else {
        // Show container and populate with actual timeslots
        console.log('Found timeslots:', timeslots.length);
        timeContainer.style.display = 'block';
        populateTimeSlots(timeslots, tourCode);
      }
    })
    .catch(error => {
      console.error('Error loading tour timeslots:', error);
      // On error, still show default option for uniformity
      const defaultTimeslot = [{
        id: 'default',
        slotName: 'Standard Tour',
        startTime: '09:00',
        endTime: '17:00',
        isFlexibleStart: false,
        isFlexibleEnd: false,
        priceModifier: 0.00,
        duration: 'Full day experience',
        isMultiDay: false,
        durationDays: 1
      }];
      timeContainer.style.display = 'block';
      populateTimeSlots(defaultTimeslot, tourCode);
    });
}

async function fetchTourTimeslots(tourCode) {
  try {
    console.log('Fetching timeslots for tour:', tourCode);
    const url = `../PHP/tour/get_tour_timeslots.php?tour_id=${encodeURIComponent(tourCode)}`;
    console.log('API URL:', url);
    
    const response = await fetch(url);
    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('API Response:', data);
    
    if (data.success) {
      console.log('Timeslots found:', data.timeslots.length);
      return data.timeslots || [];
    } else {
      console.error('Failed to fetch timeslots:', data.error);
      return [];
    }
  } catch (error) {
    console.error('Network error fetching timeslots:', error);
    return [];
  }
}

function createTimeSelectionContainer() {
  // This function is no longer used - we use the HTML container instead
  console.warn('createTimeSelectionContainer called but HTML container should be used');
  return document.getElementById('tour-time-selection');
}

function populateTimeSlots(timeslots, tourCode) {
  const container = document.getElementById('tour-timeslots-list');
  if (!container) {
    console.error('Tour timeslots list container not found');
    return;
  }
  
  container.innerHTML = '';
  currentTimeSelection.tourCode = tourCode;
  
  // Clear current selection
  currentTimeSelection.timeslotId = null;
  currentTimeSelection.customStartTime = null;
  currentTimeSelection.customEndTime = null;
  
  // Hide add button initially when no timeslot is selected
  const addButton = document.getElementById('add-selection-btn');
  if (addButton && timeslots.length > 1) {
    addButton.style.display = 'none';
  }
  
  timeslots.forEach(slot => {
    const slotCard = createTimeSlotCard(slot);
    container.appendChild(slotCard);
    
    // Add flexible time inputs if needed
    if (slot.isFlexibleStart || slot.isFlexibleEnd) {
      const flexibleInputs = createFlexibleTimeInputs(slot);
      container.appendChild(flexibleInputs);
    }
  });
  
  // Auto-select if there's only one timeslot
  if (timeslots.length === 1) {
    const singleCard = container.querySelector('.time-slot-card');
    if (singleCard) {
      selectTimeSlot(timeslots[0], singleCard);
    }
  }
}

function createTimeSlotCard(slot) {
  const card = document.createElement('div');
  card.className = 'time-slot-card';
  card.dataset.slotId = slot.id;
  
  // Only show price modifier if it's not zero, otherwise don't show price at all
  const priceText = slot.priceModifier > 0 ? `+€${slot.priceModifier} p.p.` : 
                   slot.priceModifier < 0 ? `-€${Math.abs(slot.priceModifier)} p.p.` : '';
  const priceClass = slot.priceModifier !== 0 ? 'modifier' : 'hidden';
  
  card.innerHTML = `
    <div class="time-slot-info">
      <div class="time-slot-name">${slot.slotName}</div>
      <div class="time-slot-duration">${slot.duration}</div>
    </div>
    <div class="time-slot-times">
      <span class="time-display">${slot.startTime}</span>
      <span class="time-separator">-</span>
      <span class="time-display">${slot.endTime}</span>
    </div>
    ${priceText ? `<div class="time-slot-price ${priceClass}">${priceText}</div>` : ''}
  `;
  
  card.addEventListener('click', () => selectTimeSlot(slot, card));
  
  return card;
}

function createFlexibleTimeInputs(slot) {
  const container = document.createElement('div');
  container.className = 'flexible-time-inputs';
  container.id = `flexible-inputs-${slot.id}`;
  
  const startTimeInput = slot.isFlexibleStart ? 
    `<div class="flexible-time-row">
       <label for="custom-start-${slot.id}">Start:</label>
       <input type="time" id="custom-start-${slot.id}" value="${slot.startTime}">
       <span class="duration-display" id="duration-${slot.id}"></span>
     </div>` : '';
  
  const endTimeInput = slot.isFlexibleEnd ?
    `<div class="flexible-time-row">
       <label for="custom-end-${slot.id}">End:</label>
       <input type="time" id="custom-end-${slot.id}" value="${slot.endTime}">
     </div>` : '';
  
  container.innerHTML = `
    ${startTimeInput}
    ${endTimeInput}
    <div class="flexible-time-row">
      <small><strong>Note:</strong> Duration must be between ${slot.minDurationHours || 1}-${slot.maxDurationHours || 8} hours</small>
    </div>
  `;
  
  // Add event listeners for time validation
  if (slot.isFlexibleStart) {
    const startInput = container.querySelector(`#custom-start-${slot.id}`);
    startInput.addEventListener('change', () => validateFlexibleTimes(slot, container));
  }
  
  if (slot.isFlexibleEnd) {
    const endInput = container.querySelector(`#custom-end-${slot.id}`);
    endInput.addEventListener('change', () => validateFlexibleTimes(slot, container));
  }
  
  return container;
}

function selectTimeSlot(slot, cardElement) {
  // Remove previous selections
  document.querySelectorAll('.time-slot-card.selected').forEach(card => {
    card.classList.remove('selected');
  });
  
  // Hide all flexible inputs
  document.querySelectorAll('.flexible-time-inputs').forEach(input => {
    input.classList.remove('active');
  });
  
  // Select current card
  cardElement.classList.add('selected');
  currentTimeSelection.timeslotId = slot.id;
  
  // Show flexible inputs if applicable
  if (slot.isFlexibleStart || slot.isFlexibleEnd) {
    const flexibleInputs = document.getElementById(`flexible-inputs-${slot.id}`);
    if (flexibleInputs) {
      flexibleInputs.classList.add('active');
      validateFlexibleTimes(slot, flexibleInputs);
    }
  } else {
    // Fixed times
    currentTimeSelection.customStartTime = slot.startTime;
    currentTimeSelection.customEndTime = slot.endTime;
  }
  
  // Update pricing and show add button
  updateTourPricing();
  updateTourAddButtonVisibility();
  
  console.log('Selected time slot:', slot, currentTimeSelection);
}

function updateTourAddButtonVisibility() {
  // Show/hide add button based on time selection (similar to room cards)
  if (typeof updateTourAddButtonValue === 'function') {
    updateTourAddButtonValue();
  }
}

function validateFlexibleTimes(slot, container) {
  const startInput = container.querySelector(`#custom-start-${slot.id}`);
  const endInput = container.querySelector(`#custom-end-${slot.id}`);
  const durationDisplay = container.querySelector(`#duration-${slot.id}`);
  
  const startTime = startInput ? startInput.value : slot.startTime;
  const endTime = endInput ? endInput.value : slot.endTime;
  
  if (startTime && endTime) {
    const duration = calculateDuration(startTime, endTime);
    const hours = Math.round(duration * 10) / 10; // Round to 1 decimal
    
    // Validate duration constraints
    const minHours = slot.minDurationHours || 1;
    const maxHours = slot.maxDurationHours || 8;
    
    if (hours < minHours || hours > maxHours) {
      if (durationDisplay) {
        durationDisplay.textContent = `⚠️ Duration: ${hours}h (must be ${minHours}-${maxHours}h)`;
        durationDisplay.style.color = '#dc3545';
      }
      return false;
    } else {
      if (durationDisplay) {
        durationDisplay.textContent = `✓ Duration: ${hours} hours`;
        durationDisplay.style.color = '#28a745';
      }
      
      // Update current selection
      currentTimeSelection.customStartTime = startTime;
      currentTimeSelection.customEndTime = endTime;
      updateTourPricing();
      return true;
    }
  }
  
  return false;
}

function calculateDuration(startTime, endTime) {
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(`2000-01-01T${endTime}:00`);
  
  // Handle overnight tours
  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }
  
  return (end - start) / (1000 * 60 * 60); // Hours
}

function updateTourPricing() {
  // This would integrate with the existing tour pricing system
  console.log('Updating tour pricing with time selection:', currentTimeSelection);
  
  // Example: Call existing pricing function with time modifiers
  if (typeof updateTourAddButtonValue === 'function') {
    updateTourAddButtonValue();
  }
}

function getCurrentTimeSelection() {
  return currentTimeSelection;
}

function clearTimeSelection() {
  currentTimeSelection = {
    tourCode: null,
    timeslotId: null,
    customStartTime: null,
    customEndTime: null,
    calculatedPrice: 0
  };
  
  const container = document.getElementById('tour-time-selection');
  if (container) {
    container.style.display = 'none';
  }
}

// Restore a specific timeslot selection based on stored data
function restoreTimeSlotSelection(criteria) {
  console.log('Attempting to restore timeslot selection with criteria:', criteria);
  
  if (!criteria) {
    console.log('No criteria provided for timeslot restoration');
    return false;
  }
  
  // Get all currently loaded timeslot cards
  const timeslotCards = document.querySelectorAll('.time-slot-card');
  if (timeslotCards.length === 0) {
    console.log('No timeslot cards found for restoration');
    return false;
  }
  
  let matchingCard = null;
  let matchingSlot = null;
  
  // Strategy 1: Match by slot name (from Service field)
  if (criteria.slotName) {
    for (const card of timeslotCards) {
      const nameElement = card.querySelector('.time-slot-name');
      if (nameElement && nameElement.textContent.trim() === criteria.slotName) {
        matchingCard = card;
        console.log('Found matching slot by name:', criteria.slotName);
        break;
      }
    }
  }
  
  // Strategy 2: Match by start and end times if name matching failed
  if (!matchingCard && criteria.startTime && criteria.endTime) {
    for (const card of timeslotCards) {
      const timeElements = card.querySelectorAll('.time-display');
      if (timeElements.length >= 2) {
        const cardStart = timeElements[0].textContent.trim();
        const cardEnd = timeElements[1].textContent.trim();
        
        // Normalize time formats for comparison (remove seconds if present)
        const normalizeTime = (time) => {
          // Convert "HH:MM:SS" to "HH:MM" and handle "HH:MM" as-is
          return time.split(':').slice(0, 2).join(':');
        };
        
        const normalizedCardStart = normalizeTime(cardStart);
        const normalizedCardEnd = normalizeTime(cardEnd);
        const normalizedCriteriaStart = normalizeTime(criteria.startTime);
        const normalizedCriteriaEnd = normalizeTime(criteria.endTime);
        
        console.log('Comparing times:', { 
          card: `${normalizedCardStart}-${normalizedCardEnd}`, 
          criteria: `${normalizedCriteriaStart}-${normalizedCriteriaEnd}` 
        });
        
        if (normalizedCardStart === normalizedCriteriaStart && normalizedCardEnd === normalizedCriteriaEnd) {
          matchingCard = card;
          console.log('Found matching slot by times:', criteria.startTime, '-', criteria.endTime);
          break;
        }
      }
    }
  }
  
  // Strategy 3: Match by start time only as fallback
  if (!matchingCard && criteria.startTime) {
    for (const card of timeslotCards) {
      const timeElements = card.querySelectorAll('.time-display');
      if (timeElements.length >= 1) {
        const cardStart = timeElements[0].textContent.trim();
        
        // Normalize time format
        const normalizeTime = (time) => time.split(':').slice(0, 2).join(':');
        const normalizedCardStart = normalizeTime(cardStart);
        const normalizedCriteriaStart = normalizeTime(criteria.startTime);
        
        if (normalizedCardStart === normalizedCriteriaStart) {
          matchingCard = card;
          console.log('Found matching slot by start time only:', criteria.startTime);
          break;
        }
      }
    }
  }
  
  if (matchingCard) {
    // Get the slot data from the card's data attribute
    const slotId = matchingCard.getAttribute('data-slot-id');
    
    // Find the corresponding slot object from the stored timeslots
    if (currentTourCode && window.tourTimeslots && window.tourTimeslots[currentTourCode]) {
      matchingSlot = window.tourTimeslots[currentTourCode].find(slot => slot.id.toString() === slotId);
    }
    
    if (matchingSlot) {
      console.log('Restoring selection for slot:', matchingSlot);
      selectTimeSlot(matchingSlot, matchingCard);
      return true;
    } else {
      console.warn('Could not find slot data for restoration');
      // Still select the card visually even if we don't have full slot data
      matchingCard.click();
      return true;
    }
  }
  
  console.log('No matching timeslot found for restoration criteria');
  return false;
}

// Export functions for integration
window.tourTimeManager = {
  initialize: initializeTourTimeSelection,
  getCurrentSelection: getCurrentTimeSelection,
  clear: clearTimeSelection,
  restoreSelection: restoreTimeSlotSelection
};
