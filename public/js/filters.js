// Filters component for BI Supabase

// Validate date inputs
function validateDateInputs() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    
    // Check if dates are empty
    if (!startDate || !endDate) {
        return {
            valid: false,
            message: 'Por favor, preencha as datas de início e fim.'
        };
    }
    
    // Check date format (DD/MM/YYYY)
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        return {
            valid: false,
            message: 'O formato das datas deve ser DD/MM/YYYY.'
        };
    }
    
    // Parse dates for comparison
    const parsedStartDate = parseDate(startDate);
    const parsedEndDate = parseDate(endDate);
    
    // Check if dates are valid
    if (!parsedStartDate || !parsedEndDate) {
        return {
            valid: false,
            message: 'Datas inválidas. Use o formato DD/MM/YYYY.'
        };
    }
    
    // Check if start date is before end date
    if (parsedStartDate > parsedEndDate) {
        return {
            valid: false,
            message: 'A data inicial deve ser anterior à data final.'
        };
    }
    
    return {
        valid: true,
        startDate: startDate,
        endDate: endDate
    };
}

// Parse date from DD/MM/YYYY format
function parseDate(dateStr) {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const year = parseInt(parts[2], 10);
    
    const date = new Date(year, month, day);
    
    // Validate parsed date
    if (
        isNaN(date.getTime()) ||
        date.getDate() !== day ||
        date.getMonth() !== month ||
        date.getFullYear() !== year
    ) {
        return null;
    }
    
    return date;
}

// Generate date range for date picker
function generateDateRange(startDate, endDate) {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    const dateRange = [];
    
    if (!start || !end) return dateRange;
    
    // Clone start date
    let currentDate = new Date(start.getTime());
    
    // Add dates to range
    while (currentDate <= end) {
        const dateStr = formatDate(currentDate);
        dateRange.push(dateStr);
        
        // Increment by one day
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dateRange;
}

// Format date to DD/MM/YYYY
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Get current month date range
function getCurrentMonthRange() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    return {
        startDate: formatDate(firstDayOfMonth),
        endDate: formatDate(today)
    };
}

// Apply date range presets
function applyDateRangePreset(preset) {
    const today = new Date();
    let startDate, endDate;
    
    switch(preset) {
        case 'today':
            startDate = formatDate(today);
            endDate = formatDate(today);
            break;
        case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            startDate = formatDate(yesterday);
            endDate = formatDate(yesterday);
            break;
        case 'thisWeek':
            const firstDayOfWeek = new Date(today);
            const dayOfWeek = today.getDay();
            const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust for starting week on Monday
            firstDayOfWeek.setDate(today.getDate() - diff);
            startDate = formatDate(firstDayOfWeek);
            endDate = formatDate(today);
            break;
        case 'thisMonth':
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            startDate = formatDate(firstDayOfMonth);
            endDate = formatDate(today);
            break;
        case 'lastMonth':
            const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            startDate = formatDate(firstDayOfLastMonth);
            endDate = formatDate(lastDayOfLastMonth);
            break;
        default:
            return null;
    }
    
    return { startDate, endDate };
}

// Apply date filter preset and update UI
function applyDateFilterPreset(preset) {
    const dateRange = applyDateRangePreset(preset);
    
    if (dateRange) {
        // Atualizar os inputs de data
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput && endDateInput) {
            // Definir uma flag para indicar que é uma atualização programática
            window.isPresetUpdate = true;
            
            startDateInput.value = dateRange.startDate;
            endDateInput.value = dateRange.endDate;
            
            // Atualizar os date pickers se existirem
            if (startDateInput._flatpickr) {
                startDateInput._flatpickr.setDate(dateRange.startDate, false);
            }
            if (endDateInput._flatpickr) {
                endDateInput._flatpickr.setDate(dateRange.endDate, false);
            }
            
            // Reset flag after a brief delay
            setTimeout(() => {
                window.isPresetUpdate = false;
            }, 100);
        }
        
        // Highlight the active button
        updateActiveFilterButton(preset);
        
        // Aplicar os filtros automaticamente
        if (typeof loadMetricsData === 'function') {
            loadMetricsData();
        }
        if (typeof loadCompanyMetricsData === 'function') {
            loadCompanyMetricsData();
        }
    }
}

// Update active filter button style
function updateActiveFilterButton(preset) {
    // Remove active class from all filter buttons
    document.querySelectorAll('.btn-filter').forEach(button => {
        button.classList.remove('active');
    });
    
    // Add active class to the selected filter button
    const activeButton = document.querySelector(`.btn-filter[data-preset="${preset}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// Set up date filter preset buttons
function setupDateFilterPresetButtons() {
    const filterButtons = document.querySelectorAll('.btn-filter');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const preset = this.getAttribute('data-preset');
            applyDateFilterPreset(preset);
        });
    });
}

// Clear active filter buttons when dates are manually changed
function clearActiveFilterButtons() {
    // Only clear if it's not a programmatic update
    if (window.isPresetUpdate) return;
    
    document.querySelectorAll('.btn-filter').forEach(button => {
        button.classList.remove('active');
    });
}

// Setup date input change listeners
function setupDateInputListeners() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (startDateInput) {
        startDateInput.addEventListener('change', clearActiveFilterButtons);
        startDateInput.addEventListener('input', clearActiveFilterButtons);
    }
    
    if (endDateInput) {
        endDateInput.addEventListener('change', clearActiveFilterButtons);
        endDateInput.addEventListener('input', clearActiveFilterButtons);
    }
}

// Initialize date filters
function initializeDateFilters() {
    setupDateFilterPresetButtons();
    setupDateInputListeners();
}

// Export functions
window.filters = {
    validateDateInputs,
    parseDate,
    generateDateRange,
    formatDate,
    getCurrentMonthRange,
    applyDateRangePreset,
    applyDateFilterPreset,
    initializeDateFilters
};
