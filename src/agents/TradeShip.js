import { GameEntity, StateMachine, Vector3 } from 'yuka';
import world from '../core/World.js';

/**
 * TradeShip class representing a trading ship entity.
 */
export class TradeShip extends GameEntity {
  constructor(name, world) {
    super();
    this.name = name;
    this.world = world;
    this.position = new Vector3();
    this.velocity = new Vector3();
    this.maxSpeed = 60;
    this.mass = 40;
    this.stateMachine = new StateMachine(this);
    this.currentTarget = null;
  }

  update(delta) {
    this.stateMachine.update();
    super.update(delta);
  }
}

/**
 * Idle state for TradeShip.
 */
class TradeShipIdleState {
  enter(owner) {
    console.log(`[${owner.name}] entered IDLE state`);
    owner.velocity.set(0, 0, 0);
  }

  execute(owner) {
    // Look for a target station to trade with
    const stations = owner.world.getStations();
    if (stations.length > 0) {
      const targetStation = stations[Math.floor(Math.random() * stations.length)];
      owner.currentTarget = targetStation;
      owner.stateMachine.changeTo('SEEKING');
    }
  }

  exit(owner) {
    console.log(`[${owner.name}] exited IDLE state`);
  }
}

/**
 * Seeking state for TradeShip.
 */
class SeekingState {
  enter(owner) {
    console.log(`[${owner.name}] entered SEEKING state`);
    if (owner.currentTarget) {
      owner.seekBehavior.target = owner.currentTarget.position;
    }
  }

  execute(owner) {
    if (owner.currentTarget) {
      const distance = owner.position.distanceTo(owner.currentTarget.position);
      if (distance < owner.arriveBehavior.arrivalTolerance) {
        owner.stateMachine.changeTo('DOCKING');
      } else {
        // Apply seeking behavior
        const steeringForce = new Vector3();
        owner.seekBehavior.calculate(owner, steeringForce);
        // Apply arrive behavior to slow down near target
        if (distance < owner.arriveBehavior.arrivalTolerance * 2) {
          owner.arriveBehavior.target = owner.currentTarget.position;
          owner.arriveBehavior.calculate(owner, steeringForce);
        }
        // Apply keep in bounds behavior
        owner.keepInBoundsBehavior.calculate(owner, steeringForce);
        // Update velocity based on steering force
        const acceleration = steeringForce.divideScalar(owner.mass);
        owner.velocity.add(acceleration.multiplyScalar(owner.deltaTime));
        if (owner.velocity.length() > owner.maxSpeed) {
          owner.velocity.normalize().multiplyScalar(owner.maxSpeed);
        }
        owner.position.add(owner.velocity.multiplyScalar(owner.deltaTime));
      }
    } else {
      owner.stateMachine.changeTo('IDLE');
    }
  }

  exit(owner) {
    console.log(`[${owner.name}] exited SEEKING state`);
  }
}

/**
 * Docking state for TradeShip.
 */
class DockingState {
  enter(owner) {
    console.log(`[${owner.name}] entered DOCKING state`);
    owner.velocity.set(0, 0, 0);
  }

  execute(owner) {
    // Simulate docking for a short period
    setTimeout(() => {
      owner.stateMachine.changeTo('IDLE');
      owner.currentTarget = null;
    }, 2000); // 2 seconds docking simulation
  }

  exit(owner) {
    console.log(`[${owner.name}] exited DOCKING state`);
  }
}

// Export states for use in behavior packs
export { TradeShipIdleState, SeekingState, DockingState };
