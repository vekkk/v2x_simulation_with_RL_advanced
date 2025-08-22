import * as THREE from 'https://cdn.skypack.dev/three@0.160.0';
import { CONFIG } from '../config/config.js';

export class ProcessingManager {
    constructor(scene) {
        this.scene = scene;
        this.baseStationProcessor = null;
        this.rsuProcessors = [];
        
        // Processing statistics
        this.stats = {
            baseStation: {
                tasksProcessed: 0,
                totalProcessingTime: 0,
                averageProcessingTime: 0,
                currentLoad: 0,
                maxLoad: 100,
                queueSize: 0,
                efficiency: 100
            },
            rsus: [],
            totalTasksProcessed: 0,
            distributedTasks: 0,
            localTasks: 0
        };
        
        // Processing queues
        this.baseStationQueue = [];
        this.rsuQueues = [];
        
        // Processing capabilities
        this.processingCapabilities = {
            baseStation: {
                maxConcurrentTasks: 50,
                processingPower: 100, // Processing units per second
                specializations: ['AI_LEARNING', 'NETWORK_OPTIMIZATION', 'TRAFFIC_ANALYSIS', 'SAFETY_PROCESSING']
            },
            rsu: {
                maxConcurrentTasks: 10,
                processingPower: 20, // Processing units per second
                specializations: ['LOCAL_TRAFFIC', 'SAFETY_ALERTS', 'BASIC_PROCESSING']
            }
        };
        
        // Visual indicators
        this.processingIndicators = new Map();
        
        console.log('ProcessingManager initialized with base station and RSU processing support');
    }

    // Initialize processing units at base station and RSUs
    initializeProcessingUnits(baseStationPosition, rsuPositions) {
        // Initialize base station processor
        this.baseStationProcessor = {
            id: 'BASE_STATION',
            position: baseStationPosition.clone(),
            currentTasks: [],
            queue: [],
            processingPower: this.processingCapabilities.baseStation.processingPower,
            maxConcurrentTasks: this.processingCapabilities.baseStation.maxConcurrentTasks,
            specializations: [...this.processingCapabilities.baseStation.specializations],
            isActive: true,
            lastProcessTime: 0
        };

        // Initialize RSU processors
        this.rsuProcessors = rsuPositions.map((rsuPos, index) => ({
            id: `RSU_${index}`,
            position: rsuPos.position.clone(),
            currentTasks: [],
            queue: [],
            processingPower: this.processingCapabilities.rsu.processingPower,
            maxConcurrentTasks: this.processingCapabilities.rsu.maxConcurrentTasks,
            specializations: [...this.processingCapabilities.rsu.specializations],
            isActive: true,
            lastProcessTime: 0,
            coverageArea: 60 // RSU coverage radius in meters
        }));

        // Initialize RSU stats
        this.stats.rsus = this.rsuProcessors.map(() => ({
            tasksProcessed: 0,
            totalProcessingTime: 0,
            averageProcessingTime: 0,
            currentLoad: 0,
            maxLoad: 10,
            queueSize: 0,
            efficiency: 100
        }));

        // Create visual processing indicators
        this.createProcessingIndicators();

        console.log(`Processing units initialized: 1 base station + ${this.rsuProcessors.length} RSUs`);
    }

    // Create visual indicators for processing activity
    createProcessingIndicators() {
        // Base station processing indicator
        const baseIndicator = this.createProcessingVisual(
            this.baseStationProcessor.position,
            'BASE_STATION',
            0x00ff00, // Green for base station
            3 // Larger size for base station
        );
        this.processingIndicators.set('BASE_STATION', baseIndicator);

        // RSU processing indicators
        this.rsuProcessors.forEach((rsu, index) => {
            const rsuIndicator = this.createProcessingVisual(
                rsu.position,
                `RSU_${index}`,
                0x0088ff, // Blue for RSUs
                1.5 // Smaller size for RSUs
            );
            this.processingIndicators.set(`RSU_${index}`, rsuIndicator);
        });
    }

    createProcessingVisual(position, id, color, size) {
        const group = new THREE.Group();

        // Processing core visualization
        const coreGeometry = new THREE.SphereGeometry(size, 16, 16);
        const coreMaterial = new THREE.MeshPhongMaterial({
            color: color,
            transparent: true,
            opacity: 0.7,
            emissive: color,
            emissiveIntensity: 0.2
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.position.copy(position);
        core.position.y += (id === 'BASE_STATION') ? 45 : 12; // Position above structures
        group.add(core);

        // Processing rings for activity indication
        const ringGeometry = new THREE.RingGeometry(size * 1.5, size * 2, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(core.position);
        ring.rotation.x = -Math.PI / 2;
        group.add(ring);

        // Data flow particles
        const particles = [];
        for (let i = 0; i < 5; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.2, 8, 8);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(core.position);
            particle.userData = {
                angle: (i / 5) * Math.PI * 2,
                radius: size * 3,
                speed: 0.02 + Math.random() * 0.02
            };
            particles.push(particle);
            group.add(particle);
        }

        group.userData = {
            id: id,
            core: core,
            ring: ring,
            particles: particles,
            baseColor: color,
            isActive: false,
            processingIntensity: 0
        };

        this.scene.add(group);
        return group;
    }

    // Submit a processing task
    submitTask(task) {
        // Determine best processor for the task
        const processor = this.selectOptimalProcessor(task);
        
        if (!processor) {
            console.warn('No available processor for task:', task.type);
            return false;
        }

        // Add task to processor queue
        processor.queue.push({
            ...task,
            submittedAt: performance.now(),
            processorId: processor.id
        });

        // Update statistics
        if (processor.id === 'BASE_STATION') {
            this.stats.baseStation.queueSize = processor.queue.length;
        } else {
            const rsuIndex = parseInt(processor.id.split('_')[1]);
            this.stats.rsus[rsuIndex].queueSize = processor.queue.length;
        }

        console.log(`Task ${task.id} submitted to ${processor.id} (Queue: ${processor.queue.length})`);
        return true;
    }

    // Select optimal processor for a task
    selectOptimalProcessor(task) {
        // Check if task requires base station specialization
        if (this.processingCapabilities.baseStation.specializations.includes(task.type)) {
            // For specialized tasks, prefer base station if not overloaded
            if (this.baseStationProcessor.currentTasks.length < this.baseStationProcessor.maxConcurrentTasks) {
                return this.baseStationProcessor;
            }
        }

        // For local tasks, check nearby RSUs first
        if (task.location && this.processingCapabilities.rsu.specializations.includes(task.type)) {
            const nearbyRSU = this.findNearestAvailableRSU(task.location);
            if (nearbyRSU) {
                return nearbyRSU;
            }
        }

        // Fallback to base station if RSUs are overloaded or task is not local
        if (this.baseStationProcessor.currentTasks.length < this.baseStationProcessor.maxConcurrentTasks) {
            return this.baseStationProcessor;
        }

        // All processors are at capacity
        return null;
    }

    // Find nearest available RSU
    findNearestAvailableRSU(location) {
        let nearestRSU = null;
        let minDistance = Infinity;

        this.rsuProcessors.forEach(rsu => {
            const distance = location.distanceTo(rsu.position);
            if (distance <= rsu.coverageArea && 
                rsu.currentTasks.length < rsu.maxConcurrentTasks &&
                distance < minDistance) {
                minDistance = distance;
                nearestRSU = rsu;
            }
        });

        return nearestRSU;
    }

    // Process tasks in queues
    update(deltaTime) {
        const currentTime = performance.now();

        // Process base station tasks
        this.processTasksForProcessor(this.baseStationProcessor, currentTime, deltaTime);

        // Process RSU tasks
        this.rsuProcessors.forEach((rsu, index) => {
            this.processTasksForProcessor(rsu, currentTime, deltaTime);
        });

        // Update visual indicators
        this.updateProcessingVisuals(deltaTime);

        // Update statistics
        this.updateStatistics();
    }

    processTasksForProcessor(processor, currentTime, deltaTime) {
        // Move tasks from queue to processing if capacity allows
        while (processor.queue.length > 0 && 
               processor.currentTasks.length < processor.maxConcurrentTasks) {
            const task = processor.queue.shift();
            task.startedAt = currentTime;
            task.processingTime = this.calculateProcessingTime(task, processor);
            processor.currentTasks.push(task);
        }

        // Process current tasks
        processor.currentTasks = processor.currentTasks.filter(task => {
            const elapsed = currentTime - task.startedAt;
            
            if (elapsed >= task.processingTime) {
                // Task completed
                this.completeTask(task, processor);
                return false; // Remove from current tasks
            }
            
            return true; // Keep processing
        });
    }

    calculateProcessingTime(task, processor) {
        // Base processing time based on task complexity
        let baseTime = 100; // milliseconds
        
        switch (task.type) {
            case 'AI_LEARNING':
                baseTime = 500;
                break;
            case 'NETWORK_OPTIMIZATION':
                baseTime = 300;
                break;
            case 'TRAFFIC_ANALYSIS':
                baseTime = 200;
                break;
            case 'SAFETY_PROCESSING':
                baseTime = 50; // High priority, fast processing
                break;
            case 'LOCAL_TRAFFIC':
                baseTime = 100;
                break;
            case 'SAFETY_ALERTS':
                baseTime = 30; // Very high priority
                break;
            case 'BASIC_PROCESSING':
                baseTime = 80;
                break;
            default:
                baseTime = 150;
        }

        // Adjust based on processor power
        const processingMultiplier = 100 / processor.processingPower;
        return baseTime * processingMultiplier;
    }

    completeTask(task, processor) {
        const processingTime = performance.now() - task.startedAt;
        
        // Update processor statistics
        if (processor.id === 'BASE_STATION') {
            this.stats.baseStation.tasksProcessed++;
            this.stats.baseStation.totalProcessingTime += processingTime;
            this.stats.baseStation.averageProcessingTime = 
                this.stats.baseStation.totalProcessingTime / this.stats.baseStation.tasksProcessed;
        } else {
            const rsuIndex = parseInt(processor.id.split('_')[1]);
            this.stats.rsus[rsuIndex].tasksProcessed++;
            this.stats.rsus[rsuIndex].totalProcessingTime += processingTime;
            this.stats.rsus[rsuIndex].averageProcessingTime = 
                this.stats.rsus[rsuIndex].totalProcessingTime / this.stats.rsus[rsuIndex].tasksProcessed;
        }

        // Update global statistics
        this.stats.totalTasksProcessed++;
        if (processor.id === 'BASE_STATION') {
            this.stats.distributedTasks++;
        } else {
            this.stats.localTasks++;
        }

        // Call task completion callback if provided
        if (task.onComplete) {
            task.onComplete(task, processor.id, processingTime);
        }

        console.log(`Task ${task.id} completed by ${processor.id} in ${processingTime.toFixed(2)}ms`);
    }

    updateProcessingVisuals(deltaTime) {
        this.processingIndicators.forEach((indicator, processorId) => {
            const processor = processorId === 'BASE_STATION' ? 
                this.baseStationProcessor : 
                this.rsuProcessors.find(rsu => rsu.id === processorId);

            if (!processor) return;

            const load = processor.currentTasks.length / processor.maxConcurrentTasks;
            const isActive = processor.currentTasks.length > 0;

            // Update core intensity based on load
            const intensity = 0.2 + (load * 0.8);
            indicator.userData.core.material.emissiveIntensity = intensity;
            
            // Update ring rotation and opacity
            indicator.userData.ring.rotation.z += deltaTime * (1 + load * 2);
            indicator.userData.ring.material.opacity = 0.3 + (load * 0.4);

            // Update particle animation
            indicator.userData.particles.forEach(particle => {
                particle.userData.angle += particle.userData.speed * (1 + load);
                const x = Math.cos(particle.userData.angle) * particle.userData.radius;
                const z = Math.sin(particle.userData.angle) * particle.userData.radius;
                particle.position.x = indicator.userData.core.position.x + x;
                particle.position.z = indicator.userData.core.position.z + z;
                particle.material.opacity = isActive ? 0.8 : 0.3;
            });

            // Color coding based on load
            let color = indicator.userData.baseColor;
            if (load > 0.8) {
                color = 0xff4444; // Red for high load
            } else if (load > 0.5) {
                color = 0xffaa00; // Orange for medium load
            }
            
            indicator.userData.core.material.color.setHex(color);
            indicator.userData.ring.material.color.setHex(color);
        });
    }

    updateStatistics() {
        // Update base station load
        this.stats.baseStation.currentLoad = this.baseStationProcessor.currentTasks.length;
        this.stats.baseStation.queueSize = this.baseStationProcessor.queue.length;
        this.stats.baseStation.efficiency = Math.max(0, 100 - (this.stats.baseStation.queueSize * 5));

        // Update RSU loads
        this.rsuProcessors.forEach((rsu, index) => {
            this.stats.rsus[index].currentLoad = rsu.currentTasks.length;
            this.stats.rsus[index].queueSize = rsu.queue.length;
            this.stats.rsus[index].efficiency = Math.max(0, 100 - (this.stats.rsus[index].queueSize * 10));
        });
    }

    // Get processing statistics
    getStats() {
        return {
            ...this.stats,
            totalProcessors: 1 + this.rsuProcessors.length,
            averageLoad: this.getAverageLoad(),
            processingDistribution: this.getProcessingDistribution()
        };
    }

    getAverageLoad() {
        const baseLoad = this.stats.baseStation.currentLoad / this.stats.baseStation.maxLoad;
        const rsuLoads = this.stats.rsus.map(rsu => rsu.currentLoad / rsu.maxLoad);
        const totalLoad = baseLoad + rsuLoads.reduce((sum, load) => sum + load, 0);
        return (totalLoad / (1 + this.rsuProcessors.length)) * 100;
    }

    getProcessingDistribution() {
        const total = this.stats.totalTasksProcessed;
        if (total === 0) return { baseStation: 0, rsus: 0 };
        
        return {
            baseStation: (this.stats.distributedTasks / total) * 100,
            rsus: (this.stats.localTasks / total) * 100
        };
    }

    // Reset processing statistics
    reset() {
        this.stats = {
            baseStation: {
                tasksProcessed: 0,
                totalProcessingTime: 0,
                averageProcessingTime: 0,
                currentLoad: 0,
                maxLoad: 100,
                queueSize: 0,
                efficiency: 100
            },
            rsus: this.stats.rsus.map(() => ({
                tasksProcessed: 0,
                totalProcessingTime: 0,
                averageProcessingTime: 0,
                currentLoad: 0,
                maxLoad: 10,
                queueSize: 0,
                efficiency: 100
            })),
            totalTasksProcessed: 0,
            distributedTasks: 0,
            localTasks: 0
        };

        // Clear all queues
        this.baseStationProcessor.queue = [];
        this.baseStationProcessor.currentTasks = [];
        this.rsuProcessors.forEach(rsu => {
            rsu.queue = [];
            rsu.currentTasks = [];
        });

        console.log('ProcessingManager reset');
    }
} 