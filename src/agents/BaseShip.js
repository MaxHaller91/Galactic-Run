import { Vehicle, StateMachine } from 'yuka';

export class BaseShip extends Vehicle {
  constructor(name, faction = 'neutral') {
    super();
    this.name = name;
    this.faction = faction;
    this.stateMachine = new StateMachine(this);
    this.stateMachine.add('IDLE', {
      enter: () => console.log(`[${this.name}] is now IDLE`),
      execute: () => {},
      exit: () => {}
    });
    this.stateMachine.changeTo('IDLE');
  }

  update(delta) {
    super.update(delta);
    this.stateMachine.update();
  }
}
