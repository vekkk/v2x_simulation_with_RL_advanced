import { SimulationManager } from './SimulationManager.js';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize simulation
        const simulation = new SimulationManager();
        await simulation.initializeManagers();
        
        // Enable start button after initialization
        const startButton = document.getElementById('start-btn');
        if (startButton) {
            startButton.disabled = false;
        }
    } catch (error) {
        console.error('Error starting simulation:', error);
    }
}); 