/**
 * Management Pages Shared JavaScript
 * Used by: hotel_management.php, tour_management.php, tour_operator_management.php, inbounder_management.php
 */

// Generic search/filter function for management tables
function filterTable(searchInputId, tableId, searchColumns = null) {
    const input = document.getElementById(searchInputId);
    const filter = input.value.toLowerCase();
    const table = document.getElementById(tableId);
    const rows = table.getElementsByTagName('tr');

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.getElementsByTagName('td');
        let found = false;

        // If specific columns are specified, search only those columns
        if (searchColumns && Array.isArray(searchColumns)) {
            for (let j of searchColumns) {
                if (cells[j] && cells[j].textContent.toLowerCase().includes(filter)) {
                    found = true;
                    break;
                }
            }
        } else {
            // Search all columns except the last one (usually actions)
            for (let j = 0; j < cells.length - 1; j++) {
                if (cells[j] && cells[j].textContent.toLowerCase().includes(filter)) {
                    found = true;
                    break;
                }
            }
        }

        row.style.display = found ? '' : 'none';
    }
}

// Specific filter functions for each management page
function filterHotels() {
    filterTable('hotelSearch', 'hotelsTable', [0, 1, 2]); // Code, Name, City
}

function filterTours() {
    filterTable('tourSearch', 'toursTable');
}

function filterOperators() {
    filterTable('operatorSearch', 'operatorsTable');
}

function filterInbounders() {
    filterTable('inbounderSearch', 'inboundersTable');
}

function filterRooms() {
    filterTable('roomSearch', 'roomsTable');
}

// Form validation helper
function validateRequiredFields(formId) {
    const form = document.getElementById(formId);
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.style.borderColor = '#dc3545';
            isValid = false;
        } else {
            field.style.borderColor = '#ccc';
        }
    });
    
    return isValid;
}

// Confirmation dialog for delete actions
function confirmDelete(itemName, itemType = 'item') {
    return confirm(`Are you sure you want to delete this ${itemType}: ${itemName}?\n\nThis action cannot be undone.`);
}

// Auto-hide success messages after 5 seconds
document.addEventListener('DOMContentLoaded', function() {
    const successMessages = document.querySelectorAll('.message.success');
    successMessages.forEach(message => {
        setTimeout(() => {
            message.style.transition = 'opacity 0.5s';
            message.style.opacity = '0';
            setTimeout(() => {
                message.remove();
            }, 500);
        }, 5000);
    });
});

// Generic form submission with loading state
function submitFormWithLoading(formId, buttonId) {
    const form = document.getElementById(formId);
    const button = document.getElementById(buttonId);
    
    if (form && button) {
        form.addEventListener('submit', function() {
            button.disabled = true;
            button.textContent = 'Processing...';
            button.style.opacity = '0.6';
        });
    }
}
