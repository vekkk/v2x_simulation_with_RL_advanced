import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG } from '../config/config.js';

export class SceneManager {
    constructor() {
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupControls();
        this.setupLighting();
        this.createRoad();
        this.createBaseStation();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 50, 100);
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
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
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
        // Create main road
        const roadGeometry = new THREE.PlaneGeometry(
            CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES,
            CONFIG.ROAD.LENGTH
        );
        const roadMaterial = new THREE.MeshPhongMaterial({
            color: 0x2c3e50,
            shininess: 20,
            specular: 0x333333
        });
        const road = new THREE.Mesh(roadGeometry, roadMaterial);
        road.rotation.x = -Math.PI / 2;
        road.receiveShadow = true;
        this.scene.add(road);

        // Create shoulders
        const shoulderGeometry = new THREE.PlaneGeometry(CONFIG.ROAD.SHOULDER_WIDTH, CONFIG.ROAD.LENGTH);
        const shoulderMaterial = new THREE.MeshPhongMaterial({
            color: 0x95a5a6,
            shininess: 20,
            specular: 0x333333
        });

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

        // Create lane markers
        const numDashes = Math.floor(CONFIG.ROAD.LENGTH / (CONFIG.ROAD.DASH_LENGTH + CONFIG.ROAD.DASH_GAP));
        
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
                const z = -CONFIG.ROAD.LENGTH / 2 + j * (CONFIG.ROAD.DASH_LENGTH + CONFIG.ROAD.DASH_GAP) + CONFIG.ROAD.DASH_LENGTH / 2;
                dash.position.set(x, 0.02, z);
                this.scene.add(dash);
            }
        }

        // Create ground plane
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const groundPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(CONFIG.ROAD.LENGTH * 2, CONFIG.ROAD.LENGTH * 2),
            groundMaterial
        );
        groundPlane.rotation.x = -Math.PI / 2;
        groundPlane.position.y = -0.1;
        this.scene.add(groundPlane);
    }

    createBaseStation() {
        // Create tower
        const towerGeometry = new THREE.BoxGeometry(2, 20, 2);
        const towerMaterial = new THREE.MeshPhongMaterial({
            color: 0x7f8c8d,
            shininess: 30,
            specular: 0x444444
        });
        this.tower = new THREE.Mesh(towerGeometry, towerMaterial);
        this.tower.position.set(
            CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES / 2 + CONFIG.BASE_STATION.POSITION_X_OFFSET,
            10,
            0
        );
        this.tower.castShadow = true;
        this.scene.add(this.tower);

        // Create antenna
        const antennaGeometry = new THREE.CylinderGeometry(0.5, 0.5, 5, 8);
        const antennaMaterial = new THREE.MeshPhongMaterial({
            color: 0x95a5a6,
            shininess: 50,
            specular: 0x666666
        });
        const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
        antenna.position.set(
            CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES / 2 + CONFIG.BASE_STATION.POSITION_X_OFFSET,
            22.5,
            0
        );
        antenna.castShadow = true;
        this.scene.add(antenna);

        // Create network range indicators
        const baseStationPosition = this.tower.position.clone();
        baseStationPosition.y = 0.1;

        for (const netTypeKey in CONFIG.NETWORK.TYPES) {
            const netType = CONFIG.NETWORK.TYPES[netTypeKey];
            const rangeGeometry = new THREE.RingGeometry(netType.range, netType.range + 0.5, 64);
            const rangeMaterial = new THREE.MeshBasicMaterial({
                color: netType.color,
                transparent: true,
                opacity: 0.1,
                side: THREE.DoubleSide
            });
            const rangeIndicator = new THREE.Mesh(rangeGeometry, rangeMaterial);
            rangeIndicator.rotation.x = -Math.PI / 2;
            rangeIndicator.position.copy(baseStationPosition);
            this.scene.add(rangeIndicator);
        }

        // Add max range indicator
        const maxRangeGeometry = new THREE.RingGeometry(
            CONFIG.NETWORK.MAX_TOTAL_RANGE,
            CONFIG.NETWORK.MAX_TOTAL_RANGE + 0.5,
            64
        );
        const maxRangeMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide
        });
        const maxRangeIndicator = new THREE.Mesh(maxRangeGeometry, maxRangeMaterial);
        maxRangeIndicator.rotation.x = -Math.PI / 2;
        maxRangeIndicator.position.copy(baseStationPosition);
        this.scene.add(maxRangeIndicator);
    }

    updateControls() {
        this.controls.update();
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        this.updateControls();
        this.renderer.render(this.scene, this.camera);
    }
} 