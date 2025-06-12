import * as THREE from 'three';

export class PirateStation {
  constructor(position) {
    this.position = position;
    this.mesh = this.createMesh();
    this.type = 'pirate';
    this.resources = { materials: 0, food: 0 };
  }

  createMesh() {
    const geometry = new THREE.BoxGeometry(4, 4, 4);
    const material = new THREE.MeshBasicMaterial({ color: 0x441111 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.position);
    return mesh;
  }

  update() {}
}
