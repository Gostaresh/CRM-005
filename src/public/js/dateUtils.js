/**
 * Client-side date utilities for handling Jalali dates
 */

// Import moment, moment-jalaali, and moment-timezone
// Ensure these libraries are included in your HTML via CDN

// Convert UTC date to Jalali in local timezone (Iran)
function convertUTCToJalali(utcDate) {
    if (!utcDate) return '';
    return moment(utcDate).tz('Asia/Tehran').locale('fa').format('jYYYY/jMM/jDD HH:mm:ss');
}

// Convert Jalali date to UTC for server requests
function convertJalaliToUTC(jalaliDate) {
    if (!jalaliDate) return '';
    return moment(jalaliDate, 'jYYYY/jMM/jDD HH:mm:ss').utc().format();
}

// Initialize MD.BootstrapPersianDateTimePicker for input fields
function initializePersianDateTimePicker(selector) {
    new mds.MdsPersianDateTimePicker(document.querySelector(selector), {
        targetTextSelector: selector,
        enableTimePicker: true,
        textFormat: 'jYYYY/jMM/jDD HH:mm:ss',
        isGregorian: false,
        placement: 'auto',
    });
}

// Export functions
window.dateUtils = {
    convertUTCToJalali,
    convertJalaliToUTC,
    initializePersianDateTimePicker
};