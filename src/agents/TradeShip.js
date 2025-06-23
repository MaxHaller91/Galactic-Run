import * as YUKA from 'yuka';
import * as THREE from 'three';

export class TradeShip extends YUKA.Vehicle {

  constructor(name = 'Cargo Runner', world) {
    super();
    this.name  = name;
    this.world = world;

    console.log('=== TRADESHIP CONSTRUCTOR ===');
    console.log('Creating TradeShip:', name);
    console.log('World provided:', !!world);

    /* steering behaviours */
    this.seek   = new YUKA.SeekBehavior();
    this.arrive = new YUKA.ArriveBehavior();
    this.arrive.deceleration = 3;

    this.steering.add(this.seek);

    this.maxSpeed = 100;
    this.mass     = 10;
    this.maxForce = 2000; // Higher force for rapid acceleration/deceleration
    
    // Debug bypass test
    this.bypassMode = false; // Set to true to test manual movement

    console.log('Vehicle properties set - maxSpeed:', this.maxSpeed, 'maxForce:', this.maxForce);

    /* state machine */
    this.stateMachine = new YUKA.StateMachine(this);
    this.stateMachine.add('IDLE',    new IdleState());
    this.stateMachine.add('SEEKING', new SeekingState());
    this.stateMachine.add('DOCKING', new DockingState());
    this.stateMachine.changeTo('IDLE');
    
    console.log('State machine initialized, current state:', this.stateMachine.currentState?.constructor.name);

    /* mesh and render sync */
    const geom = new THREE.BoxGeometry(30, 15, 60);
    const mat  = new THREE.MeshNormalMaterial();
    this.mesh = new THREE.Mesh(geom, mat);

    this.setRenderComponent(this.mesh, (entity, renderComponent) => {
      renderComponent.position.copy(entity.position);
      renderComponent.quaternion.copy(entity.rotation);
    });
    
    console.log('TradeShip constructor complete');
    
    // Distress messaging properties
    this.lastDistressTime = 0;
    this.distressRange = 600;
    this.distressCooldown = 3000; // 3 seconds between distress calls
  }

  update(deltaTime) {
    // Call parent Vehicle update first
    super.update(deltaTime);
    
    // Update the state machine to process state transitions
    this.stateMachine.update();
    
    // Check for threats and send distress if needed
    this.checkForThreats();
    
    // Debug physics every frame to see real-time force application
    if (!this.debugFrameCount) this.debugFrameCount = 0;
    this.debugFrameCount++;
    
    // Log steering force and velocity every 30 frames for real-time feedback
    if (this.debugFrameCount % 30 === 0) {
      const steeringForce = this.steering ? this.steering.force : null;
      const forceLength = steeringForce ? steeringForce.length() : 0;
      console.log(`[PHYSICS] ${this.name}: force=${forceLength.toFixed(2)} speed=${this.velocity.length().toFixed(2)} maxSpeed=${this.maxSpeed}`);
      console.log(`[PHYSICS] deltaTime=${deltaTime?.toFixed(6)} position=(${this.position.x.toFixed(1)}, ${this.position.z.toFixed(1)})`);
      
      // Log steering behavior status
      if (this.steering && this.steering.behaviors.length > 0) {
        this.steering.behaviors.forEach(behavior => {
          console.log(`[STEERING] ${behavior.constructor.name}: active=${behavior.active}`);
        });
      }
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
  
  checkForThreats() {
    const now = performance.now();
    
    // Don't spam distress calls
    if (now - this.lastDistressTime < this.distressCooldown) {
      return;
    }
    
    // Get all entities in the world to check for pirates
    const entities = this.world.entityManager.entities;
    const pirates = entities.filter(e => e.constructor.name === 'PirateShip');
    
    for (const pirate of pirates) {
      const distance = this.position.distanceTo(pirate.position);
      
      // If pirate is within distress range, send help message
      if (distance < this.distressRange) {
        this.sendDistressCall(pirate);
        break; // Only send one distress call per check
      }
    }
  }
  
  sendDistressCall(pirate) {
    const police = this.world.entityManager.entities.filter(e => e.constructor.name === 'PoliceShip');
    
    if (police.length > 0) {
      // Find nearest police to send distress to
      let nearestPolice = police[0];
      let minDist = this.position.distanceTo(nearestPolice.position);
      
      for (let i = 1; i < police.length; i++) {
        const dist = this.position.distanceTo(police[i].position);
        if (dist < minDist) {
          minDist = dist;
          nearestPolice = police[i];
        }
      }
      
      // Send distress message with pirate info
      const telegram = {
        sender: this.id,
        receiver: nearestPolice.id,
        message: 'DISTRESS',
        extraInfo: {
          pirate: pirate,
          traderPosition: this.position.clone()
        }
      };
      
      YUKA.MessageDispatcher.instance.dispatchMessage(telegram);
      this.lastDistressTime = performance.now();
      
      console.log(`[TradeShip] ${this.name} sent distress call about ${pirate.name} to ${nearestPolice.name}`);
    }
  }
}

/* ───── States ───────────────────────────────────────────── */

class IdleState extends YUKA.State {
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

class SeekingState extends YUKA.State {
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
      console.log('=== STEERING DEBUG ===');
      console.log('deltaTime:', deltaTime?.toFixed(6) || 'undefined');
      console.log('speed:', owner.velocity.length().toFixed(2), 'distance:', distToTarget.toFixed(2));
      console.log('steering behaviors:', owner.steering.behaviors.length);
      
      // Check steering force calculation
      if (owner.steering.behaviors.length > 0) {
        const steeringForce = new THREE.Vector3();
        for (const behavior of owner.steering.behaviors) {
          if (behavior.active) {
            const force = new THREE.Vector3();
            behavior.calculate(owner, force);
            console.log(`[STEERING] ${behavior.constructor.name} active=${behavior.active} force=${force.length().toFixed(3)} components=(${force.x.toFixed(2)}, ${force.y.toFixed(2)}, ${force.z.toFixed(2)})`);
            steeringForce.add(force);
          } else {
            console.log(`[STEERING] ${behavior.constructor.name} INACTIVE`);
          }
        }
        console.log('[STEERING] Total steering force:', steeringForce.length().toFixed(3));
        // Removed manual force application to adhere to Yuka steering behaviors
      }
    }
    
    // Store for next frame comparison
    owner.lastPosition.copy(owner.position);
    owner.lastVelocity.copy(owner.velocity);
    
    // Switch from Seek to Arrive when getting close
    if (distToTarget < 60 && owner.seek.active) {
      owner.steering.clear();
      owner.seek.active = false;
      owner.arrive.active = true;
      owner.steering.add(owner.arrive);
      console.log('Switching to ArriveBehavior at distance:', distToTarget.toFixed(2));
    }
    
    // Dock when outside station radius, regardless of speed
    if (distToTarget < 100) {
      owner.stateMachine.changeTo('DOCKING');
    }
  }
}

class DockingState extends YUKA.State {
  enter(owner) {
    owner.steering.clear();
    owner.velocity.set(0, 0, 0);
    owner.arrive.active = false;
    owner.seek.active = false;
    if (owner.targetStation) {
      owner.targetStation.reserveDock(owner);
    }
    // Change ship color to red when docking
    if (owner.mesh) {
      owner.mesh.material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    }
    owner.dockStart = performance.now();
  }
  
  execute(owner) {
    if (performance.now() - owner.dockStart > 3000) {
      if (owner.targetStation) {
        owner.targetStation.releaseDock(owner);
      }
      // Reset ship color when leaving docking state
      if (owner.mesh) {
        owner.mesh.material = new THREE.MeshNormalMaterial();
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
