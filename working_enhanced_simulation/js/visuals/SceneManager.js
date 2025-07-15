import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { CONFIG } from '../config/config.js';

export class SceneManager {
    constructor() {
        this.textures = {};
        this.baseStationGroup = new THREE.Group();  // Create a group for base station components
        this.baseStationPosition = new THREE.Vector3(0, 0, 0);
        this.moveSpeed = 1;  // Speed of movement
        this.setupKeyboardControls();
        
        // Create shared materials once to avoid WebGL texture limits
        this.sharedMaterials = this.createSharedMaterials();
        
        // Bind the initialize method to this instance
        this.initialize = this.initialize.bind(this);
    }

    async initialize() {
        console.log('🚀 SceneManager: Starting initialization...');
        
        console.log('📦 Step 1/8: Loading assets...');
        await this.loadAssets();
        
        console.log('🏗️ Step 2/8: Setting up scene...');
        this.setupScene();
        
        console.log('📷 Step 3/8: Setting up camera...');
        this.setupCamera();
        
        console.log('🖥️ Step 4/8: Setting up renderer...');
        this.setupRenderer();
        
        console.log('🎮 Step 5/8: Setting up controls...');
        this.setupControls();
        
        console.log('💡 Step 6/8: Setting up lighting...');
        this.setupLighting();
        
        console.log('🛣️ Step 7/8: Creating roads...');
        this.createRoad();
        
        console.log('📡 Step 8/8: Creating base station and RSUs...');
        this.createBaseStation();
        this.createRSUs();
        
        console.log('✅ SceneManager: Initialization complete!');
        return this;
    }

    async loadAssets() {
        const textureLoader = new THREE.TextureLoader();
        
        console.log('🖼️ Loading textures...');
        
        // Load ground texture only once and reuse it
        const landscapeTexture = await new Promise((resolve, reject) => {
            textureLoader.load('assets/Landscape_2.jpeg', 
                (texture) => {
                    console.log('✅ Landscape texture loaded');
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.repeat.set(20, 20);
                    resolve(texture);
                },
                (progress) => {
                    console.log('📊 Loading progress:', (progress.loaded / progress.total * 100) + '%');
                },
                (error) => {
                    console.warn('⚠️ Failed to load texture, using fallback');
                    resolve(null); // Use fallback instead of failing
                }
            );
        });

        // Reuse the same texture for both ground and sky to save memory and loading time
        this.textures.ground = landscapeTexture;
        this.textures.sky = landscapeTexture;
        
        console.log('✅ Assets loaded successfully');
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
        
        // Create simple skybox using shared material
        const skyGeometry = new THREE.SphereGeometry(500, 32, 16); // Reduced geometry complexity
        const skybox = new THREE.Mesh(skyGeometry, this.sharedMaterials.sky);
        this.scene.add(skybox);
        
        console.log('🎨 Using shared sky material to avoid WebGL limits');
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            2000
        );
        // Position camera to view the scene from a better angle
        this.camera.position.set(50, 30, 50);
        this.camera.lookAt(0, 0, 0);
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 50;
        this.controls.maxDistance = 500;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.update();
    }

    setupLighting() {
        // Simplified lighting to avoid WebGL texture/light limits
        
        // Add ambient light (no shadows, no texture usage)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        this.scene.add(ambientLight);

        // Add single directional light (disabled shadows to save texture units)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = false; // Disable shadows to save texture units
        
        this.scene.add(directionalLight);
        
        console.log('🔧 Using optimized lighting (no shadows) to avoid WebGL texture limits');
    }

    createRoad() {
        // Create ground plane using shared material
        const groundPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(CONFIG.ROAD.LENGTH * 3, CONFIG.ROAD.LENGTH * 3),
            this.sharedMaterials.ground
        );
        groundPlane.rotation.x = -Math.PI / 2;
        groundPlane.position.y = -0.5; // Lower the ground plane so roads are clearly visible
        groundPlane.receiveShadow = false; // Disable shadows to save texture units
        this.scene.add(groundPlane);

        // Enhanced road network with multiple intersections
        this.createRoadNetwork();
        
        // Create traffic lights at intersections
        this.createTrafficLightSystem();
        
        console.log('🎨 Using shared ground material to avoid WebGL limits');
        console.log('🛣️ Roads positioned above ground for better visibility');
    }

    createRoadNetwork() {
        const roadLength = CONFIG.ROAD.LENGTH * 1.5;
        const roadWidth = CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES;
        
        // Use shared materials instead of creating new ones
        const roadMaterial = this.sharedMaterials.road;
        const shoulderMaterial = this.sharedMaterials.shoulder;

        // Create main road network - Grid pattern
        const intersectionPositions = [
            { x: 0, z: 0 },           // Center intersection
            { x: -80, z: 0 },         // West intersection
            { x: 80, z: 0 },          // East intersection
            { x: 0, z: -80 },         // North intersection
            { x: 0, z: 80 },          // South intersection
            { x: -80, z: -80 },       // Northwest intersection
            { x: 80, z: -80 },        // Northeast intersection
            { x: -80, z: 80 },        // Southwest intersection
            { x: 80, z: 80 }          // Southeast intersection
        ];

        // Store intersection positions for traffic light system
        this.intersectionPositions = intersectionPositions;

        // Create horizontal roads
        this.createHorizontalRoads(roadMaterial, shoulderMaterial, roadWidth, roadLength);
        
        // Create vertical roads
        this.createVerticalRoads(roadMaterial, shoulderMaterial, roadWidth, roadLength);
        
        // Create intersection areas
        this.createIntersectionAreas(roadMaterial, roadWidth);
        
        // Add lane markings
        this.createLaneMarkings(roadWidth, roadLength);
        
        console.log('🛣️ Enhanced road network created with', intersectionPositions.length, 'intersections');
    }

    createHorizontalRoads(roadMaterial, shoulderMaterial, roadWidth, roadLength) {
        const roadPositions = [-80, 0, 80]; // Y positions for horizontal roads
        
        roadPositions.forEach(zPos => {
            // Main road segment - raised higher for visibility
            const roadGeometry = new THREE.PlaneGeometry(roadLength * 1.5, roadWidth);
            const road = new THREE.Mesh(roadGeometry, roadMaterial);
            road.rotation.x = -Math.PI / 2;
            road.position.set(0, 0.1, zPos); // Raised higher for visibility
            road.receiveShadow = false; // Disable shadows to save texture units
            this.scene.add(road);

            // Road shoulders
            const shoulderGeometry = new THREE.PlaneGeometry(roadLength * 1.5, CONFIG.ROAD.SHOULDER_WIDTH);
            
            // Left shoulder
            const leftShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
            leftShoulder.rotation.x = -Math.PI / 2;
            leftShoulder.position.set(0, 0.1, zPos - roadWidth/2 - CONFIG.ROAD.SHOULDER_WIDTH/2);
            this.scene.add(leftShoulder);
            
            // Right shoulder
            const rightShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
            rightShoulder.rotation.x = -Math.PI / 2;
            rightShoulder.position.set(0, 0.1, zPos + roadWidth/2 + CONFIG.ROAD.SHOULDER_WIDTH/2);
            this.scene.add(rightShoulder);
        });
    }

    createVerticalRoads(roadMaterial, shoulderMaterial, roadWidth, roadLength) {
        const roadPositions = [-80, 0, 80]; // X positions for vertical roads
        
        roadPositions.forEach(xPos => {
            // Main road segment - raised higher for visibility
            const roadGeometry = new THREE.PlaneGeometry(roadWidth, roadLength * 1.5);
            const road = new THREE.Mesh(roadGeometry, roadMaterial);
            road.rotation.x = -Math.PI / 2;
            road.position.set(xPos, 0.1, 0); // Raised higher for visibility
            road.receiveShadow = false; // Disable shadows to save texture units
            this.scene.add(road);

            // Road shoulders
            const shoulderGeometry = new THREE.PlaneGeometry(CONFIG.ROAD.SHOULDER_WIDTH, roadLength * 1.5);
            
            // Left shoulder
            const leftShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
            leftShoulder.rotation.x = -Math.PI / 2;
            leftShoulder.position.set(xPos - roadWidth/2 - CONFIG.ROAD.SHOULDER_WIDTH/2, 0.1, 0);
            this.scene.add(leftShoulder);
            
            // Right shoulder
            const rightShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
            rightShoulder.rotation.x = -Math.PI / 2;
            rightShoulder.position.set(xPos + roadWidth/2 + CONFIG.ROAD.SHOULDER_WIDTH/2, 0.1, 0);
            this.scene.add(rightShoulder);
        });
    }

    createIntersectionAreas(roadMaterial, roadWidth) {
        // Create intersection areas where roads cross - raised higher for visibility
        this.intersectionPositions.forEach(pos => {
            const intersectionGeometry = new THREE.PlaneGeometry(roadWidth + 4, roadWidth + 4);
            const intersection = new THREE.Mesh(intersectionGeometry, roadMaterial);
            intersection.rotation.x = -Math.PI / 2;
            intersection.position.set(pos.x, 0.15, pos.z); // Raised higher for visibility
            intersection.receiveShadow = false; // Disable shadows to save texture units
            this.scene.add(intersection);
        });
    }

    createLaneMarkings(roadWidth, roadLength) {
        // Use shared material for all lane markings
        const dashMaterial = this.sharedMaterials.laneMarking;
        
        const dashLength = 4;
        const dashGap = 6;
        const numDashes = Math.floor(roadLength / (dashLength + dashGap));

        // Horizontal road lane markings - raised higher for visibility
        [-80, 0, 80].forEach(zPos => {
            for (let lane = 1; lane < CONFIG.ROAD.NUM_LANES; lane++) {
                const yOffset = -roadWidth/2 + lane * CONFIG.ROAD.LANE_WIDTH;
                
                for (let dash = 0; dash < numDashes; dash++) {
                    // Skip dashes near intersections
                    const xPos = -roadLength/2 + dash * (dashLength + dashGap);
                    const nearIntersection = this.intersectionPositions.some(intersection => 
                        Math.abs(xPos - intersection.x) < 20 && Math.abs(zPos - intersection.z) < 20
                    );
                    
                    if (!nearIntersection) {
                        const dashGeometry = new THREE.PlaneGeometry(dashLength, 0.2);
                        const dash = new THREE.Mesh(dashGeometry, dashMaterial);
                        dash.rotation.x = -Math.PI / 2;
                        dash.position.set(xPos, 0.2, zPos + yOffset); // Raised higher for visibility
                        this.scene.add(dash);
                    }
                }
            }
        });

        // Vertical road lane markings - raised higher for visibility
        [-80, 0, 80].forEach(xPos => {
            for (let lane = 1; lane < CONFIG.ROAD.NUM_LANES; lane++) {
                const yOffset = -roadWidth/2 + lane * CONFIG.ROAD.LANE_WIDTH;
                
                for (let dash = 0; dash < numDashes; dash++) {
                    // Skip dashes near intersections
                    const zPos = -roadLength/2 + dash * (dashLength + dashGap);
                    const nearIntersection = this.intersectionPositions.some(intersection => 
                        Math.abs(xPos - intersection.x) < 20 && Math.abs(zPos - intersection.z) < 20
                    );
                    
                    if (!nearIntersection) {
                        const dashGeometry = new THREE.PlaneGeometry(0.2, dashLength);
                        const dash = new THREE.Mesh(dashGeometry, dashMaterial);
                        dash.rotation.x = -Math.PI / 2;
                        dash.position.set(xPos + yOffset, 0.2, zPos); // Raised higher for visibility
                        this.scene.add(dash);
                    }
                }
            }
        });
    }

    createTrafficLightSystem() {
        // Store traffic light references for updates
        this.trafficLights = new Map();
        
        // Create traffic lights at each intersection
        this.intersectionPositions.forEach((pos, index) => {
            const intersectionId = `intersection_${index}`;
            const trafficLightGroup = this.createTrafficLightAtIntersection(pos.x, pos.z, intersectionId);
            this.trafficLights.set(intersectionId, trafficLightGroup);
        });
        
        console.log('🚦 Traffic light system created with', this.trafficLights.size, 'intersections');
    }

    createTrafficLightAtIntersection(x, z, intersectionId) {
        const trafficLightGroup = new THREE.Group();
        const directions = ['north', 'south', 'east', 'west'];
        
        // Fix traffic light positions - place them on the approach side of intersections
        // so vehicles can see them BEFORE entering the intersection
        const lightPositions = {
            // North-bound traffic light (for vehicles coming from south)
            north: { x: x + 8, z: z + 15, rotation: Math.PI }, // Moved to south side, facing north
            // South-bound traffic light (for vehicles coming from north)  
            south: { x: x - 8, z: z - 15, rotation: 0 }, // Moved to north side, facing south
            // East-bound traffic light (for vehicles coming from west)
            east: { x: x - 15, z: z + 8, rotation: -Math.PI / 2 }, // Moved to west side, facing east
            // West-bound traffic light (for vehicles coming from east)
            west: { x: x + 15, z: z - 8, rotation: Math.PI / 2 } // Moved to east side, facing west
        };

        directions.forEach(direction => {
            const lightPos = lightPositions[direction];
            const trafficLight = this.createTrafficLight(lightPos.x, lightPos.z, lightPos.rotation);
            
            // Add direction identifier to the traffic light
            trafficLight.userData = {
                intersectionId: intersectionId,
                direction: direction,
                lights: {}
            };
            
            // Store references to individual light elements for updates
            const lights = trafficLight.children.find(child => child.type === 'Mesh' && child.geometry.type === 'BoxGeometry');
            if (lights) {
                trafficLight.userData.lights = {
                    red: lights.children[0],
                    yellow: lights.children[1],
                    green: lights.children[2]
                };
            }
            
            trafficLightGroup.add(trafficLight);
        });

        this.scene.add(trafficLightGroup);
        return trafficLightGroup;
    }

    createTrafficLight(x, z, rotation) {
        const trafficLight = new THREE.Group();
        
        // Pole - use shared material
        const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 6, 8);
        const pole = new THREE.Mesh(poleGeometry, this.sharedMaterials.trafficLightPole);
        pole.position.y = 3;
        pole.castShadow = false; // Disable shadows to save texture units
        trafficLight.add(pole);
        
        // Traffic light housing - use shared material
        const housingGeometry = new THREE.BoxGeometry(1.2, 3, 0.6);
        const housing = new THREE.Mesh(housingGeometry, this.sharedMaterials.trafficLightPole);
        housing.position.y = 6.5;
        housing.castShadow = false; // Disable shadows to save texture units
        trafficLight.add(housing);
        
        // Traffic light lenses with shared materials
        const lensGeometry = new THREE.SphereGeometry(0.25, 8, 8); // Reduced geometry complexity
        
        // Red light - use shared material
        const redLight = new THREE.Mesh(lensGeometry, this.sharedMaterials.trafficLightOff);
        redLight.position.set(0, 0.8, 0.35);
        redLight.userData = { state: 'red', color: 'red' };
        housing.add(redLight);
        
        // Yellow light - use shared material
        const yellowLight = new THREE.Mesh(lensGeometry, this.sharedMaterials.trafficLightOff);
        yellowLight.position.set(0, 0, 0.35);
        yellowLight.userData = { state: 'yellow', color: 'yellow' };
        housing.add(yellowLight);
        
        // Green light - use shared material
        const greenLight = new THREE.Mesh(lensGeometry, this.sharedMaterials.trafficLightOff);
        greenLight.position.set(0, -0.8, 0.35);
        greenLight.userData = { state: 'green', color: 'green' };
        housing.add(greenLight);
        
        // Position and rotate the entire traffic light
        trafficLight.position.set(x, 0, z);
        trafficLight.rotation.y = rotation;
        
        return trafficLight;
    }

    // Update traffic light states based on traffic controller
    updateTrafficLights(trafficLightStates) {
        if (!trafficLightStates || !this.trafficLights) return;
        
        Object.entries(trafficLightStates).forEach(([intersectionId, intersectionData]) => {
            const trafficLightGroup = this.trafficLights.get(intersectionId);
            if (!trafficLightGroup) return;
            
            // Update each direction's lights
            Object.entries(intersectionData.lights).forEach(([direction, lightData]) => {
                const trafficLight = trafficLightGroup.children.find(child => 
                    child.userData && child.userData.direction === direction
                );
                
                if (trafficLight) {
                    this.updateSingleTrafficLight(trafficLight, lightData.state);
                }
            });
        });
    }

    updateSingleTrafficLight(trafficLight, state) {
        const housing = trafficLight.children.find(child => 
            child.geometry && child.geometry.type === 'BoxGeometry'
        );
        
        if (!housing) return;
        
        // Update all lights to off state first
        housing.children.forEach(light => {
            if (light.userData && light.userData.color) {
                light.material = this.sharedMaterials.trafficLightOff;
            }
        });
        
        // Set the active light based on state
        const activeLight = housing.children.find(light => 
            light.userData && light.userData.color === state
        );
        
        if (activeLight) {
            switch(state) {
                case 'red':
                    activeLight.material = this.sharedMaterials.trafficLightRed;
                    break;
                case 'yellow':
                    activeLight.material = this.sharedMaterials.trafficLightYellow;
                    break;
                case 'green':
                    activeLight.material = this.sharedMaterials.trafficLightGreen;
                    break;
                default:
                    activeLight.material = this.sharedMaterials.trafficLightOff;
            }
        }
    }

    createBaseStation() {
        // Create base station tower using shared material
        const towerGeometry = new THREE.CylinderGeometry(1, 2, 15, 8);
        const tower = new THREE.Mesh(towerGeometry, this.sharedMaterials.baseStation);
        tower.position.set(0, 7.5, 0);
        tower.castShadow = false; // Disable shadows to save texture units
        this.scene.add(tower);
        this.baseStationGroup.add(tower);

        // Create antenna array using shared material
        const antennaGeometry = new THREE.CylinderGeometry(0.2, 0.2, 3, 6);
        
        // Multiple antennas for different network types
        for (let i = 0; i < 4; i++) {
            const antenna = new THREE.Mesh(antennaGeometry, this.sharedMaterials.antenna);
            const angle = (i / 4) * Math.PI * 2;
            antenna.position.set(
                Math.cos(angle) * 1.5,
                16,
                Math.sin(angle) * 1.5
            );
            antenna.castShadow = false; // Disable shadows to save texture units
            this.scene.add(antenna);
            this.baseStationGroup.add(antenna);
        }

        // Create base platform using shared material  
        const platformGeometry = new THREE.CylinderGeometry(3, 3, 1, 8);
        const platform = new THREE.Mesh(platformGeometry, this.sharedMaterials.baseStation);
        platform.position.set(0, 0.5, 0);
        platform.castShadow = false; // Disable shadows to save texture units
        this.scene.add(platform);
        this.baseStationGroup.add(platform);

        console.log('📡 Base station created with optimized shared materials');
    }

    createRSUs() {
        const roadLength = CONFIG.ROAD.LENGTH;
        const numRSUs = CONFIG.RSU.NUM_RSUs * 3; // More RSUs for expanded network
        const roadWidth = CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES;
        
        // Calculate positions for RSUs along the road network
        const rsuPositions = this.calculateRSUPositions(numRSUs);
        
        // Store RSU data for AI agents
        this.rsuData = [];

        // Create RSUs at each position
        this.rsuPositions = rsuPositions.map((rsuPosition, index) => {
            const rsuId = `RSU_${index + 1}`;
            
            // Create visual RSU
            this.createVisualRSU(rsuPosition, rsuId);
            
            // Store RSU data for AI integration
            this.rsuData.push({
                id: rsuId,
                position: rsuPosition,
                coverage: CONFIG.RSU.COVERAGE || 50
            });
            
            return {
                position: rsuPosition,
                id: rsuId,
                rangeIndicators: []
            };
        });
        
        console.log(`📡 Created ${this.rsuPositions.length} RSUs with AI capabilities`);
    }

    calculateRSUPositions(numRSUs) {
        const positions = [];
        const roadPositions = [-80, 0, 80];
        const spacing = 60; // Distance between RSUs
        
        // Place RSUs along horizontal roads
        roadPositions.forEach(zPos => {
            for (let i = 0; i < 3; i++) {
                const x = -120 + i * spacing;
                const offset = CONFIG.RSU.POSITION_X_OFFSET;
                positions.push(new THREE.Vector3(x, 0.1, zPos + offset));
            }
        });
        
        // Place RSUs along vertical roads
        roadPositions.forEach(xPos => {
            for (let i = 0; i < 2; i++) {
                const z = -60 + i * spacing;
                const offset = CONFIG.RSU.POSITION_X_OFFSET;
                positions.push(new THREE.Vector3(xPos + offset, 0.1, z));
            }
        });
        
        return positions.slice(0, numRSUs);
    }

    createVisualRSU(position, rsuId) {
        // Create RSU pole using shared material
        const poleGeometry = new THREE.CylinderGeometry(0.4, 0.4, CONFIG.RSU.HEIGHT, 8);
        const pole = new THREE.Mesh(poleGeometry, this.sharedMaterials.rsu);
        pole.position.set(position.x, CONFIG.RSU.HEIGHT/2, position.z);
        pole.castShadow = false; // Disable shadows to save texture units
        this.scene.add(pole);

        // Create RSU unit using shared material
        const rsuGeometry = new THREE.BoxGeometry(2.5, 1.2, 1.2);
        const rsu = new THREE.Mesh(rsuGeometry, this.sharedMaterials.rsu);
        rsu.position.set(position.x, CONFIG.RSU.HEIGHT + 0.6, position.z);
        rsu.castShadow = false; // Disable shadows to save texture units
        rsu.userData = { rsuId: rsuId };
        this.scene.add(rsu);

        // Create antenna array using shared material
        const antennaGeometry = new THREE.CylinderGeometry(0.15, 0.15, 2.5, 8);
        
        // Multiple antennas for different network types
        for (let i = 0; i < 3; i++) {
            const antenna = new THREE.Mesh(antennaGeometry, this.sharedMaterials.antenna);
            antenna.position.set(
                position.x + (i - 1) * 0.4, 
                CONFIG.RSU.HEIGHT + 2.5, 
                position.z
            );
            antenna.castShadow = false; // Disable shadows to save texture units
            this.scene.add(antenna);
        }

        // Add status LED indicator using shared material
        const ledGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const led = new THREE.Mesh(ledGeometry, this.sharedMaterials.trafficLightGreen);
        led.position.set(position.x, CONFIG.RSU.HEIGHT + 1.2, position.z + 0.7);
        this.scene.add(led);
    }

    update(deltaTime) {
        // Update range indicator animations
        if (this.rangeIndicators) {
            this.rangeIndicators.forEach(indicator => {
                const time = performance.now() * 0.001;
                const pulse = Math.sin(time * indicator.userData.pulseSpeed + indicator.userData.pulsePhase) * 0.2;
                indicator.material.opacity = indicator.userData.baseOpacity + pulse;
            });
        }

        // Update base station position based on keyboard input
        this.updateBaseStationPosition();

        // Update controls
        this.controls.update();
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        if (!this.renderer || !this.scene || !this.camera) {
            console.error('Renderer, scene, or camera not initialized');
            return;
        }
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    createEnvironment() {
        // Create ground plane
        const groundGeometry = new THREE.PlaneGeometry(100, CONFIG.ROAD.LENGTH * 2);
        const groundMaterial = new THREE.MeshPhongMaterial({ 
            color: CONFIG.ENVIRONMENT.GROUND_COLOR,
            shininess: 10,
            specular: 0x111111
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.1;
        this.scene.add(ground);

        // Add buildings on both sides of the road
        const buildingSpacing = CONFIG.ENVIRONMENT.BUILDING_SPACING;
        const numBuildings = Math.floor(CONFIG.ROAD.LENGTH / buildingSpacing);
        const roadWidth = CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES;
        const buildingOffset = roadWidth / 2 + 10; // Distance from road edge

        for (let i = 0; i < numBuildings; i++) {
            // Left side buildings
            this.createBuilding(
                -buildingOffset,
                -CONFIG.ROAD.LENGTH/2 + i * buildingSpacing
            );
            
            // Right side buildings
            this.createBuilding(
                buildingOffset,
                -CONFIG.ROAD.LENGTH/2 + i * buildingSpacing
            );
        }

        // Add street lights
        const lightSpacing = 20;
        const numLights = Math.floor(CONFIG.ROAD.LENGTH / lightSpacing);
        
        for (let i = 0; i < numLights; i++) {
            // Left side lights
            this.createStreetLight(
                -roadWidth/2 - 2,
                -CONFIG.ROAD.LENGTH/2 + i * lightSpacing
            );
            
            // Right side lights
            this.createStreetLight(
                roadWidth/2 + 2,
                -CONFIG.ROAD.LENGTH/2 + i * lightSpacing
            );
        }
    }

    createBuilding(x, z) {
        const building = new THREE.Group();
        
        // Random building dimensions
        const height = Math.random() * 
            (CONFIG.ENVIRONMENT.BUILDING_HEIGHT_RANGE.max - CONFIG.ENVIRONMENT.BUILDING_HEIGHT_RANGE.min) + 
            CONFIG.ENVIRONMENT.BUILDING_HEIGHT_RANGE.min;
        const width = Math.random() * 
            (CONFIG.ENVIRONMENT.BUILDING_WIDTH_RANGE.max - CONFIG.ENVIRONMENT.BUILDING_WIDTH_RANGE.min) + 
            CONFIG.ENVIRONMENT.BUILDING_WIDTH_RANGE.min;
        const depth = Math.random() * 
            (CONFIG.ENVIRONMENT.BUILDING_DEPTH_RANGE.max - CONFIG.ENVIRONMENT.BUILDING_DEPTH_RANGE.min) + 
            CONFIG.ENVIRONMENT.BUILDING_DEPTH_RANGE.min;
        
        // Main building structure
        const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
        const buildingMaterial = new THREE.MeshPhongMaterial({ 
            color: CONFIG.ENVIRONMENT.BUILDING_COLOR,
            shininess: 20,
            specular: 0x222222
        });
        const buildingMesh = new THREE.Mesh(buildingGeometry, buildingMaterial);
        buildingMesh.position.y = height / 2;
        building.add(buildingMesh);
        
        // Add windows
        const windowRows = Math.floor(height / 3);
        const windowCols = Math.floor(width / 2);
        const windowDepth = Math.floor(depth / 2);
        
        const windowGeometry = new THREE.BoxGeometry(1, 1.5, 0.1);
        const windowMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x88ccff,
            transparent: true,
            opacity: 0.7,
            shininess: 90,
            specular: 0x666666
        });
        
        // Randomly light up some windows
        for (let row = 0; row < windowRows; row++) {
            for (let col = 0; col < windowCols; col++) {
                if (Math.random() > 0.3) { // 70% chance of window being lit
                    const window = new THREE.Mesh(windowGeometry, windowMaterial);
                    window.position.set(
                        -width/2 + 1 + col * 2,
                        2 + row * 3,
                        depth/2 + 0.1
                    );
                    building.add(window);
                    
                    // Add light source for lit windows
                    const light = new THREE.PointLight(0xffffee, 0.5, 5);
                    light.position.set(
                        -width/2 + 1 + col * 2,
                        2 + row * 3,
                        depth/2 + 0.2
                    );
                    building.add(light);
                }
            }
        }
        
        building.position.set(x, 0, z);
        this.scene.add(building);
    }

    createStreetLight(x, z) {
        const light = new THREE.Group();
        
        // Pole
        const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 8, 8);
        const poleMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333,
            shininess: 30
        });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = 4;
        light.add(pole);
        
        // Light fixture
        const fixtureGeometry = new THREE.BoxGeometry(1, 0.5, 1);
        const fixtureMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x666666,
            shininess: 50
        });
        const fixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial);
        fixture.position.y = 8;
        light.add(fixture);
        
        // Light source
        const lightSource = new THREE.PointLight(0xffffee, 1, 20);
        lightSource.position.y = 7.5;
        light.add(lightSource);
        
        light.position.set(x, 0, z);
        this.scene.add(light);
    }

    setupKeyboardControls() {
        this.keys = {
            ArrowLeft: false,
            ArrowRight: false,
            ArrowUp: false,
            ArrowDown: false
        };

        window.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.key)) {
                this.keys[e.key] = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.key)) {
                this.keys[e.key] = false;
            }
        });
    }

    updateBaseStationPosition() {
        if (this.keys.ArrowLeft) {
            this.baseStationPosition.x -= this.moveSpeed;
        }
        if (this.keys.ArrowRight) {
            this.baseStationPosition.x += this.moveSpeed;
        }
        if (this.keys.ArrowUp) {
            this.baseStationPosition.z -= this.moveSpeed;
        }
        if (this.keys.ArrowDown) {
            this.baseStationPosition.z += this.moveSpeed;
        }

        // Update base station group position
        this.baseStationGroup.position.copy(this.baseStationPosition);
    }

    createSharedMaterials() {
        return {
            // Ground and environment materials
            ground: new THREE.MeshLambertMaterial({ color: 0x4a5d23 }), // Dark green grass
            road: new THREE.MeshPhongMaterial({ color: 0x2c3e50, shininess: 20, specular: 0x333333 }),
            shoulder: new THREE.MeshPhongMaterial({ color: 0x95a5a6, shininess: 20, specular: 0x333333 }),
            laneMarking: new THREE.MeshBasicMaterial({ color: 0xffffff }),
            
            // Traffic light materials
            trafficLightPole: new THREE.MeshLambertMaterial({ color: 0x444444 }),
            trafficLightRed: new THREE.MeshBasicMaterial({ color: 0xff0000, emissive: 0x330000 }),
            trafficLightYellow: new THREE.MeshBasicMaterial({ color: 0xffff00, emissive: 0x333300 }),
            trafficLightGreen: new THREE.MeshBasicMaterial({ color: 0x00ff00, emissive: 0x003300 }),
            trafficLightOff: new THREE.MeshBasicMaterial({ color: 0x333333 }),
            
            // Base station and RSU materials
            baseStation: new THREE.MeshLambertMaterial({ color: 0x2980b9 }),
            rsu: new THREE.MeshLambertMaterial({ color: 0xe74c3c }),
            antenna: new THREE.MeshLambertMaterial({ color: 0x34495e }),
            
            // Sky material
            sky: new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide })
        };
    }
} 