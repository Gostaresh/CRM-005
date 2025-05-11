/**
 * Client-side date utilities for handling Jalali dates
 */

// Format a UTC date to Jalali format
function formatToJalali(utcDate, format = 'YYYY/MM/DD HH:mm:ss') {
    if (!utcDate) return '';
    const date = new Date(utcDate);
    return date.toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

// Initialize date pickers
function initializeDatePickers() {
    const dateInputs = document.querySelectorAll('input[type="datetime-local"]');
    dateInputs.forEach(input => {
        // Convert the input to a text input with Jalali date picker
        input.type = 'text';
        input.classList.add('jalali-datepicker');
        
        // Add event listener for date changes
        input.addEventListener('change', function(e) {
            const jalaliDate = e.target.value;
            // Store the UTC date in a hidden input
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = e.target.name;
            hiddenInput.value = jalaliDate;
            e.target.parentNode.appendChild(hiddenInput);
        });
    });
}

// Format all date fields on page load
function formatDateFields() {
    const dateFields = document.querySelectorAll('.date-field');
    dateFields.forEach(field => {
        const utcDate = field.dataset.utcDate;
        if (utcDate) {
            field.textContent = formatToJalali(utcDate);
        }
    });
}

// Export functions
window.dateUtils = {
    formatToJalali,
    initializeDatePickers,
    formatDateFields
}; 