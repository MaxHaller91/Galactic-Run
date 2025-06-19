import { GameEntity } from 'yuka';
import * as THREE from 'three';

export class BaseStation extends GameEntity {
  constructor(name = 'Base Station', position = new THREE.Vector3()) {
    super();
    this.name = name;
    this.position.copy(position);
    this.dockedShips = new Set();
  }
  
  reserveDock(ship) {
    this.dockedShips.add(ship);
  }
  
  releaseDock(ship) {
    this.dockedShips.delete(ship);
  }
}
