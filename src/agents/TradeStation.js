import { BaseStation } from './BaseStation.js';

export class TradeStation extends BaseStation {
  constructor(name) {
    super(name, 'trade');
    // Can add specific trade logic later
  }
}
