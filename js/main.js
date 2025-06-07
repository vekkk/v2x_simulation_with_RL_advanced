import { SimulationManager } from './SimulationManager.js';

// Initialize simulation when the window loads
window.addEventListener('load', () => {
    console.log('Window loaded, initializing simulation...');
    const simulation = new SimulationManager();
}); 