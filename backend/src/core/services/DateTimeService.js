/**
 * DateTimeService
 * Handles date and time conversions between UTC and Jalali (Persian) calendar
 * Uses moment-jalaali for reliable Jalali date handling
 */

const moment = require("moment-jalaali");

function convertPersianDigitsToEnglish(str) {
  if (!str) return str;
  const persian = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  const english = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  for (let i = 0; i < persian.length; i++) {
    str = str.replace(new RegExp(persian[i], "g"), english[i]);
  }
  return str;
}

class DateTimeService {
  /**
   * Convert UTC date to Jalali date string
   * @param {Date|string} utcDate - UTC date to convert
   * @param {string} format - Output format (default: 'YYYY/MM/DD HH:mm:ss')
   * @returns {string} Jalali date string
   */
  // Commenting on date conversion methods
  static toJalali(utcDate, format = "jYYYY/jMM/jDD HH:mm:ss") {
    // Converts a UTC date to a Jalali date string for display purposes.
    try {
      const m = moment(utcDate).utc();
      return m.format(format);
    } catch (error) {
      console.error("Error converting to Jalali:", error);
      return null;
    }
  }

  /**
   * Convert Jalali date string to UTC date
   * @param {string} jalaliDate - Jalali date string
   * @param {string} format - Input format (default: 'YYYY/MM/DD HH:mm:ss')
   * @returns {Date} UTC date
   */
  // Commenting on date conversion methods
  static toUTC(jalaliDate, format = "YYYY/MM/DD HH:mm:ss") {
    // Converts a Jalali date string to a UTC date for backend processing.
    try {
      if (!jalaliDate) {
        console.error("Empty date in toUTC");
        return null;
      }
      // Convert Persian numerals to Latin
      const normalizedDate = convertPersianDigitsToEnglish(jalaliDate);
      console.info(`toUTC: Input=${jalaliDate}, Normalized=${normalizedDate}`);
      if (!normalizedDate) {
        console.error("Failed to normalize date in toUTC");
        return null;
      }
      const m = moment(normalizedDate, format);
      if (!m.isValid()) {
        console.error(
          `Invalid date in toUTC: ${normalizedDate}, format: ${format}`
        );
        return null;
      }
      const utcDate = m.toDate();
      console.info(`toUTC: Output=${utcDate.toISOString()}`);
      return utcDate;
    } catch (error) {
      console.error(`Error converting to UTC: ${error.message}`);
      return null;
    }
  }

  /**
   * Get current date/time in Jalali format
   * @param {string} format - Output format (default: 'YYYY/MM/DD HH:mm:ss')
   * @returns {string} Current Jalali date string
   */
  static now(format = "YYYY/MM/DD HH:mm:ss") {
    return this.toJalali(new Date(), format);
  }

  /**
   * Format a date in Jalali with custom format
   * @param {Date|string} date - Date to format
   * @param {string} format - Output format
   * @returns {string} Formatted Jalali date string
   */
  static format(date, format) {
    try {
      const m = moment(date);
      return m.format(format);
    } catch (error) {
      console.error("Error formatting date:", error);
      return null;
    }
  }

  /**
   * Get date components (year, month, day, etc.) in Jalali
   * @param {Date|string} date - Date to get components from
   * @returns {Object} Date components
   */
  static getJalaliComponents(date) {
    try {
      const m = moment(date);
      return {
        year: m.jYear(),
        month: m.jMonth() + 1, // 1-based month
        day: m.jDate(),
        hour: m.hour(),
        minute: m.minute(),
        second: m.second(),
        millisecond: m.millisecond(),
        dayOfWeek: m.day(), // 0 = Sunday, 6 = Saturday
        isLeapYear: m.jIsLeapYear(),
      };
    } catch (error) {
      console.error("Error getting Jalali components:", error);
      return null;
    }
  }

  /**
   * Add time to a date
   * @param {Date|string} date - Base date
   * @param {number} amount - Amount to add
   * @param {string} unit - Unit of time (years, months, days, hours, minutes, seconds)
   * @param {string} format - Output format (default: 'YYYY/MM/DD HH:mm:ss')
   * @returns {string} New Jalali date string
   */
  static add(date, amount, unit, format = "YYYY/MM/DD HH:mm:ss") {
    try {
      const m = moment(date).add(amount, unit);
      return m.format(format);
    } catch (error) {
      console.error("Error adding time:", error);
      return null;
    }
  }

  /**
   * Subtract time from a date
   * @param {Date|string} date - Base date
   * @param {number} amount - Amount to subtract
   * @param {string} unit - Unit of time (years, months, days, hours, minutes, seconds)
   * @param {string} format - Output format (default: 'YYYY/MM/DD HH:mm:ss')
   * @returns {string} New Jalali date string
   */
  static subtract(date, amount, unit, format = "YYYY/MM/DD HH:mm:ss") {
    try {
      const m = moment(date).subtract(amount, unit);
      return m.format(format);
    } catch (error) {
      console.error("Error subtracting time:", error);
      return null;
    }
  }

  /**
   * Get start of a time period
   * @param {Date|string} date - Base date
   * @param {string} unit - Unit of time (year, month, week, day)
   * @param {string} format - Output format (default: 'YYYY/MM/DD HH:mm:ss')
   * @returns {string} Start of period in Jalali
   */
  static startOf(date, unit, format = "YYYY/MM/DD HH:mm:ss") {
    try {
      const m = moment(date).startOf(unit);
      return m.format(format);
    } catch (error) {
      console.error("Error getting start of period:", error);
      return null;
    }
  }

  /**
   * Get end of a time period
   * @param {Date|string} date - Base date
   * @param {string} unit - Unit of time (year, month, week, day)
   * @param {string} format - Output format (default: 'YYYY/MM/DD HH:mm:ss')
   * @returns {string} End of period in Jalali
   */
  static endOf(date, unit, format = "YYYY/MM/DD HH:mm:ss") {
    try {
      const m = moment(date).endOf(unit);
      return m.format(format);
    } catch (error) {
      console.error("Error getting end of period:", error);
      return null;
    }
  }

  /**
   * Check if a date is valid
   * @param {Date|string} date - Date to check
   * @returns {boolean} True if date is valid
   */
  static isValid(date) {
    return moment(date).isValid();
  }

  /**
   * Get relative time (e.g., "2 hours ago")
   * @param {Date|string} date - Date to get relative time for
   * @returns {string} Relative time string
   */
  static fromNow(date) {
    try {
      return moment(date).fromNow();
    } catch (error) {
      console.error("Error getting relative time:", error);
      return null;
    }
  }

  /**
   * Get difference between two dates
   * @param {Date|string} date1 - First date
   * @param {Date|string} date2 - Second date
   * @param {string} unit - Unit of time (years, months, days, hours, minutes, seconds)
   * @returns {number} Difference in specified unit
   */
  static diff(date1, date2, unit) {
    try {
      return moment(date1).diff(moment(date2), unit);
    } catch (error) {
      console.error("Error calculating date difference:", error);
      return null;
    }
  }
}

module.exports = DateTimeService;
