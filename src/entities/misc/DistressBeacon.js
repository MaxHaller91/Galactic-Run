import * as THREE from 'three';

export class DistressBeacon {
  constructor(x, y) {
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    this.timeLeft = 30;
    this.responded = false;
  }

  createMesh() {
    const geometry = new THREE.SphereGeometry(2, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 });
    const beacon = new THREE.Mesh(geometry, material);
    beacon.userData = { pulseTimer: 0 };
    return beacon;
  }

  update(deltaTime) {
    this.timeLeft -= deltaTime;
    this.mesh.userData.pulseTimer += deltaTime * 4;
    const pulse = Math.sin(this.mesh.userData.pulseTimer) * 0.3 + 0.7;
    this.mesh.material.opacity = pulse;
    this.mesh.scale.setScalar(0.8 + pulse * 0.4);
    return this.timeLeft > 0;
  }
}
