interface ChargingParams {
    voltage: number;
    batterySize: number;
    chargingCurrent: number;
    currentCharge: number;
    targetCharge: number;
    completionTime: string;
    efficiency: number;
}

interface ChargingResult {
    startTime: string;
    durationHours: number;
    durationMinutes: number;
    energyRequired: number;
    chargingPower: number;
    effectiveRate: number;
    isNextDay: boolean;
}

function calculateChargingSchedule(params: ChargingParams): ChargingResult | null {
    const { voltage, batterySize, chargingCurrent, currentCharge, targetCharge, completionTime, efficiency } = params;

    // Validate inputs
    if (currentCharge >= targetCharge) {
        return null;
    }

    // Calculate charging power (W) = Voltage (V) × Current (A)
    const chargingPowerWatts = voltage * chargingCurrent;
    const chargingPowerKW = chargingPowerWatts / 1000;

    // Apply efficiency to get effective charging rate
    const efficiencyDecimal = efficiency / 100;
    const effectiveRateKW = chargingPowerKW * efficiencyDecimal;

    // Calculate energy required
    const chargePercentageNeeded = targetCharge - currentCharge;
    const energyRequiredKWh = (chargePercentageNeeded / 100) * batterySize;

    // Calculate charging duration in hours
    const chargingDurationHours = energyRequiredKWh / effectiveRateKW;

    // Parse completion time
    const [completionHours, completionMinutes] = completionTime.split(':').map(Number);
    const completionDate = new Date();
    completionDate.setHours(completionHours, completionMinutes, 0, 0);

    // Calculate start time
    const chargingDurationMs = chargingDurationHours * 60 * 60 * 1000;
    const startDate = new Date(completionDate.getTime() - chargingDurationMs);

    // Check if start time is in the past (meaning it's for the next day)
    const now = new Date();
    let isNextDay = false;

    if (startDate < now) {
        // If start time is in the past, the completion time is for tomorrow
        completionDate.setDate(completionDate.getDate() + 1);
        startDate.setTime(completionDate.getTime() - chargingDurationMs);
        isNextDay = true;
    }

    // Format start time
    const startHours = startDate.getHours().toString().padStart(2, '0');
    const startMinutes = startDate.getMinutes().toString().padStart(2, '0');
    const startTimeFormatted = `${startHours}:${startMinutes}`;

    // Calculate duration in hours and minutes
    const totalMinutes = Math.round(chargingDurationHours * 60);
    const durationHours = Math.floor(totalMinutes / 60);
    const durationMinutes = totalMinutes % 60;

    return {
        startTime: startTimeFormatted,
        durationHours,
        durationMinutes,
        energyRequired: Math.round(energyRequiredKWh * 10) / 10,
        chargingPower: Math.round(chargingPowerKW * 10) / 10,
        effectiveRate: Math.round(effectiveRateKW * 10) / 10,
        isNextDay
    };
}

const STORAGE_KEY = 'ev-charging-calculator-inputs';

interface StoredInputs {
    voltage: string;
    batterySize: string;
    chargingCurrent: string;
    currentCharge: string;
    targetCharge: string;
    completionTime: string;
    efficiency: string;
}

function saveInputsToStorage(): void {
    const inputs: StoredInputs = {
        voltage: (document.getElementById('voltage') as HTMLInputElement).value,
        batterySize: (document.getElementById('batterySize') as HTMLInputElement).value,
        chargingCurrent: (document.getElementById('chargingCurrent') as HTMLInputElement).value,
        currentCharge: (document.getElementById('currentCharge') as HTMLInputElement).value,
        targetCharge: (document.getElementById('targetCharge') as HTMLInputElement).value,
        completionTime: (document.getElementById('completionTime') as HTMLInputElement).value,
        efficiency: (document.getElementById('efficiency') as HTMLInputElement).value,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
}

function loadInputsFromStorage(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
        const inputs: StoredInputs = JSON.parse(stored);

        const setIfExists = (id: string, value: string | undefined) => {
            if (value !== undefined) {
                const el = document.getElementById(id) as HTMLInputElement;
                if (el) el.value = value;
            }
        };

        setIfExists('voltage', inputs.voltage);
        setIfExists('batterySize', inputs.batterySize);
        setIfExists('chargingCurrent', inputs.chargingCurrent);
        setIfExists('currentCharge', inputs.currentCharge);
        setIfExists('targetCharge', inputs.targetCharge);
        setIfExists('completionTime', inputs.completionTime);
        setIfExists('efficiency', inputs.efficiency);

        // Update efficiency display
        updateEfficiencyDisplay();
    } catch (e) {
        console.warn('Failed to load saved inputs:', e);
    }
}

function getInputValue(id: string): number {
    const element = document.getElementById(id) as HTMLInputElement;
    return parseFloat(element.value) || 0;
}

function getTimeValue(id: string): string {
    const element = document.getElementById(id) as HTMLInputElement;
    return element.value;
}

function updateResults(result: ChargingResult | null): void {
    const resultsSection = document.getElementById('resultsSection');
    const startTimeEl = document.getElementById('startTime');
    const durationEl = document.getElementById('duration');
    const energyRequiredEl = document.getElementById('energyRequired');
    const chargingPowerEl = document.getElementById('chargingPower');
    const effectiveRateEl = document.getElementById('effectiveRate');
    const summaryTextEl = document.getElementById('summaryText');

    if (!result) {
        if (startTimeEl) startTimeEl.textContent = '--:--';
        if (durationEl) durationEl.textContent = '-- hrs -- min';
        if (energyRequiredEl) energyRequiredEl.textContent = '-- kWh';
        if (chargingPowerEl) chargingPowerEl.textContent = '-- kW';
        if (effectiveRateEl) effectiveRateEl.textContent = '-- kW';
        if (summaryTextEl) {
            summaryTextEl.innerHTML = '<span class="highlight">Error:</span> Current charge level must be less than target charge level.';
        }
        return;
    }

    resultsSection?.classList.add('calculated');

    if (startTimeEl) {
        startTimeEl.innerHTML = result.startTime +
            (result.isNextDay ? '<span class="next-day-badge">TODAY</span>' : '');
    }

    if (durationEl) {
        const hoursText = result.durationHours > 0 ? `${result.durationHours} hrs ` : '';
        durationEl.textContent = `${hoursText}${result.durationMinutes} min`;
    }

    if (energyRequiredEl) energyRequiredEl.textContent = `${result.energyRequired} kWh`;
    if (chargingPowerEl) chargingPowerEl.textContent = `${result.chargingPower} kW`;
    if (effectiveRateEl) effectiveRateEl.textContent = `${result.effectiveRate} kW`;

    if (summaryTextEl) {
        const currentCharge = getInputValue('currentCharge');
        const targetCharge = getInputValue('targetCharge');
        const completionTime = getTimeValue('completionTime');

        summaryTextEl.innerHTML = `Start charging at <span class="highlight">${result.startTime}</span> ` +
            `to go from <span class="highlight">${currentCharge}%</span> to ` +
            `<span class="highlight">${targetCharge}%</span> by ` +
            `<span class="highlight">${completionTime}</span>` +
            (result.isNextDay ? ' (charging starts today for tomorrow\'s target)' : '') + '.';
    }
}

function handleCalculate(): void {
    const params: ChargingParams = {
        voltage: getInputValue('voltage'),
        batterySize: getInputValue('batterySize'),
        chargingCurrent: getInputValue('chargingCurrent'),
        currentCharge: getInputValue('currentCharge'),
        targetCharge: getInputValue('targetCharge'),
        completionTime: getTimeValue('completionTime'),
        efficiency: getInputValue('efficiency')
    };

    const result = calculateChargingSchedule(params);
    updateResults(result);
}

function updateEfficiencyDisplay(): void {
    const efficiencySlider = document.getElementById('efficiency') as HTMLInputElement;
    const efficiencyValue = document.getElementById('efficiencyValue');

    if (efficiencySlider && efficiencyValue) {
        efficiencyValue.textContent = `${efficiencySlider.value}%`;
    }
}

// Debounce function to prevent too many calculations
function debounce<T extends (...args: unknown[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

function initializeApp(): void {
    // Load saved inputs from localStorage
    loadInputsFromStorage();

    // Create debounced version of handleCalculate for real-time updates
    const debouncedCalculate = debounce(handleCalculate, 150);
    const debouncedSave = debounce(saveInputsToStorage, 500);

    // Set up efficiency slider with real-time updates
    const efficiencySlider = document.getElementById('efficiency');
    if (efficiencySlider) {
        efficiencySlider.addEventListener('input', () => {
            updateEfficiencyDisplay();
            debouncedCalculate();
            debouncedSave();
        });
    }

    // Add real-time calculation on any input change
    const inputs = document.querySelectorAll('input[type="number"], input[type="time"]');
    inputs.forEach(input => {
        // Real-time update on input
        input.addEventListener('input', () => {
            debouncedCalculate();
            debouncedSave();
        });

        // Also update on change (for time picker)
        input.addEventListener('change', () => {
            handleCalculate();
            saveInputsToStorage();
        });
    });

    // Run initial calculation with loaded/default values
    handleCalculate();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
