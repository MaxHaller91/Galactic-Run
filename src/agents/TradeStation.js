import { BaseStation } from './BaseStation.js';
import * as THREE from 'three';

export class TradeStation extends BaseStation {
  constructor(name, position = new THREE.Vector3(0, 0, 0)) {
    super(name, 'trade');
    this.position = position;
    // Can add specific trade logic later
  }
}
