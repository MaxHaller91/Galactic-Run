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
    this.arrive.deceleration = 2;

    this.steering.add(this.seek);
    this.steering.add(this.arrive);

    this.maxSpeed = 60;
    this.mass     = 40;

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
    owner.arrive.active = true;
    owner.seek.active = true;
  }
  
  execute(owner) {
    if (owner.position.distanceTo(owner.target.position) < 25 && owner.velocity.length() <= 2) {
      owner.stateMachine.changeTo('DOCKING');
    }
  }
}

class DockingState extends State {
  enter(owner) {
    owner.steering.deactivateAll();
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

/* export states for behaviourPacks if needed */
export { IdleState as TradeShipIdleState, SeekingState, DockingState };
