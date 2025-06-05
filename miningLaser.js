import * as THREE from 'three';

export class MiningLaser {
  constructor(scene) {
    this.scene = scene;
    this.isActive = false;
    this.targetPosition = new THREE.Vector3();
    this.startPosition = new THREE.Vector3();

    // Define the points for the line
    const points = [];
    points.push(new THREE.Vector3(0, 0, 0)); // Start point
    points.push(new THREE.Vector3(0, 0, 0)); // End point, will be updated

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x33aaee, // A bright blue-green
      linewidth: 2, // Note: linewidth might not be respected by all GPUs/drivers
      transparent: true,
      opacity: 0.7
    });

    this.line = new THREE.Line(geometry, material);
    this.line.visible = false;
    this.scene.add(this.line);

    // Optional: Add a small particle effect at the impact point later
  }

  activate(startPos, targetPos) {
    this.isActive = true;
    this.line.visible = true;
    this.updatePositions(startPos, targetPos);
  }

  deactivate() {
    this.isActive = false;
    this.line.visible = false;
  }

  updatePositions(startPos, targetPos) {
    if (!this.isActive) return;

    this.startPosition.copy(startPos);
    this.targetPosition.copy(targetPos);

    const positions = this.line.geometry.attributes.position.array;
    positions[0] = this.startPosition.x;
    positions[1] = this.startPosition.y;
    positions[2] = this.startPosition.z; // Keep z at 0 for 2D plane

    positions[3] = this.targetPosition.x;
    positions[4] = this.targetPosition.y;
    positions[5] = this.targetPosition.z; // Keep z at 0

    this.line.geometry.attributes.position.needsUpdate = true;
    this.line.geometry.computeBoundingSphere(); // Important for visibility
  }

  update() {
    if (!this.isActive) return;

    // Optional: Add pulsation or other dynamic effects to the laser
    this.line.material.opacity = 0.5 + Math.sin(Date.now() * 0.01) * 0.2;

    // If the target moves or the ship moves, updatePositions should be called from game logic
  }
}