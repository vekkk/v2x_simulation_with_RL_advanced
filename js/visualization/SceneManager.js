console.log('🔍 DEBUG: SceneManager.js starting to load...');

import * as THREE from 'https://cdn.skypack.dev/three@0.160.0';
console.log('🔍 DEBUG: SceneManager - THREE imported successfully');

import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';
console.log('🔍 DEBUG: SceneManager - OrbitControls imported successfully');

import { CONFIG } from '../config/config.js';

export class SceneManager {
    constructor() {
        console.log('🔍 DEBUG: SceneManager constructor starting...');
        this.scene = new THREE.Scene();
        this.setupRenderer();
        this.setupCamera();
        this.setupLighting();
        this.setupRoad();
        this.setupBaseStation();
        this.setupMouseControls();
        console.log('🔍 DEBUG: SceneManager constructor completed successfully');
    }

    setupRenderer() {
        console.log('Setting up renderer...');
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0x87CEEB); // Sky blue background
        document.body.appendChild(this.renderer.domElement);
        console.log('Renderer setup complete');
    }

    setupCamera() {
        console.log('Setting up camera...');
        const { FOV, NEAR, FAR, POSITION } = CONFIG.SCENE.CAMERA;
        this.camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, NEAR, FAR);
        this.camera.position.set(POSITION.x, POSITION.y, POSITION.z);
        this.camera.lookAt(0, 0, 0);
        console.log('Camera setup complete');
    }

    setupLighting() {
        console.log('Setting up lighting...');
        // Ambient light
        const { color, intensity } = CONFIG.SCENE.LIGHTING.AMBIENT;
        const ambientLight = new THREE.AmbientLight(color, intensity);
        this.scene.add(ambientLight);

        // Directional light
        const { color: dirColor, intensity: dirIntensity, position } = CONFIG.SCENE.LIGHTING.DIRECTIONAL;
        this.directionalLight = new THREE.DirectionalLight(dirColor, dirIntensity);
        this.directionalLight.position.set(position.x, position.y, position.z);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 500;
        this.directionalLight.shadow.camera.left = -100;
        this.directionalLight.shadow.camera.right = 100;
        this.directionalLight.shadow.camera.top = 100;
        this.directionalLight.shadow.camera.bottom = -100;
        this.scene.add(this.directionalLight);
        console.log('Lighting setup complete');
    }

    setupRoad() {
        console.log('Setting up road...');
        const totalWidth = CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES;
        const extendedRoadLength = CONFIG.ROAD.LENGTH * 1.5;
        
        // Create ground plane
        const groundGeometry = new THREE.PlaneGeometry(CONFIG.ROAD.LENGTH * 2, CONFIG.ROAD.LENGTH * 2);
        const groundMaterial = new THREE.MeshPhongMaterial({ 
            color: CONFIG.SCENE.COLORS.GROUND,
            shininess: 10,
            specular: 0x111111
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.1;
        this.scene.add(ground);
        
        // Main horizontal road
        const roadGeometry = new THREE.PlaneGeometry(totalWidth, extendedRoadLength);
        const roadMaterial = new THREE.MeshPhongMaterial({ 
            color: CONFIG.SCENE.COLORS.ROAD,
            shininess: 20,
            specular: 0x333333
        });
        this.road = new THREE.Mesh(roadGeometry, roadMaterial);
        this.road.rotation.x = -Math.PI / 2;
        this.road.receiveShadow = true;
        this.scene.add(this.road);

        // Vertical road
        const verticalRoad = new THREE.Mesh(roadGeometry, roadMaterial);
        verticalRoad.rotation.x = -Math.PI / 2;
        verticalRoad.rotation.z = Math.PI / 2;
        verticalRoad.receiveShadow = true;
        this.scene.add(verticalRoad);

        // Road shoulders
        const shoulderGeometry = new THREE.PlaneGeometry(CONFIG.ROAD.SHOULDER_WIDTH, extendedRoadLength);
        const shoulderMaterial = new THREE.MeshPhongMaterial({ 
            color: CONFIG.SCENE.COLORS.SHOULDER,
            shininess: 20,
            specular: 0x333333
        });

        // Main road shoulders
        const leftShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
        leftShoulder.rotation.x = -Math.PI / 2;
        leftShoulder.position.set(-totalWidth / 2 - CONFIG.ROAD.SHOULDER_WIDTH / 2, 0.01, 0);
        this.scene.add(leftShoulder);

        const rightShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
        rightShoulder.rotation.x = -Math.PI / 2;
        rightShoulder.position.set(totalWidth / 2 + CONFIG.ROAD.SHOULDER_WIDTH / 2, 0.01, 0);
        this.scene.add(rightShoulder);

        // Vertical road shoulders
        const topShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
        topShoulder.rotation.x = -Math.PI / 2;
        topShoulder.rotation.z = Math.PI / 2;
        topShoulder.position.set(0, 0.01, -totalWidth / 2 - CONFIG.ROAD.SHOULDER_WIDTH / 2);
        this.scene.add(topShoulder);

        const bottomShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
        bottomShoulder.rotation.x = -Math.PI / 2;
        bottomShoulder.rotation.z = Math.PI / 2;
        bottomShoulder.position.set(0, 0.01, totalWidth / 2 + CONFIG.ROAD.SHOULDER_WIDTH / 2);
        this.scene.add(bottomShoulder);

        // Lane markers for both roads
        this.setupLaneMarkers(totalWidth, extendedRoadLength);
        console.log('Road setup complete');
    }

    setupLaneMarkers(totalWidth, roadLength) {
        console.log('Setting up lane markers...');
        const numDashes = Math.floor(roadLength / (CONFIG.ROAD.DASH_LENGTH + CONFIG.ROAD.DASH_GAP));
        
        // Main road lane markers
        for (let i = 1; i < CONFIG.ROAD.NUM_LANES; i++) {
            const x = -totalWidth / 2 + i * CONFIG.ROAD.LANE_WIDTH;
            
            for (let j = 0; j < numDashes; j++) {
                const dashGeometry = new THREE.PlaneGeometry(0.2, CONFIG.ROAD.DASH_LENGTH);
                const dashMaterial = new THREE.MeshPhongMaterial({ 
                    color: CONFIG.SCENE.COLORS.LANE_MARKER,
                    shininess: 50,
                    specular: 0x666666
                });
                const dash = new THREE.Mesh(dashGeometry, dashMaterial);
                dash.rotation.x = -Math.PI / 2;
                const z = -roadLength / 2 + j * (CONFIG.ROAD.DASH_LENGTH + CONFIG.ROAD.DASH_GAP) + CONFIG.ROAD.DASH_LENGTH / 2;
                dash.position.set(x, 0.02, z);
                this.scene.add(dash);
            }
        }

        // Vertical road lane markers
        for (let i = 1; i < CONFIG.ROAD.NUM_LANES; i++) {
            const z = -totalWidth / 2 + i * CONFIG.ROAD.LANE_WIDTH;
            
            for (let j = 0; j < numDashes; j++) {
                const dashGeometry = new THREE.PlaneGeometry(0.2, CONFIG.ROAD.DASH_LENGTH);
                const dashMaterial = new THREE.MeshPhongMaterial({ 
                    color: CONFIG.SCENE.COLORS.LANE_MARKER,
                    shininess: 50,
                    specular: 0x666666
                });
                const dash = new THREE.Mesh(dashGeometry, dashMaterial);
                dash.rotation.x = -Math.PI / 2;
                dash.rotation.z = Math.PI / 2;
                const x = -roadLength / 2 + j * (CONFIG.ROAD.DASH_LENGTH + CONFIG.ROAD.DASH_GAP) + CONFIG.ROAD.DASH_LENGTH / 2;
                dash.position.set(x, 0.02, z);
                this.scene.add(dash);
            }
        }
        console.log('Lane markers setup complete');
    }

    setupBaseStation() {
        console.log('Setting up base station...');
        const totalWidth = CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES;
        const rsuOffset = CONFIG.ROAD.LENGTH * 0.75; // Place it 75% down the x-axis
        
        // Create RSU pole
        const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 4, 8);
        const poleMaterial = new THREE.MeshPhongMaterial({
            color: CONFIG.SCENE.COLORS.BASE_STATION,
            shininess: 30,
            specular: 0x444444
        });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.set(rsuOffset, 2, 0);
        pole.castShadow = true;
        this.scene.add(pole);

        // Create RSU unit
        const rsuGeometry = new THREE.BoxGeometry(1, 0.5, 0.5);
        const rsuMaterial = new THREE.MeshPhongMaterial({
            color: CONFIG.SCENE.COLORS.BASE_STATION,
            shininess: 50,
            specular: 0x666666
        });
        const rsu = new THREE.Mesh(rsuGeometry, rsuMaterial);
        rsu.position.set(rsuOffset, 4.25, 0);
        rsu.castShadow = true;
        this.scene.add(rsu);

        // Create antenna
        const antennaGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
        const antennaMaterial = new THREE.MeshPhongMaterial({
            color: CONFIG.SCENE.COLORS.ANTENNA,
            shininess: 50,
            specular: 0x666666
        });
        const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
        antenna.position.set(rsuOffset, 5, 0);
        antenna.castShadow = true;
        this.scene.add(antenna);

        // Create network range indicators
        const rsuPosition = new THREE.Vector3(rsuOffset, 0.1, 0);
        
        // Primary range circle
        const primaryRangeGeometry = new THREE.RingGeometry(
            CONFIG.NETWORK.RANGE - 0.5,
            CONFIG.NETWORK.RANGE + 0.5,
            64
        );
        const primaryRangeMaterial = new THREE.MeshBasicMaterial({
            color: CONFIG.SCENE.COLORS.COMMUNICATION.SUCCESS,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        const primaryRangeIndicator = new THREE.Mesh(primaryRangeGeometry, primaryRangeMaterial);
        primaryRangeIndicator.rotation.x = -Math.PI / 2;
        primaryRangeIndicator.position.copy(rsuPosition);
        this.scene.add(primaryRangeIndicator);

        // Extended range circle
        const extendedRangeGeometry = new THREE.RingGeometry(
            CONFIG.NETWORK.MAX_RANGE - 0.5,
            CONFIG.NETWORK.MAX_RANGE + 0.5,
            64
        );
        const extendedRangeMaterial = new THREE.MeshBasicMaterial({
            color: CONFIG.SCENE.COLORS.COMMUNICATION.FAILURE,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide
        });
        const extendedRangeIndicator = new THREE.Mesh(extendedRangeGeometry, extendedRangeMaterial);
        extendedRangeIndicator.rotation.x = -Math.PI / 2;
        extendedRangeIndicator.position.copy(rsuPosition);
        this.scene.add(extendedRangeIndicator);

        console.log('Base station setup complete');
    }

    setupMouseControls() {
        console.log('Setting up mouse controls...');
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 100;
        this.controls.maxPolarAngle = Math.PI / 2;
        console.log('Mouse controls setup complete');
    }

    render() {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    handleResize() {
        console.log('Handling window resize...');
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        console.log('Window resize handled');
    }

    getBaseStationPosition() {
        return this.baseStation.position.clone();
    }
} 