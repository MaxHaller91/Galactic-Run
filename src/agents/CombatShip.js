import { Vehicle, Vision, Regulator, MessageDispatcher, StateMachine, Smoother } from 'yuka';
import * as THREE from 'three';

export class CombatShip extends Vehicle {
  constructor(name, world) {
    super();
    this.name  = name;
    this.world = world;
    this.health = 100;

    /* perception */
    this.vision = new Vision(this, 1200, Math.PI);   // 360° in the X-Z plane
    this.visionReg = new Regulator(4);               // 10 Hz checks

    /* mesh, bounding sphere, smoother */
    const geom = new THREE.ConeGeometry(12, 32, 8);
    geom.computeBoundingSphere();
    this.boundingRadius = geom.boundingSphere.radius;

    this.mesh = new THREE.Mesh(geom, new THREE.MeshNormalMaterial());
    this.mesh.matrixAutoUpdate = false;
    this.setRenderComponent(this.mesh, (e, r) => {
      r.position.copy(e.position);
      r.quaternion.copy(e.rotation);
    });

    this.smoother = new Smoother(30);

    /* state machine */
    this.stateMachine = new StateMachine(this);
  }

  update(dt) {
    super.update(dt);
    this.stateMachine.update();

    if (this.visionReg.update(dt)) this.checkSensors();

    /* allow telegrams created earlier this frame to arrive */
    MessageDispatcher.instance.dispatchDelayedMessages();
  }

  /* forward messages to state machine */
  handleMessage(telegram) {
    return this.stateMachine.handleMessage(telegram);
  }

  /* default no-op, overridden in subclasses */
  checkSensors() {}

  /* utility method for debug state changes */
  flashStateChange() {
    if (this.mesh) {
      const originalColor = this.mesh.material.color.getHex();
      this.mesh.material.color.setHex(0xff8800);
      setTimeout(() => {
        if (this.mesh) this.mesh.material.color.setHex(originalColor);
      }, 200);
    }
  }
}
