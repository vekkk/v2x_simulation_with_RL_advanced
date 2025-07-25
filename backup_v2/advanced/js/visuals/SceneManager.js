import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.128.0/examples/jsm/controls/OrbitControls.js';
import { CONFIG } from '../config/config.js';

export class SceneManager {
    constructor() {
        this.textures = {};
        this.baseStationGroup = new THREE.Group();  // Create a group for base station components
        this.baseStationPosition = new THREE.Vector3(0, 0, 0);
        this.moveSpeed = 1;  // Speed of movement
        this.setupKeyboardControls();
        
        // Bind the initialize method to this instance
        this.initialize = this.initialize.bind(this);
    }

    async initialize() {
        await this.loadAssets();
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupControls();
        this.setupLighting();
        this.createRoad();
        this.createBaseStation();
        this.createRSUs();
        return this;
    }

    async loadAssets() {
        const textureLoader = new THREE.TextureLoader();
        
        // Load ground texture
        this.textures.ground = await new Promise((resolve) => {
            textureLoader.load('assets/Landscape_2.jpeg', (texture) => {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(20, 20); // Adjust these values based on your texture size
                resolve(texture);
            });
        });

        // Load skybox texture
        this.textures.sky = await new Promise((resolve) => {
            textureLoader.load('assets/Landscape_2.jpeg', (texture) => {
                resolve(texture);
            });
        });
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
        
        // Create skybox
        const skyGeometry = new THREE.SphereGeometry(500, 60, 40);
        const skyMaterial = new THREE.MeshBasicMaterial({
            map: this.textures.sky,
            side: THREE.BackSide
        });
        const skybox = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(skybox);
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
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        // Add directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        
        // Configure shadow properties
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        
        this.scene.add(directionalLight);
    }

    createRoad() {
        // Create ground plane with urban texture first
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            map: this.textures.ground,
            roughness: 0.8,
            metalness: 0.2
        });
        const groundPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(CONFIG.ROAD.LENGTH * 2, CONFIG.ROAD.LENGTH * 2),
            groundMaterial
        );
        groundPlane.rotation.x = -Math.PI / 2;
        groundPlane.position.y = -0.1;
        groundPlane.receiveShadow = true;
        this.scene.add(groundPlane);

        // Create extended road length for better visual transition
        const extendedRoadLength = CONFIG.ROAD.LENGTH * 1.5;

        // Create main horizontal road
        const roadGeometry = new THREE.PlaneGeometry(
            CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES,
            extendedRoadLength
        );
        const roadMaterial = new THREE.MeshPhongMaterial({
            color: 0x2c3e50,
            shininess: 20,
            specular: 0x333333
        });
        const mainRoad = new THREE.Mesh(roadGeometry, roadMaterial);
        mainRoad.rotation.x = -Math.PI / 2;
        mainRoad.position.y = 0.01;
        mainRoad.receiveShadow = true;
        this.scene.add(mainRoad);

        // Create vertical road
        const verticalRoad = new THREE.Mesh(roadGeometry, roadMaterial);
        verticalRoad.rotation.x = -Math.PI / 2;
        verticalRoad.rotation.z = Math.PI / 2;
        verticalRoad.position.y = 0.01;
        verticalRoad.receiveShadow = true;
        this.scene.add(verticalRoad);

        // Create shoulders for both roads
        const shoulderGeometry = new THREE.PlaneGeometry(CONFIG.ROAD.SHOULDER_WIDTH, extendedRoadLength);
        const shoulderMaterial = new THREE.MeshPhongMaterial({
            color: 0x95a5a6,
            shininess: 20,
            specular: 0x333333
        });

        // Main road shoulders
        const leftShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
        leftShoulder.rotation.x = -Math.PI / 2;
        leftShoulder.position.set(
            -CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES / 2 - CONFIG.ROAD.SHOULDER_WIDTH / 2,
            0.01,
            0
        );
        this.scene.add(leftShoulder);

        const rightShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
        rightShoulder.rotation.x = -Math.PI / 2;
        rightShoulder.position.set(
            CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES / 2 + CONFIG.ROAD.SHOULDER_WIDTH / 2,
            0.01,
            0
        );
        this.scene.add(rightShoulder);

        // Vertical road shoulders
        const topShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
        topShoulder.rotation.x = -Math.PI / 2;
        topShoulder.rotation.z = Math.PI / 2;
        topShoulder.position.set(
            0,
            0.01,
            -CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES / 2 - CONFIG.ROAD.SHOULDER_WIDTH / 2
        );
        this.scene.add(topShoulder);

        const bottomShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
        bottomShoulder.rotation.x = -Math.PI / 2;
        bottomShoulder.rotation.z = Math.PI / 2;
        bottomShoulder.position.set(
            0,
            0.01,
            CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES / 2 + CONFIG.ROAD.SHOULDER_WIDTH / 2
        );
        this.scene.add(bottomShoulder);

        // Create lane markers for both roads
        const numDashes = Math.floor(extendedRoadLength / (CONFIG.ROAD.DASH_LENGTH + CONFIG.ROAD.DASH_GAP));
        
        // Main road lane markers
        for (let i = 1; i < CONFIG.ROAD.NUM_LANES; i++) {
            const x = -CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES / 2 + i * CONFIG.ROAD.LANE_WIDTH;
            
            for (let j = 0; j < numDashes; j++) {
                const dashGeometry = new THREE.PlaneGeometry(0.2, CONFIG.ROAD.DASH_LENGTH);
                const dashMaterial = new THREE.MeshPhongMaterial({
                    color: 0xffffff,
                    shininess: 50,
                    specular: 0x666666
                });
                const dash = new THREE.Mesh(dashGeometry, dashMaterial);
                dash.rotation.x = -Math.PI / 2;
                const z = -extendedRoadLength / 2 + j * (CONFIG.ROAD.DASH_LENGTH + CONFIG.ROAD.DASH_GAP) + CONFIG.ROAD.DASH_LENGTH / 2;
                dash.position.set(x, 0.02, z);
                this.scene.add(dash);
            }
        }

        // Add directional arrows to show lane directions
        this.createDirectionalArrows(extendedRoadLength);

        // Vertical road lane markers
        for (let i = 1; i < CONFIG.ROAD.NUM_LANES; i++) {
            const z = -CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES / 2 + i * CONFIG.ROAD.LANE_WIDTH;
            
            for (let j = 0; j < numDashes; j++) {
                const dashGeometry = new THREE.PlaneGeometry(0.2, CONFIG.ROAD.DASH_LENGTH);
                const dashMaterial = new THREE.MeshPhongMaterial({
                    color: 0xffffff,
                    shininess: 50,
                    specular: 0x666666
                });
                const dash = new THREE.Mesh(dashGeometry, dashMaterial);
                dash.rotation.x = -Math.PI / 2;
                dash.rotation.z = Math.PI / 2;
                const x = -extendedRoadLength / 2 + j * (CONFIG.ROAD.DASH_LENGTH + CONFIG.ROAD.DASH_GAP) + CONFIG.ROAD.DASH_LENGTH / 2;
                dash.position.set(x, 0.02, z);
                this.scene.add(dash);
            }
        }

        // Add road transition elements at the edges
        this.createRoadTransition(0, extendedRoadLength/2, 0); // North
        this.createRoadTransition(0, -extendedRoadLength/2, Math.PI); // South
        this.createRoadTransition(extendedRoadLength/2, 0, -Math.PI/2); // East
        this.createRoadTransition(-extendedRoadLength/2, 0, Math.PI/2); // West
    }

    createRoadTransition(x, z, rotation) {
        const transitionGroup = new THREE.Group();
        
        // Create transition ramp
        const rampGeometry = new THREE.PlaneGeometry(
            CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES + CONFIG.ROAD.SHOULDER_WIDTH * 2,
            10
        );
        const rampMaterial = new THREE.MeshPhongMaterial({
            color: 0x2c3e50,
            shininess: 20,
            specular: 0x333333
        });
        const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
        ramp.rotation.x = -Math.PI / 2;
        ramp.position.y = 0.01;
        transitionGroup.add(ramp);

        // Add transition markings
        const markingGeometry = new THREE.PlaneGeometry(0.3, 5);
        const markingMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            shininess: 50,
            specular: 0x666666
        });
        
        for (let i = 1; i < CONFIG.ROAD.NUM_LANES; i++) {
            const marking = new THREE.Mesh(markingGeometry, markingMaterial);
            marking.rotation.x = -Math.PI / 2;
            marking.position.set(
                -CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES / 2 + i * CONFIG.ROAD.LANE_WIDTH,
                0.02,
                0
            );
            transitionGroup.add(marking);
        }

        transitionGroup.position.set(x, 0, z);
        transitionGroup.rotation.y = rotation;
        this.scene.add(transitionGroup);
    }

    createTrafficLight(x, z, rotation) {
        const trafficLight = new THREE.Group();
        
        // Pole
        const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 6, 8);
        const poleMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333,
            shininess: 30
        });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = 3;
        trafficLight.add(pole);
        
        // Traffic light housing
        const housingGeometry = new THREE.BoxGeometry(1, 2, 0.5);
        const housingMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x666666,
            shininess: 50
        });
        const housing = new THREE.Mesh(housingGeometry, housingMaterial);
        housing.position.y = 6;
        trafficLight.add(housing);
        
        // Traffic light lenses
        const lensGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        
        // Red light
        const redMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });
        const redLight = new THREE.Mesh(lensGeometry, redMaterial);
        redLight.position.set(0, 0.5, 0.3);
        housing.add(redLight);
        
        // Yellow light
        const yellowMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.5
        });
        const yellowLight = new THREE.Mesh(lensGeometry, yellowMaterial);
        yellowLight.position.set(0, 0, 0.3);
        housing.add(yellowLight);
        
        // Green light
        const greenMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.5
        });
        const greenLight = new THREE.Mesh(lensGeometry, greenMaterial);
        greenLight.position.set(0, -0.5, 0.3);
        housing.add(greenLight);
        
        trafficLight.position.set(x, 0, z);
        trafficLight.rotation.y = rotation;
        this.scene.add(trafficLight);
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

    createBaseStation() {
        const roadWidth = CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES;
        
        // Set initial position
        this.baseStationPosition.set(
            -roadWidth/2 - CONFIG.BASE_STATION.POSITION_X_OFFSET,
            0,
            0
        );

        // Create base station tower
        const towerGeometry = new THREE.BoxGeometry(2, 40, 2);
        const towerMaterial = new THREE.MeshPhongMaterial({
            color: 0x7f8c8d,
            shininess: 30,
            specular: 0x444444
        });
        const tower = new THREE.Mesh(towerGeometry, towerMaterial);
        tower.position.set(0, 20, 0);  // Position relative to group
        tower.castShadow = true;
        this.baseStationGroup.add(tower);

        // Create base station antenna
        const antennaGeometry = new THREE.CylinderGeometry(0.5, 0.5, 5, 8);
        const antennaMaterial = new THREE.MeshPhongMaterial({
            color: 0x95a5a6,
            shininess: 50,
            specular: 0x666666
        });
        const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
        antenna.position.set(0, 42.5, 0);  // Position relative to group
        antenna.castShadow = true;
        this.baseStationGroup.add(antenna);

        // Set the group's position
        this.baseStationGroup.position.copy(this.baseStationPosition);
        this.scene.add(this.baseStationGroup);
    }

    createRSUs() {
        const roadLength = CONFIG.ROAD.LENGTH;
        const numRSUs = CONFIG.RSU.NUM_RSUs;
        const roadWidth = CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES;
        const xOffset = roadWidth/2 + CONFIG.RSU.POSITION_X_OFFSET;
        
        // Calculate positions for RSUs
        const positions = [];
        for (let i = 0; i < numRSUs; i++) {
            const z = -roadLength/2 + (i + 0.5) * (roadLength / numRSUs);
            positions.push(new THREE.Vector3(xOffset, 0.1, z));
        }

        // Create RSUs at each position
        this.rsuPositions = positions.map(rsuPosition => {
            // Create RSU pole - made thicker
            const poleGeometry = new THREE.CylinderGeometry(0.4, 0.4, CONFIG.RSU.HEIGHT, 8);
            const poleMaterial = new THREE.MeshPhongMaterial({
                color: 0x7f8c8d,
                shininess: 30,
                specular: 0x444444
            });
            const pole = new THREE.Mesh(poleGeometry, poleMaterial);
            pole.position.set(rsuPosition.x, CONFIG.RSU.HEIGHT/2, rsuPosition.z);
            pole.castShadow = true;
            this.scene.add(pole);

            // Create RSU unit - made larger
            const rsuGeometry = new THREE.BoxGeometry(2, 1, 1);
            const rsuMaterial = new THREE.MeshPhongMaterial({
                color: 0x34495e,
                shininess: 50,
                specular: 0x666666
            });
            const rsu = new THREE.Mesh(rsuGeometry, rsuMaterial);
            rsu.position.set(rsuPosition.x, CONFIG.RSU.HEIGHT + 0.5, rsuPosition.z);
            rsu.castShadow = true;
            this.scene.add(rsu);

            // Create antenna - made taller and thicker
            const antennaGeometry = new THREE.CylinderGeometry(0.2, 0.2, 2, 8);
            const antennaMaterial = new THREE.MeshPhongMaterial({
                color: 0x95a5a6,
                shininess: 50,
                specular: 0x666666
            });
            const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
            antenna.position.set(rsuPosition.x, CONFIG.RSU.HEIGHT + 2, rsuPosition.z);
            antenna.castShadow = true;
            this.scene.add(antenna);

            // Create network range indicators with reduced opacity
            const rangeIndicators = [];
            for (const netTypeKey in CONFIG.NETWORK.TYPES) {
                const netType = CONFIG.NETWORK.TYPES[netTypeKey];
                const rangeGeometry = new THREE.RingGeometry(netType.range, netType.range + 2, 64);
                const rangeMaterial = new THREE.MeshBasicMaterial({
                    color: netType.color,
                    transparent: true,
                    opacity: 0.2, // Reduced opacity for better visibility
                    side: THREE.DoubleSide
                });
                const rangeIndicator = new THREE.Mesh(rangeGeometry, rangeMaterial);
                rangeIndicator.rotation.x = -Math.PI / 2;
                rangeIndicator.position.copy(rsuPosition);
                rangeIndicator.userData = {
                    baseOpacity: 0.2, // Reduced base opacity
                    pulseSpeed: 0.5 + Math.random() * 0.5,
                    pulsePhase: Math.random() * Math.PI * 2
                };
                this.scene.add(rangeIndicator);
                rangeIndicators.push(rangeIndicator);
            }

            return {
                position: rsuPosition,
                rangeIndicators: rangeIndicators
            };
        });
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

    createDirectionalArrows(roadLength) {
        const arrowSpacing = 30;
        const numArrows = Math.floor(roadLength / arrowSpacing);
        const totalRoadWidth = CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES;
        
        for (let i = 0; i < numArrows; i++) {
            const z = -roadLength / 2 + i * arrowSpacing + 10;
            
            // Create arrows for each lane
            for (let lane = 0; lane < CONFIG.ROAD.NUM_LANES; lane++) {
                const x = -totalRoadWidth / 2 + CONFIG.ROAD.LANE_WIDTH / 2 + lane * CONFIG.ROAD.LANE_WIDTH;
                const isForwardLane = lane < CONFIG.ROAD.NUM_LANES / 2;
                
                // Create arrow shape
                const arrowGroup = new THREE.Group();
                
                // Arrow body
                const bodyGeometry = new THREE.PlaneGeometry(0.5, 2);
                const bodyMaterial = new THREE.MeshPhongMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.8
                });
                const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
                body.rotation.x = -Math.PI / 2;
                arrowGroup.add(body);
                
                // Arrow head
                const headGeometry = new THREE.ConeGeometry(0.4, 1, 3);
                const headMaterial = new THREE.MeshPhongMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.8
                });
                const head = new THREE.Mesh(headGeometry, headMaterial);
                head.rotation.x = -Math.PI / 2;
                
                if (isForwardLane) {
                    // Forward direction arrow
                    head.position.set(0, 0, 1);
                    head.rotation.z = 0;
                } else {
                    // Backward direction arrow
                    head.position.set(0, 0, -1);
                    head.rotation.z = Math.PI;
                    arrowGroup.rotation.y = Math.PI;
                }
                
                arrowGroup.add(head);
                arrowGroup.position.set(x, 0.03, z);
                this.scene.add(arrowGroup);
            }
        }
    }
} 