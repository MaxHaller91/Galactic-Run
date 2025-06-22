import { CombatShip } from './CombatShip.js';
import { WanderBehavior, PursuitBehavior, FleeBehavior, ArriveBehavior, ObstacleAvoidanceBehavior, State } from 'yuka';
import * as THREE from 'three';

export class PirateShip extends CombatShip {
  constructor(name = 'Pirate', world) {
    super(name, world);
    
    // Pirate-specific properties
    this.maxSpeed = 120;
    this.mass = 8;
    this.maxForce = 2500;
    this.currentTarget = null;
    this.panicDistance = 800;
    
    // Steering behaviors
    this.wander = new WanderBehavior();
    this.pursuit = new PursuitBehavior();
    this.flee = new FleeBehavior(null, this.panicDistance);
    this.arrive = new ArriveBehavior();
    this.arrive.deceleration = 3;
    this.obstacleAvoidance = new ObstacleAvoidanceBehavior([]);
    
    // Set distinctive pirate appearance (red)
    this.mesh.material = new THREE.MeshBasicMaterial({ color: 0xff3333 });
    
    // Setup state machine with guards
    if (!this.stateMachine.states.has('PATROL')) {
      this.stateMachine.add('PATROL', new PiratePatrolState());
    }
    if (!this.stateMachine.states.has('RAID')) {
      this.stateMachine.add('RAID', new PirateRaidState());
    }
    if (!this.stateMachine.states.has('FLEE')) {
      this.stateMachine.add('FLEE', new PirateFleeState());
    }
    if (!this.stateMachine.states.has('DOCK')) {
      this.stateMachine.add('DOCK', new PirateDockState());
    }
    
    this.stateMachine.changeTo('PATROL');
    
    console.log(`[PirateShip] ${this.name} created with health: ${this.health}`);
  }
  
  checkSensors() {
    const visibleEntities = this.vision.getVisibleEntities();
    
    // Look for traders to raid
    const traders = visibleEntities.filter(e => e.constructor.name === 'TradeShip');
    if (traders.length > 0 && this.stateMachine.currentState.constructor.name === 'PiratePatrolState') {
      this.currentTarget = traders[0]; // Target closest trader
      this.stateMachine.changeTo('RAID');
      return;
    }
    
    // Look for police that might be chasing us
    const police = visibleEntities.filter(e => e.constructor.name === 'PoliceShip');
    if (police.length > 0) {
      const closestPolice = police[0];
      const distToPolice = this.position.distanceTo(closestPolice.position);
      
      // Flee if police are too close
      if (distToPolice < this.panicDistance && 
          (this.stateMachine.currentState.constructor.name === 'PirateRaidState' ||
           this.stateMachine.currentState.constructor.name === 'PiratePatrolState')) {
        this.currentTarget = closestPolice;
        this.stateMachine.changeTo('FLEE');
      }
    }
    
    // Flee if health is critically low
    if (this.health <= 30 && this.stateMachine.currentState.constructor.name !== 'PirateFleeState') {
      this.stateMachine.changeTo('FLEE');
    }
  }
  
  findNearestStation() {
    const stations = this.world.getStations();
    if (stations.length === 0) return null;
    
    let nearest = stations[0];
    let minDist = this.position.distanceTo(nearest.position);
    
    for (let i = 1; i < stations.length; i++) {
      const dist = this.position.distanceTo(stations[i].position);
      if (dist < minDist) {
        minDist = dist;
        nearest = stations[i];
      }
    }
    return nearest;
  }
}

// PATROL State - Wander around looking for targets
class PiratePatrolState extends State {
  enter(owner) {
    console.log(`[Pirate] ${owner.name} → PATROL`);
    owner.flashStateChange();
    
    owner.steering.clear();
    owner.wander.active = true;
    owner.obstacleAvoidance.active = true;
    owner.steering.add(owner.wander);
    owner.steering.add(owner.obstacleAvoidance);
  }
  
  execute(owner) {
    // State transitions are handled in checkSensors()
  }
  
  exit(owner) {
    owner.wander.active = false;
    owner.obstacleAvoidance.active = false;
  }
}

// RAID State - Pursue traders
class PirateRaidState extends State {
  enter(owner) {
    console.log(`[Pirate] ${owner.name} → RAID targeting ${owner.currentTarget?.name || 'unknown'}`);
    owner.flashStateChange();
    
    owner.steering.clear();
    if (owner.currentTarget) {
      owner.pursuit.target = owner.currentTarget;
      owner.pursuit.active = true;
      owner.obstacleAvoidance.active = true;
      owner.steering.add(owner.pursuit);
      owner.steering.add(owner.obstacleAvoidance);
    }
  }
  
  execute(owner) {
    // Check if target is still valid and in range
    if (!owner.currentTarget || 
        owner.position.distanceTo(owner.currentTarget.position) > 2000) {
      // Lost target, return to patrol
      owner.currentTarget = null;
      owner.stateMachine.changeTo('PATROL');
    }
  }
  
  exit(owner) {
    owner.pursuit.active = false;
    owner.obstacleAvoidance.active = false;
  }
}

// FLEE State - Escape from threats
class PirateFleeState extends State {
  enter(owner) {
    console.log(`[Pirate] ${owner.name} → FLEE (health: ${owner.health})`);
    owner.flashStateChange();
    
    owner.steering.clear();
    
    // Find nearest threat to flee from
    let fleeTarget = owner.currentTarget;
    if (!fleeTarget) {
      // If no specific target, flee to nearest station
      const station = owner.findNearestStation();
      if (station) {
        owner.arrive.target = station.position;
        owner.arrive.active = true;
        owner.steering.add(owner.arrive);
      }
    } else {
      owner.flee.target = fleeTarget;
      owner.flee.active = true;
      owner.steering.add(owner.flee);
    }
    
    owner.obstacleAvoidance.active = true;
    owner.steering.add(owner.obstacleAvoidance);
  }
  
  execute(owner) {
    // Check if we're safe enough to dock
    const station = owner.findNearestStation();
    if (station && owner.position.distanceTo(station.position) < 100) {
      owner.currentTarget = station;
      owner.stateMachine.changeTo('DOCK');
    }
    
    // If health is restored and no immediate threats, return to patrol
    if (owner.health > 60) {
      const visiblePolice = owner.vision.getVisibleEntities()
        .filter(e => e.constructor.name === 'PoliceShip');
      if (visiblePolice.length === 0) {
        owner.stateMachine.changeTo('PATROL');
      }
    }
  }
  
  exit(owner) {
    owner.flee.active = false;
    owner.arrive.active = false;
    owner.obstacleAvoidance.active = false;
  }
}

// DOCK State - Repair at station
class PirateDockState extends State {
  enter(owner) {
    console.log(`[Pirate] ${owner.name} → DOCK`);
    owner.flashStateChange();
    
    owner.steering.clear();
    owner.velocity.set(0, 0, 0);
    owner.dockStart = performance.now();
    
    // Change color to indicate docking
    if (owner.mesh) {
      owner.mesh.material = new THREE.MeshBasicMaterial({ color: 0xffaa44 });
    }
  }
  
  execute(owner) {
    // Repair over time
    if (performance.now() - owner.dockStart > 1000) { // Every second
      owner.health = Math.min(100, owner.health + 10);
      owner.dockStart = performance.now();
    }
    
    // Undock when fully repaired
    if (owner.health >= 100) {
      owner.stateMachine.changeTo('PATROL');
    }
  }
  
  exit(owner) {
    // Restore pirate color
    if (owner.mesh) {
      owner.mesh.material = new THREE.MeshBasicMaterial({ color: 0xff4444 });
    }
  }
}

export { PiratePatrolState, PirateRaidState, PirateFleeState, PirateDockState };
