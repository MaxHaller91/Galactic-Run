import { BaseShip } from './BaseShip.js';

export class TradeShip extends BaseShip {
  constructor(name) {
    super(name, 'trade');
    // Will seek station later, for now remains idle
  }
}
