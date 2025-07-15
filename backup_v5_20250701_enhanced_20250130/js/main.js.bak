import { SimulationManager } from './SimulationManager.js';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize simulation
        const simulation = new SimulationManager();
        await simulation.initializeManagers();
        
        // Make simulation manager globally available for interactive controls
        window.simulationManager = simulation;
        
        // Enable start button after initialization
        const startButton = document.getElementById('start-btn');
        if (startButton) {
            startButton.disabled = false;
        }
        
        console.log('🎛️ Simulation manager is now globally available for interactive controls');
    } catch (error) {
        console.error('Error starting simulation:', error);
    }
}); 