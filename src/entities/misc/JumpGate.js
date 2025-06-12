import * as THREE from 'three';

export class JumpGate {
  constructor(x, y, targetZoneId, destinationName) {
    this.targetZoneId = targetZoneId;
    this.destinationName = destinationName;
    this.interactionRadius = 20;
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    this.animationTime = 0;
  }

  createMesh() {
    const group = new THREE.Group();
    const ringGeometry = new THREE.TorusGeometry(8, 1, 8, 16);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x00ccff });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    group.add(ring);
    return group;
  }

  update(deltaTime) {
    this.animationTime += deltaTime;
    this.mesh.rotation.z += deltaTime * 0.5;
  }
}
