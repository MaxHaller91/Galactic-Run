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
}

/* ───── States ───────────────────────────────────────────── */

class IdleState extends State {
  enter(owner) {
    const stations = owner.world.getStations();
    owner.setTargetStation(stations[Math.floor(Math.random() * stations.length)]);
    owner.stateMachine.changeTo('SEEKING');
  }
}

class SeekingState extends State {
  execute(owner) {
    if (owner.position.distanceTo(owner.target.position) < 60) {
      owner.stateMachine.changeTo('DOCKING');
    }
  }
}

class DockingState extends State {
  enter(owner) {
    owner.steering.deactivateAll();
    setTimeout(() => {
      owner.steering.activateAll();
      owner.stateMachine.changeTo('IDLE');
    }, 2000);
  }
}

/* export states for behaviourPacks if needed */
export { IdleState as TradeShipIdleState, SeekingState, DockingState };
