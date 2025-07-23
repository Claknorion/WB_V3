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

function handleTypeChange() {
    const selected = document.getElementById("mainType").value;

    // Hide all dynamic field blocks first
    document.getElementById("accommodatieFields").style.display = "none";
    document.getElementById("vluchtFields").style.display = "none";

    // Show the correct one
    if (selected === "accommodatie") {
        document.getElementById("accommodatieFields").style.display = "block";
    } else if (selected === "vlucht") {
        document.getElementById("vluchtFields").style.display = "block";
    }
}

let allHotels = []; // This should be filled by your fetch from PHP endpoint

function fetchHotelsData() {
  fetch('../PHP/search_accommodatie.php?stad=')
    .then(response => response.json())
    .then(data => {
      console.log("Fetched hotel data:", data); // <- Add this
      allHotels = data;
      searchHotels();  // optional: display all hotels initially
    })
    .catch(error => {
      console.error('Error fetching hotels:', error);
    });
}


function searchHotels() {
    const city = document.getElementById("searchCity").value.toLowerCase();
    const nights = parseInt(document.getElementById("searchNights").value) || 1; // default to 1 night if empty
    const nameFilter = document.getElementById("searchName").value.toLowerCase();

    // Filter hotels from allHotels array
    const filtered = allHotels.filter(hotel => {
        const matchCity = hotel.Locatie_stad.toLowerCase().includes(city);
        const matchName = hotel.Product.toLowerCase().includes(nameFilter);
        return matchCity && matchName;
    });

    displayHotelResults(filtered, nights);
}

function filterHotelResults() {
    // Trigger a re-search using current input
    searchHotels();
}

function displayHotelResults(hotels, nights) {
    const container = document.getElementById("hotel-results");
    container.innerHTML = "";

    hotels.forEach(hotel => {
        // console.log('hotel.Gross:', hotel.Gross, typeof hotel.Gross);

        const card = document.createElement("div");
        card.className = "hotel-card";

        card.innerHTML = `
            <img src="${hotel.Foto}" alt="${hotel.Product}" />
            <div class="hotel-info">
                <h4>${hotel.Product}</h4>
                <p>${hotel.Beschrijving_kort}</p>
                <p class="hotel-price">${(!isNaN(Number(hotel.Gross)) && Number(hotel.Gross) > 0) ? 'Vanaf ' : ''}${formatHotelPrice(hotel)}</p>
            </div>
            <button class="select-hotel-btn" onclick="selectHotel('${hotel.Code}', ${nights})">Selecteer</button>
        `;

        container.appendChild(card);
    });
}

function formatHotelPrice(hotel) {
    const price = Number(hotel.Gross); // force cast to number
    const currency = hotel.Currency;

    if (!isNaN(price) && price > 0) {
        /* return `${currency} ${price.toFixed(2)}`; */
        return `${currency} ${price.toFixed(2).replace('.', ',')}`;
    } else {
        return 'geen prijs bekend';
    }
}


function selectHotel(code, nights) {
    alert(`Hotel geselecteerd: ${code}, nachten: ${nights}`);
    // Later fill in right side panel details here based on code
}

// Buttons for edit/create mode

function enableEditMode() {
    const actionDiv = document.getElementById("actionButtons");

    // Clear if already added
    if (!document.getElementById("deleteItemBtn")) {
        const deleteBtn = document.createElement("button");
        deleteBtn.id = "deleteItemBtn";
        deleteBtn.className = "delete-btn";
        deleteBtn.textContent = "Delete";

        actionDiv.appendChild(deleteBtn);
    }

    // Optionally set different behavior on click:
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

// Add event listeners after DOM loaded
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById('searchCity').addEventListener('input', searchHotels);
  document.getElementById('searchNights').addEventListener('input', searchHotels);
  document.getElementById('searchName').addEventListener('input', filterHotelResults);

  fetchHotelsData(); // Load hotels at start
});


{/* <p class="hotel-price">Vanaf €${(parseFloat(hotel.Prijs_vanaf) * nights).toFixed(2)}</p> */}