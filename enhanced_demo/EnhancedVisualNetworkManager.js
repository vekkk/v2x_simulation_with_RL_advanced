// Enhanced Visual Network Manager with AI Integration and Slow Motion
class EnhancedVisualNetworkManager {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.networks = {
            cellular: { color: 0x00ff00, name: 'Cellular' },
            wifi: { color: 0xff8800, name: 'WiFi' },
            dsrc: { color: 0x0088ff, name: 'DSRC' },
            satellite: { color: 0xff0088, name: 'Satellite' }
        };
        
        this.messageParticles = [];
        this.networkLines = [];
        this.aiDecisionMarkers = [];
        this.slowMotionFactor = 0.3; // Slow motion factor
        this.lastUpdateTime = Date.now();
        
        this.setupNetworkVisuals();
    }
    
    setupNetworkVisuals() {
        // Create network infrastructure visualization
        this.createNetworkInfrastructure();
        
        // Create AI decision visualization
        this.createAIDecisionVisuals();
    }
    
    createNetworkInfrastructure() {
        // Create base station (cloud AI)
        const baseStationGeometry = new THREE.SphereGeometry(2, 16, 16);
        const baseStationMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            transparent: true, 
            opacity: 0.7 
        });
        this.baseStation = new THREE.Mesh(baseStationGeometry, baseStationMaterial);
        this.baseStation.position.set(0, 20, 0);
        this.scene.add(this.baseStation);
        
        // Add base station label
        const baseStationLabel = this.createTextLabel('Cloud AI\nBase Station', 0x00ff00);
        baseStationLabel.position.set(0, 25, 0);
        this.scene.add(baseStationLabel);
        
        // Create RSUs (edge AI)
        this.rsus = [];
        const rsuPositions = [
            { x: -15, z: -15 },
            { x: 15, z: -15 },
            { x: -15, z: 15 },
            { x: 15, z: 15 }
        ];
        
        rsuPositions.forEach((pos, index) => {
            const rsuGeometry = new THREE.CylinderGeometry(1, 1, 3, 8);
            const rsuMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xff8800, 
                transparent: true, 
                opacity: 0.7 
            });
            const rsu = new THREE.Mesh(rsuGeometry, rsuMaterial);
            rsu.position.set(pos.x, 8, pos.z);
            rsu.rotation.x = Math.PI / 2;
            this.scene.add(rsu);
            this.rsus.push(rsu);
            
            // Add RSU label
            const rsuLabel = this.createTextLabel(`Edge AI\nRSU ${index + 1}`, 0xff8800);
            rsuLabel.position.set(pos.x, 12, pos.z);
            this.scene.add(rsuLabel);
        });
        
        // Create network coverage areas
        this.createNetworkCoverage();
    }
    
    createNetworkCoverage() {
        // Cellular coverage (wide area)
        const cellularGeometry = new THREE.CircleGeometry(30, 32);
        const cellularMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            transparent: true, 
            opacity: 0.1,
            side: THREE.DoubleSide
        });
        const cellularCoverage = new THREE.Mesh(cellularGeometry, cellularMaterial);
        cellularCoverage.rotation.x = -Math.PI / 2;
        cellularCoverage.position.y = 0.1;
        this.scene.add(cellularCoverage);
        
        // WiFi coverage (medium area around RSUs)
        this.rsus.forEach((rsu, index) => {
            const wifiGeometry = new THREE.CircleGeometry(8, 16);
            const wifiMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xff8800, 
                transparent: true, 
                opacity: 0.1,
                side: THREE.DoubleSide
            });
            const wifiCoverage = new THREE.Mesh(wifiGeometry, wifiMaterial);
            wifiCoverage.rotation.x = -Math.PI / 2;
            wifiCoverage.position.set(rsu.position.x, 0.1, rsu.position.z);
            this.scene.add(wifiCoverage);
        });
        
        // DSRC coverage (short range)
        const dsrcGeometry = new THREE.CircleGeometry(5, 12);
        const dsrcMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x0088ff, 
            transparent: true, 
            opacity: 0.1,
            side: THREE.DoubleSide
        });
        const dsrcCoverage = new THREE.Mesh(dsrcGeometry, dsrcMaterial);
        dsrcCoverage.rotation.x = -Math.PI / 2;
        dsrcCoverage.position.y = 0.1;
        this.scene.add(dsrcCoverage);
    }
    
    createAIDecisionVisuals() {
        // Create AI decision indicators
        this.aiDecisionArea = new THREE.Group();
        this.aiDecisionArea.position.set(0, 15, 0);
        this.scene.add(this.aiDecisionArea);
        
        // Create decision text display
        this.decisionText = this.createTextLabel('AI Decisions\nWaiting...', 0xffffff);
        this.decisionText.position.set(0, 0, 0);
        this.aiDecisionArea.add(this.decisionText);
    }
    
    createTextLabel(text, color) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;
        
        context.fillStyle = '#000000';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.font = '16px Arial';
        context.textAlign = 'center';
        
        const lines = text.split('\n');
        lines.forEach((line, index) => {
            context.fillText(line, canvas.width / 2, 30 + index * 20);
        });
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        const geometry = new THREE.PlaneGeometry(4, 2);
        const mesh = new THREE.Mesh(geometry, material);
        
        return mesh;
    }
    
    updateDecisionText(text) {
        if (this.decisionText) {
            this.scene.remove(this.decisionText);
            this.decisionText = this.createTextLabel(text, 0xffffff);
            this.decisionText.position.set(0, 0, 0);
            this.aiDecisionArea.add(this.decisionText);
        }
    }
    
    transmitMessage(message, fromVehicle, toTarget) {
        const currentTime = Date.now();
        
        // Create message particle
        const particleGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({ 
            color: this.getMessageColor(message.type),
            transparent: true,
            opacity: 0.8
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.position.copy(fromVehicle.position);
        particle.position.y += 2; // Float above vehicle
        
        // Store message data
        particle.userData = {
            message: message,
            startPosition: particle.position.clone(),
            targetPosition: toTarget ? toTarget.position.clone() : this.baseStation.position.clone(),
            startTime: currentTime,
            duration: 3000 * this.slowMotionFactor, // 3 seconds in slow motion
            type: message.type,
            priority: message.priority
        };
        
        this.scene.add(particle);
        this.messageParticles.push(particle);
        
        // Create network line
        this.createNetworkLine(particle);
        
        // Update AI decision display
        this.updateAIDecision(message);
        
        return particle;
    }
    
    getMessageColor(type) {
        const colors = {
            'safety': 0xff0000,      // Red for safety
            'traffic': 0xffff00,     // Yellow for traffic
            'infotainment': 0x00ffff, // Cyan for infotainment
            'emergency': 0xff00ff    // Magenta for emergency
        };
        return colors[type] || 0xffffff;
    }
    
    createNetworkLine(particle) {
        const message = particle.userData.message;
        const networkType = message.network || 'cellular';
        const networkColor = this.networks[networkType].color;
        
        // Create line to show network path
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            particle.position,
            particle.userData.targetPosition
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: networkColor,
            transparent: true,
            opacity: 0.6
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        this.scene.add(line);
        this.networkLines.push(line);
        
        // Store reference to particle
        line.userData.particle = particle;
    }
    
    updateAIDecision(message) {
        const networkType = message.network || 'cellular';
        const decisionText = `AI Decision:\n${message.type.toUpperCase()} Message\nNetwork: ${networkType.toUpperCase()}\nPriority: ${message.priority}`;
        this.updateDecisionText(decisionText);
        
        // Highlight the chosen network
        this.highlightNetwork(networkType);
    }
    
    highlightNetwork(networkType) {
        // Reset all network colors
        Object.keys(this.networks).forEach(type => {
            const color = this.networks[type].color;
            if (type === 'cellular') {
                this.baseStation.material.color.setHex(color);
            }
        });
        
        // Highlight the chosen network
        const highlightColor = 0xffff00;
        if (networkType === 'cellular') {
            this.baseStation.material.color.setHex(highlightColor);
        }
    }
    
    update() {
        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastUpdateTime;
        this.lastUpdateTime = currentTime;
        
        // Update message particles
        this.updateMessageParticles(deltaTime);
        
        // Update network lines
        this.updateNetworkLines();
        
        // Update AI decision area
        this.updateAIDecisionArea();
    }
    
    updateMessageParticles(deltaTime) {
        const currentTime = Date.now();
        
        for (let i = this.messageParticles.length - 1; i >= 0; i--) {
            const particle = this.messageParticles[i];
            const data = particle.userData;
            
            // Calculate progress
            const elapsed = currentTime - data.startTime;
            const progress = Math.min(elapsed / data.duration, 1);
            
            // Update position
            particle.position.lerpVectors(data.startPosition, data.targetPosition, progress);
            
            // Add floating animation
            particle.position.y += Math.sin(currentTime * 0.005) * 0.01;
            
            // Remove completed particles
            if (progress >= 1) {
                this.scene.remove(particle);
                this.messageParticles.splice(i, 1);
                
                // Remove associated network line
                this.removeNetworkLine(particle);
            }
        }
    }
    
    updateNetworkLines() {
        // Update network lines to follow particles
        this.networkLines.forEach(line => {
            const particle = line.userData.particle;
            if (particle && particle.parent) {
                const points = [particle.position, particle.userData.targetPosition];
                line.geometry.setFromPoints(points);
            }
        });
    }
    
    removeNetworkLine(particle) {
        for (let i = this.networkLines.length - 1; i >= 0; i--) {
            const line = this.networkLines[i];
            if (line.userData.particle === particle) {
                this.scene.remove(line);
                this.networkLines.splice(i, 1);
                break;
            }
        }
    }
    
    updateAIDecisionArea() {
        // Rotate AI decision area
        if (this.aiDecisionArea) {
            this.aiDecisionArea.rotation.y += 0.01;
        }
    }
    
    // Method to get network statistics (required by SimulationManager)
    getNetworkStats() {
        return {
            cellular: { active: this.messageParticles.length > 0, messages: this.messageParticles.length },
            wifi: { active: false, messages: 0 },
            dsrc: { active: false, messages: 0 },
            satellite: { active: false, messages: 0 }
        };
    }
    
    // Method to clear all messages (required by SimulationManager)
    clearMessages() {
        this.messageParticles.forEach(particle => {
            this.scene.remove(particle);
        });
        this.messageParticles = [];
        
        this.networkLines.forEach(line => {
            this.scene.remove(line);
        });
        this.networkLines = [];
    }
    
    // Method to set slow motion factor
    setSlowMotion(factor) {
        this.slowMotionFactor = factor;
    }
} 