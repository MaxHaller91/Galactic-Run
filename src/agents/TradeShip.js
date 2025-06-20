import { Vehicle, SeekBehavior, ArriveBehavior, State, StateMachine } from 'yuka';
import * as THREE from 'three';

export class TradeShip extends Vehicle {

  constructor(name = 'Cargo Runner', world) {
    super();
    this.name  = name;
    this.world = world;

    /* steering behaviours */
    this.seek   = new SeekBehavior();
    this.arrive = new ArriveBehavior();
    this.arrive.deceleration = 40;

    this.steering.add(this.seek);

    this.maxSpeed = 500;
    this.mass     = 1;

    /* state machine */
    this.stateMachine = new StateMachine(this);
    this.stateMachine.add('IDLE',    new IdleState());
    this.stateMachine.add('SEEKING', new SeekingState());
    this.stateMachine.add('DOCKING', new DockingState());
    this.stateMachine.changeTo('IDLE');

    /* mesh and render sync */
    const geom = new THREE.BoxGeometry(20, 20, 40);
    const mat  = new THREE.MeshNormalMaterial();
    this.mesh = new THREE.Mesh(geom, mat);

    this.setRenderComponent(this.mesh, (entity, renderComponent) => {
      renderComponent.position.copy(entity.position);
      renderComponent.quaternion.copy(entity.rotation);
    });
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
    const stations = owner.world.getStations();
    if (stations.length > 0) {
      owner.setTargetStation(owner.pickNextStation(stations));
      owner.stateMachine.changeTo('SEEKING');
    }
  }
}

class SeekingState extends State {
  enter(owner) {
    owner.steering.clear();
    owner.arrive.active = true;
    owner.steering.add(owner.arrive);
    if (owner.target) {
      const offset = randomOffset();
      owner.arrive.target.copy(owner.target.position).add(offset);
    }
  }
  
  execute(owner) {
    console.log('speed:', owner.velocity.length().toFixed(2));
    if (owner.position.distanceTo(owner.arrive.target) < 25 && owner.velocity.length() <= 2) {
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
