import * as THREE from 'three';

export class Asteroid {
  constructor(x, y, size) {
    this.size = size;
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    this.maxOre = Math.floor(size * 10);
    this.currentOre = this.maxOre;
    this.rotationSpeed = (Math.random() - 0.5) * 0.01;
  }

  createMesh() {
    const geometry = new THREE.IcosahedronGeometry(this.size, 0);
    const material = new THREE.MeshBasicMaterial({ color: 0x888888 });
    return new THREE.Mesh(geometry, material);
  }

  update(deltaTime) {
    this.mesh.rotation.z += this.rotationSpeed;
  }
}
