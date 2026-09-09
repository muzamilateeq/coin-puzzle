let coinIdCounter = 0;

export class Coin {
  constructor(type) {
    this.id = ++coinIdCounter;
    this.type = type;
  }
}

export function resetCoinCounter() {
  coinIdCounter = 0;
}
