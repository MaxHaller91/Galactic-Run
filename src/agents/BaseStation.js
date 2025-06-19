import { GameEntity, StateMachine, State } from 'yuka';

export class BaseStation extends GameEntity {
  constructor(name, faction = 'neutral') {
    super();
    this.name = name;
    this.faction = faction;
    this.stateMachine = new StateMachine(this);
    this.stateMachine.add('IDLE', new IdleState());
    this.stateMachine.changeTo('IDLE');
  }

  update(delta) {
    this.stateMachine.update();
  }
}

class IdleState extends State {
  enter(owner) {
    console.log(`[${owner.name}] is now IDLE`);
  }

  execute(owner) {
    // Placeholder for idle behavior
  }

  exit(owner) {
    console.log(`[${owner.name}] exited IDLE`);
  }
}
