console.log('🔍 DEBUG: main.js starting to load...');

import { SimulationManager } from './SimulationManager.js';

console.log('🔍 DEBUG: SimulationManager imported successfully');

// Initialize simulation when the window loads
window.addEventListener('load', () => {
    console.log('🔍 DEBUG: Window loaded, initializing simulation...');
    try {
        const simulation = new SimulationManager();
        console.log('🔍 DEBUG: SimulationManager instantiated successfully');
    } catch (error) {
        console.error('🔍 DEBUG: Error creating SimulationManager:', error);
    }
}); 