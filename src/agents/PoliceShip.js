import { CombatShip } from './CombatShip.js';
import { WanderBehavior, PursuitBehavior, ArriveBehavior, OffsetPursuitBehavior, ObstacleAvoidanceBehavior, State } from 'yuka';
import * as THREE from 'three';

export class PoliceShip extends CombatShip {
  constructor(name = 'Police', world, formationLeader = null) {
    super(name, world);
    
    // Police-specific properties
    this.maxSpeed = formationLeader ? 140 : 120; // Followers 20% faster for formation
    this.mass = 12;
    this.maxForce = 3000;
    this.currentTarget = null;
    this.formationLeader = formationLeader;
    this.predictionTime = 2; // seconds for pursuit
    this.chaseStartTime = 0;
    this.maxChaseTime = 10000; // 10 seconds max chase
    
    // Steering behaviors
    this.wander = new WanderBehavior();
    this.pursuit = new PursuitBehavior();
    this.pursuit.maxPrediction = this.predictionTime;
    this.arrive = new ArriveBehavior();
    this.arrive.deceleration = 3;
    this.offsetPursuit = new OffsetPursuitBehavior();
    this.obstacleAvoidance = new ObstacleAvoidanceBehavior([]);
    
    // Set distinctive police appearance (blue)
    this.mesh.material = new THREE.MeshBasicMaterial({ color: 0x3366ff });
    
    // Setup state machine with guards
    if (!this.stateMachine.states.has('PATROL')) {
      this.stateMachine.add('PATROL', new PolicePatrolState());
    }
    if (!this.stateMachine.states.has('CHASE')) {
      this.stateMachine.add('CHASE', new PoliceChaseState());
    }
    if (!this.stateMachine.states.has('RETURN')) {
      this.stateMachine.add('RETURN', new PoliceReturnState());
    }
    
    this.stateMachine.changeTo('PATROL');
    
    console.log(`[PoliceShip] ${this.name} created${formationLeader ? ' (wingman)' : ' (leader)'}`);
  }
  
  checkSensors() {
    const visibleEntities = this.vision.getVisibleEntities();
    
    // Look for pirates to chase
    const pirates = visibleEntities.filter(e => e.constructor.name === 'PirateShip');
    if (pirates.length > 0 && this.stateMachine.currentState.constructor.name === 'PolicePatrolState') {
      this.currentTarget = pirates[0]; // Target closest pirate
      this.stateMachine.changeTo('CHASE');
      return;
    }
  }
  
  // Handle distress messages
  onMessage(owner, telegram) {
    if (telegram.message === 'DISTRESS' && 
        this.stateMachine.currentState.constructor.name === 'PolicePatrolState') {
      if (telegram.extraInfo && telegram.extraInfo.pirate) {
        this.currentTarget = telegram.extraInfo.pirate;
        this.stateMachine.changeTo('CHASE');
        console.log(`[Police] ${this.name} responding to distress call`);
      }
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

// PATROL State - Wander or follow formation leader
class PolicePatrolState extends State {
  enter(owner) {
    console.log(`[Police] ${owner.name} → PATROL`);
    owner.flashStateChange();
    
    owner.steering.clear();
    
    if (owner.formationLeader) {
      // Formation flying with offset pursuit
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 200, // Random X offset
        0,
        (Math.random() - 0.5) * 200  // Random Z offset
      );
      owner.offsetPursuit.leader = owner.formationLeader;
      owner.offsetPursuit.offset = offset;
      owner.offsetPursuit.active = true;
      owner.steering.add(owner.offsetPursuit);
    } else {
      // Leader or solo patrol - wander
      owner.wander.active = true;
      owner.steering.add(owner.wander);
    }
    
    owner.obstacleAvoidance.active = true;
    owner.steering.add(owner.obstacleAvoidance);
  }
  
  execute(owner) {
    // State transitions are handled in checkSensors() and onMessage()
  }
  
  exit(owner) {
    owner.wander.active = false;
    owner.offsetPursuit.active = false;
    owner.obstacleAvoidance.active = false;
  }
  
  onMessage(owner, telegram) {
    return owner.onMessage(owner, telegram);
  }
}

// CHASE State - Pursue pirates
class PoliceChaseState extends State {
  enter(owner) {
    console.log(`[Police] ${owner.name} → CHASE targeting ${owner.currentTarget?.name || 'unknown'}`);
    owner.flashStateChange();
    owner.chaseStartTime = performance.now();
    
    owner.steering.clear();
    if (owner.currentTarget) {
      owner.pursuit.target = owner.currentTarget;
      owner.pursuit.active = true;
      owner.obstacleAvoidance.active = true;
      owner.steering.add(owner.pursuit);
      owner.steering.add(owner.obstacleAvoidance);
    }
    
    // Change color to indicate chase mode
    if (owner.mesh) {
      owner.mesh.material = new THREE.MeshBasicMaterial({ color: 0x8888ff });
    }
  }
  
  execute(owner) {
    const chaseTime = performance.now() - owner.chaseStartTime;
    
    // Check if target is still valid and in range
    if (!owner.currentTarget || 
        owner.position.distanceTo(owner.currentTarget.position) > 3000 ||
        chaseTime > owner.maxChaseTime) {
      // Lost target or timeout, return to base
      owner.currentTarget = null;
      owner.stateMachine.changeTo('RETURN');
      return;
    }
    
    // Check if pirate is destroyed (health <= 0)
    if (owner.currentTarget.health <= 0) {
      console.log(`[Police] ${owner.name} target neutralized`);
      owner.currentTarget = null;
      owner.stateMachine.changeTo('RETURN');
    }
  }
  
  exit(owner) {
    owner.pursuit.active = false;
    owner.obstacleAvoidance.active = false;
    
    // Restore police color
    if (owner.mesh) {
      owner.mesh.material = new THREE.MeshBasicMaterial({ color: 0x4444ff });
    }
  }
}

// RETURN State - Return to nearest station
class PoliceReturnState extends State {
  enter(owner) {
    console.log(`[Police] ${owner.name} → RETURN`);
    owner.flashStateChange();
    
    owner.steering.clear();
    
    const station = owner.findNearestStation();
    if (station) {
      owner.arrive.target = station.position;
      owner.arrive.active = true;
      owner.obstacleAvoidance.active = true;
      owner.steering.add(owner.arrive);
      owner.steering.add(owner.obstacleAvoidance);
    }
  }
  
  execute(owner) {
    // Check if we've reached the station
    const station = owner.findNearestStation();
    if (station && owner.position.distanceTo(station.position) < 150) {
      // Arrived at station, return to patrol
      owner.stateMachine.changeTo('PATROL');
    }
  }
  
  exit(owner) {
    owner.arrive.active = false;
    owner.obstacleAvoidance.active = false;
  }
}

export { PolicePatrolState, PoliceChaseState, PoliceReturnState };
