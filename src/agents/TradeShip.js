import { Vehicle, SeekBehavior, ArriveBehavior, State, StateMachine } from 'yuka';
import * as THREE from 'three';

export class TradeShip extends Vehicle {

  constructor(name = 'Cargo Runner', world) {
    super();
    this.name  = name;
    this.world = world;

    console.log('=== TRADESHIP CONSTRUCTOR ===');
    console.log('Creating TradeShip:', name);
    console.log('World provided:', !!world);

    /* steering behaviours */
    this.seek   = new SeekBehavior();
    this.arrive = new ArriveBehavior();
    this.arrive.deceleration = 40;

    this.steering.add(this.seek);

    this.maxSpeed = 500;
    this.mass     = 1;
    this.maxForce = 1000; // High force for rapid acceleration/deceleration
    
    // Debug bypass test
    this.bypassMode = false; // Set to true to test manual movement

    console.log('Vehicle properties set - maxSpeed:', this.maxSpeed, 'maxForce:', this.maxForce);

    /* state machine */
    this.stateMachine = new StateMachine(this);
    this.stateMachine.add('IDLE',    new IdleState());
    this.stateMachine.add('SEEKING', new SeekingState());
    this.stateMachine.add('DOCKING', new DockingState());
    this.stateMachine.changeTo('IDLE');
    
    console.log('State machine initialized, current state:', this.stateMachine.currentState?.constructor.name);

    /* mesh and render sync */
    const geom = new THREE.BoxGeometry(20, 20, 40);
    const mat  = new THREE.MeshNormalMaterial();
    this.mesh = new THREE.Mesh(geom, mat);

    this.setRenderComponent(this.mesh, (entity, renderComponent) => {
      renderComponent.position.copy(entity.position);
      renderComponent.quaternion.copy(entity.rotation);
    });
    
    console.log('TradeShip constructor complete');
  }

  update(deltaTime) {
    // Call parent Vehicle update first
    super.update(deltaTime);
    
    // Debug physics every 60 frames (~1 second)
    if (!this.debugFrameCount) this.debugFrameCount = 0;
    this.debugFrameCount++;
    
    if (this.debugFrameCount % 60 === 0) {
      console.log(`[PHYSICS] ${this.name}: force=${this.lastAppliedForce?.toFixed(3) || 'none'} speed=${this.velocity.length().toFixed(2)} target=(${this.arrive.target.x.toFixed(1)}, ${this.arrive.target.y.toFixed(1)}, ${this.arrive.target.z.toFixed(1)})`);
      console.log(`[PHYSICS] deltaTime=${deltaTime?.toFixed(6)} position=(${this.position.x.toFixed(1)}, ${this.position.z.toFixed(1)})`);
    }
  }

  applyForce(force) {
    // Log applied forces for debugging
    this.lastAppliedForce = force.length();
    if (this.debugFrameCount % 60 === 0) {
      console.log(`[FORCE] Applied force magnitude: ${force.length().toFixed(3)} components: (${force.x.toFixed(3)}, ${force.y.toFixed(3)}, ${force.z.toFixed(3)})`);
    }
    
    // Call parent applyForce
    super.applyForce(force);
  }

  setTargetStation(station) {
    this.target = station;
    this.seek.target.copy(station.position);
    this.arrive.target.copy(station.position);
  }

  pickNextStation(stations) {
    if (stations.length === 0) return null;
    let closestStation = stations[0];
    let minDistance = this.position.distanceTo(closestStation.position);
    
    for (let i = 1; i < stations.length; i++) {
      const distance = this.position.distanceTo(stations[i].position);
      if (distance < minDistance) {
        minDistance = distance;
        closestStation = stations[i];
      }
    }
    return closestStation;
  }
}

/* ───── States ───────────────────────────────────────────── */

class IdleState extends State {
  enter(owner) {
    console.log('=== IDLE STATE ENTERED ===');
    console.log('Owner:', owner.name);
    console.log('World available:', !!owner.world);
    
    const stations = owner.world.getStations();
    console.log('Stations found:', stations.length);
    
    if (stations.length > 0) {
      const targetStation = owner.pickNextStation(stations);
      console.log('Target station selected:', targetStation?.name || 'unnamed');
      owner.setTargetStation(targetStation);
      console.log('Changing to SEEKING state');
      owner.stateMachine.changeTo('SEEKING');
    } else {
      console.log('No stations found, staying in IDLE');
    }
  }
  
  execute(owner) {
    // Check periodically if stations are available
    if (owner.frameCount % 120 === 0) { // every 2 seconds
      console.log('IDLE state execute - checking for stations...');
      const stations = owner.world.getStations();
      if (stations.length > 0) {
        console.log('Stations now available, transitioning to SEEKING');
        owner.setTargetStation(owner.pickNextStation(stations));
        owner.stateMachine.changeTo('SEEKING');
      }
    }
  }
}

class SeekingState extends State {
  enter(owner) {
    owner.steering.clear();
    owner.lastPosition = owner.position.clone();
    owner.lastVelocity = owner.velocity.clone();
    owner.frameCount = 0;
    if (owner.target) {
      const offset = randomOffset();
      owner.arrive.target.copy(owner.target.position).add(offset);
      owner.seek.target.copy(owner.target.position).add(offset);
    }
    // Start with seek behavior for acceleration
    owner.seek.active = true;
    owner.steering.add(owner.seek);
    console.log('=== SEEKING STATE ENTERED ===');
    console.log('maxSpeed:', owner.maxSpeed, 'maxForce:', owner.maxForce, 'mass:', owner.mass);
    console.log('steering behaviors count:', owner.steering.behaviors.length);
  }
  
  execute(owner, deltaTime) {
    owner.frameCount++;
    const distToTarget = owner.position.distanceTo(owner.arrive.target);
    
    // Calculate movement since last frame
    const positionDelta = owner.position.distanceTo(owner.lastPosition);
    const velocityDelta = owner.velocity.distanceTo(owner.lastVelocity);
    
    // Log detailed physics every 60 frames (roughly once per second)
    if (owner.frameCount % 60 === 0) {
      console.log('=== PHYSICS DEBUG ===');
      console.log('deltaTime:', deltaTime?.toFixed(6) || 'undefined');
      console.log('speed:', owner.velocity.length().toFixed(2), 'distance:', distToTarget.toFixed(2));
      console.log('position delta:', positionDelta.toFixed(3), 'velocity delta:', velocityDelta.toFixed(3));
      console.log('position:', owner.position.x.toFixed(1), owner.position.y.toFixed(1), owner.position.z.toFixed(1));
      console.log('velocity:', owner.velocity.x.toFixed(2), owner.velocity.y.toFixed(2), owner.velocity.z.toFixed(2));
      
      // Check steering force
      if (owner.steering.behaviors.length > 0) {
        const steeringForce = new THREE.Vector3();
        for (const behavior of owner.steering.behaviors) {
          if (behavior.active) {
            const force = new THREE.Vector3();
            behavior.calculate(owner, force);
            console.log(`${behavior.constructor.name} force:`, force.length().toFixed(3));
            steeringForce.add(force);
          }
        }
        console.log('total steering force:', steeringForce.length().toFixed(3));
      }
    }
    
    // Store for next frame comparison
    owner.lastPosition.copy(owner.position);
    owner.lastVelocity.copy(owner.velocity);
    
    // Switch from Seek to Arrive when getting close
    if (distToTarget < 100 && owner.seek.active) {
      owner.steering.clear();
      owner.seek.active = false;
      owner.arrive.active = true;
      owner.steering.add(owner.arrive);
      console.log('Switching to ArriveBehavior at distance:', distToTarget.toFixed(2));
    }
    
    // Dock when very close and slow
    if (distToTarget < 25 && owner.velocity.length() <= 2) {
      owner.stateMachine.changeTo('DOCKING');
    }
  }
}

class DockingState extends State {
  enter(owner) {
    owner.steering.clear();
    owner.velocity.set(0, 0, 0);
    owner.arrive.active = false;
    owner.seek.active = false;
    if (owner.targetStation) {
      owner.targetStation.reserveDock(owner);
    }
    owner.dockStart = performance.now();
  }
  
  execute(owner) {
    if (performance.now() - owner.dockStart > 3000) {
      if (owner.targetStation) {
        owner.targetStation.releaseDock(owner);
      }
      owner.stateMachine.changeTo('IDLE');
    }
  }
}

/* Helper function for random offset around station */
function randomOffset() {
  const radius = 30;
  return new THREE.Vector3(
    (Math.random() - 0.5) * radius,
    0,
    (Math.random() - 0.5) * radius
  );
}

/* export states for behaviourPacks if needed */
export { IdleState as TradeShipIdleState, SeekingState, DockingState };
