class RegardingDropdown {
    constructor() {
        this.cachedOptions = null;
        this.initializedDropdowns = new Set();
    }

    async fetchRegardingOptions() {
        try {
            // Return cached options if available
            if (this.cachedOptions) {
                return this.cachedOptions;
            }

            const response = await fetch('/api/crm/activities/regarding-options');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (!data || !Array.isArray(data.value)) {
                throw new Error('Invalid response format from server');
            }
            this.cachedOptions = data.value;
            return this.cachedOptions;
        } catch (error) {
            console.error('Error fetching regarding options:', error);
            Utils.showErrorToast('خطا در بارگذاری لیست مربوط به');
            return [];
        }
    }

    async populateDropdown(dropdownId, selectedId = null, selectedType = null) {
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) {
            console.error(`Dropdown element with id '${dropdownId}' not found`);
            return;
        }

        // Show loading state
        dropdown.innerHTML = '<option value="">در حال بارگذاری...</option>';

        try {
            const options = await this.fetchRegardingOptions();
            
            // Clear loading state and add default option
            dropdown.innerHTML = '<option value="">-- انتخاب کنید --</option>';

            // Add options to dropdown
            options.forEach(option => {
                if (!option || !option.id || !option.type || !option.name) {
                    console.warn('Invalid option:', option);
                    return;
                }
                const optionElement = document.createElement('option');
                const value = `${option.type}|${option.id}`;
                optionElement.value = value;
                optionElement.textContent = `(${option.type}) ${option.name}`;
                
                // Set selected if this is the current value
                if (selectedId && selectedType && 
                    option.id === selectedId && 
                    option.type === selectedType) {
                    optionElement.selected = true;
                }
                
                dropdown.appendChild(optionElement);
            });

            // Initialize or reinitialize Select2
            if (typeof $.fn.select2 !== 'undefined') {
                // Destroy existing instance if it exists
                if (this.initializedDropdowns.has(dropdownId)) {
                    $(dropdown).select2('destroy');
                }

                // Initialize Select2 with Persian language
                $(dropdown).select2({
                    theme: 'default',
                    width: '100%',
                    dir: 'rtl',
                    language: 'fa',
                    placeholder: 'انتخاب کنید',
                    allowClear: true,
                    dropdownAutoWidth: true,
                    dropdownParent: $(dropdown).closest('.modal-body'),
                    templateResult: this.formatOption,
                    templateSelection: this.formatOption
                });

                // Store the initialized dropdown
                this.initializedDropdowns.add(dropdownId);

                // Trigger change event to ensure proper initialization
                $(dropdown).trigger('change');
            } else {
                console.warn('Select2 is not loaded. Dropdown will be basic HTML select.');
            }
        } catch (error) {
            console.error('Error populating dropdown:', error);
            dropdown.innerHTML = '<option value="">خطا در بارگذاری</option>';
            Utils.showErrorToast('خطا در بارگذاری لیست مربوط به');
        }
    }

    formatOption(option) {
        if (!option.id) {
            return option.text;
        }
        return $(`<span>${option.text}</span>`);
    }

    getSelectedValues(dropdownId) {
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) {
            console.error(`Dropdown element with id '${dropdownId}' not found`);
            return null;
        }

        let selectedValue;
        if (typeof $.fn.select2 !== 'undefined' && this.initializedDropdowns.has(dropdownId)) {
            selectedValue = $(dropdown).select2('val');
        } else {
            selectedValue = dropdown.value;
        }

        if (!selectedValue) return null;

        const [type, id] = selectedValue.split('|');
        if (!type || !id) {
            console.warn('Invalid selected value format:', selectedValue);
            return null;
        }
        return { type, id };
    }

    clearCache() {
        this.cachedOptions = null;
        // Destroy all Select2 instances
        this.initializedDropdowns.forEach(dropdownId => {
            const dropdown = document.getElementById(dropdownId);
            if (dropdown && typeof $.fn.select2 !== 'undefined') {
                $(dropdown).select2('destroy');
            }
        });
        this.initializedDropdowns.clear();
    }
}

// Ensure regardingDropdown is properly exported and used
export const regardingDropdown = new RegardingDropdown();