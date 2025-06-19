import { SeekBehavior, ArriveBehavior } from 'yuka';
import { KeepInBoundsBehavior } from './KeepInBoundsBehavior.js';
import { TradeShipIdleState, SeekingState, DockingState } from '../agents/TradeShip.js';

/**
 * Applies the Trader behavior pack to a ship entity.
 * @param {Object} ship - The ship entity to apply the behavior pack to.
 */
export function TraderPack(ship) {
  // Add steering behaviors
  ship.seekBehavior = new SeekBehavior();
  ship.arriveBehavior = new ArriveBehavior();
  ship.arriveBehavior.deceleration = 2;
  ship.arriveBehavior.arrivalTolerance = 60;
  ship.keepInBoundsBehavior = new KeepInBoundsBehavior(1800);
  
  // Attach TradeShip FSM
  ship.stateMachine.add('SEEKING', new SeekingState());
  ship.stateMachine.add('DOCKING', new DockingState());
  ship.stateMachine.changeTo('IDLE');
}

/**
 * Stub for future Pirate behavior pack.
 * @param {Object} ship - The ship entity to apply the behavior pack to.
 */
export function PiratePack(ship) {
  // Future implementation for pirate behaviors
  console.log(`PiratePack applied to ${ship.name} - stub for future implementation`);
}

/**
 * Stub for future Police behavior pack.
 * @param {Object} ship - The ship entity to apply the behavior pack to.
 */
export function PolicePack(ship) {
  // Future implementation for police behaviors
  console.log(`PolicePack applied to ${ship.name} - stub for future implementation`);
}
