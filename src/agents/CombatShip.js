import * as YUKA from 'yuka';
import * as THREE from 'three';

export class CombatShip extends YUKA.Vehicle {
  constructor(name, world) {
    super();
    this.name  = name;
    this.world = world;
    this.health = 100;

    /* perception */
    this.vision = new YUKA.Vision(this, 1200, Math.PI);   // 360° in the X-Z plane
    this.visionReg = new YUKA.Regulator(4);               // 10 Hz checks

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

    this.smoother = new YUKA.Smoother(30);

    /* state machine */
    this.stateMachine = new YUKA.StateMachine(this);
  }

  update(dt) {
    super.update(dt);
    this.stateMachine.update();

    // Throttled perception with crash-proof guards
    if (this.visionReg?.update?.(dt)) {
      this.checkSensors();
    }
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
