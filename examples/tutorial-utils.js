/**
 * Shared utilities for Yuka tutorial scenes
 */

/**
 * Sets up camera navigation with OrbitControls
 * @param {THREE.Camera} camera - Three.js camera
 * @param {THREE.WebGLRenderer} renderer - Three.js renderer
 * @returns {THREE.OrbitControls} The controls instance
 */
export function setupCameraNavigation(camera, renderer) {
    // Set better default camera position for overview
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
    
    // Create and configure OrbitControls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 20;
    
    return controls;
}

/**
 * Updates camera controls in animation loop
 * @param {THREE.OrbitControls} controls - The controls to update
 */
export function updateCameraControls(controls) {
    if (controls) {
        controls.update();
    }
}

/**
 * Creates standardized info panel HTML with navigation instructions
 * @param {string} title - Main title for the tutorial
 * @param {string} description - Description of the behavior
 * @returns {string} HTML content for info panel
 */
export function createInfoPanel(title, description = '') {
    return `
        ${title}<br>
        ${description ? description + '<br>' : ''}
        <small>Mouse: Left=Orbit, Right=Pan, Scroll=Zoom</small>
    `;
}

/**
 * Standard Three.js scene setup for tutorials
 * @returns {Object} Object containing scene, camera, renderer
 */
export function createStandardScene() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    return { scene, camera, renderer };
}
