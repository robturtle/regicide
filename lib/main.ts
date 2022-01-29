// 规则：https://www.badgersfrommars.com/assets/RegicideRulesA4.pdf?v=2

import { question } from 'readline-sync';

type Suit = 'C' | 'H' | 'D' | 'S';
type NormalRank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
type BossRank = 'J' | 'Q' | 'K';
type Rank = NormalRank | BossRank;

type Card = {
  suit: Suit,
  rank: Rank,
};

function p(card: Card): string {
  const map = {
    'C': '♣️',
    'H': '♥️',
    'D': '♦️',
    'S': '♠️',
  };
  var rank;
  if (card.rank === 1) {
    rank = 'A';
  } else if (card.rank === 10) {
    rank = 'X';
  } else {
    rank = card.rank;
  }
  return `${map[card.suit]}${rank}`;
}

type BossCard = {
  suit: Suit,
  rank: BossRank,
}

const SUITS: Suit[] = ['C', 'H', 'D', 'S'];
const NORMAL_RANKS: NormalRank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const BOSS_RANKS: BossRank[] = ['J', 'Q', 'K'];

function strength(card: Card): number {
  if (typeof (card.rank) === 'number') {
    return card.rank;
  } else if (card.rank === 'J') {
    return 10;
  } else if (card.rank === 'Q') {
    return 15;
  } else if (card.rank === 'K') {
    return 20;
  } else {
    throw 'bad card!';
  }
}

function shuffle<T>(array: Array<T>): Array<T> {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function generateBosses(): BossCard[] {
  return BOSS_RANKS.flatMap((bossRank) => shuffle(SUITS).map((suit) => ({
    suit, rank: bossRank
  })));
}

function generateDeck(): Card[] {
  return shuffle(NORMAL_RANKS.flatMap((rank) => SUITS.map((suit) => ({ rank, suit }))));
}

class Boss {
  card: BossCard;
  life: number;
  power: number;

  constructor(card: BossCard) {
    this.card = card;
    if (card.rank === 'J') {
      this.life = 20;
      this.power = 10;
    } else if (card.rank === 'Q') {
      this.life = 30;
      this.power = 15;
    } else if (card.rank === 'K') {
      this.life = 40;
      this.power = 20;
    } else {
      throw 'wrong card rank!';
    }
  }
}

type EffectType = 'restore' | 'draw' | 'strike' | 'defend';

function effect(suit: Suit): EffectType {
  if (suit === 'H') return 'restore';
  if (suit === 'D') return 'draw';
  if (suit === 'C') return 'strike';
  if (suit === 'S') return 'defend';
  throw 'bad suit';
}

const HAND_LIMIT = 8;

class Game {
  hand: Card[];
  deck: Card[];
  graveyard: Card[];
  bosses: BossCard[];
  slayedBosses: BossCard[] = [];
  boss: Boss;
  defense: number = 0;
  jokerLeft: number = 2;
  attack?: Attack = undefined;

  constructor() {
    this.deck = generateDeck();
    this.hand = [];
    this.graveyard = [];
    this.bosses = generateBosses();
    this.boss = new Boss(this.bosses[0]);
    this.draw(HAND_LIMIT);
  }

  print() {
    let boss = [
      `😈 ${p(this.boss.card)}`,
      `❤️${this.boss.life}`,
      `⚔️${this.boss.power}`
    ];
    let header = [
      `🗄 ${this.deck.length}`,
      `🪦 ${this.graveyard.length}`,
      `🛡 ${this.defense}`,
      `🃏${this.jokerLeft}`
    ];
    let prompt = [
      'Type index(es) to use card(s).',
      'Example: 25 to use card #2 and card #5',
    ];
    if (this.jokerLeft > 0) {
      prompt.push('Type "r" to reset your hand.')
    }
    console.log();
    console.log('-'.repeat(80));
    if (this.slayedBosses.length > 0) {
      console.log(`🏳️ ${this.slayedBosses.map(p).join(' ')}`);
    }
    console.log(boss.join(' '));
    console.log(header.join(' '));
    this.printHand();
    console.log(prompt.join(' '));
  }

  printHand() {
    let hand = this.hand.map(p).join(' ');
    console.log(hand);
    console.log([...this.hand.keys()].map(k => ` ${k}`).join(' '))
  }

  play(): void {
    while (this.bosses.length > 0) {
      this.print();
      this.turn();
    }
    console.log('You win!');
  }

  turn(): void {
    this.useCardPhase();
    this.activatePhase();
    this.damagePhase();
  }

  useCardPhase(): boolean {
    let line = this.readLine();
    let jokerUsed = this.parseReset(line);
    if (jokerUsed) return this.useCardPhase();

    let result = this.parseAttack(line);
    if (typeof (result) === 'string') {
      console.log(result);
      this.useCardPhase();
    } else {
      this.attack = result;
      console.log(`Attack: ${this.attack}`);
    }
    return false;
  }

  activatePhase(): void {
    if (!this.attack) {
      throw 'Should has an attack here!';
    }
    if (this.boss.card.suit !== 'H' && this.attack.effects.has('restore')) {
      console.log(`修整 ${this.attack.power}`);
      this.restore(this.attack.power);
    }
    if (this.boss.card.suit !== 'D' && this.attack.effects.has('draw')) {
      console.log(`招募 ${this.attack.power}`);
      this.draw(this.attack.power);
    }
    if (this.boss.card.suit !== 'S' && this.attack.effects.has('defend')) {
      console.log(`叠甲! ${this.attack.power}`);
      this.defense += this.attack.power;
    }
  }

  damagePhase(): void {
    let bossSlayed = this.dealDamagePhase();
    if (!bossSlayed) {
      this.takeDamagePhase();
    }
  }

  dealDamagePhase(): boolean {
    if (!this.attack) {
      throw 'must has an attack!';
    }
    var power = this.attack.power;
    if (this.boss.card.suit !== 'C' && this.attack.effects.has('strike')) {
      console.log('效果拔群！');
      power *= 2;
    }
    return this.dealDamage(power);
  }

  takeDamagePhase(): void {
    let damage = Math.max(this.boss.power - this.defense, 0);
    console.log(`Damage to take: ${damage}`)
    if (damage > 0) {
      this.printHand();
      let line = this.readLine();
      if (this.parseReset(line)) {
        return this.takeDamagePhase();
      }
      let result = this.parseTakeDamage(line);
      if (typeof (result) === 'string') {
        console.log(result);
        this.takeDamagePhase();
      } else {
        this.discard(result);
      }
    } else {
      console.log('敌人未能击穿我们的装甲！');
    }
  }

  readLine(): string {
    let ans = question('Input: ');
    if (ans === '') {
      return question('Input: ');
    } else {
      return ans;
    }
  }

  parseReset(line: string): boolean {
    if (line.trim().toLowerCase() === 'r' && this.jokerLeft > 0) {
      this.jokerLeft -= 1;
      this.graveyard.push(...this.hand);
      this.hand = [];
      this.draw(HAND_LIMIT);
      return true;
    }
    return false;
  }

  parseCardIndexes(line: string): number[] | string {
    let indexes = line.trim().split(/\s*/).map(i => +i);
    if (indexes.some(isNaN)) {
      return 'You should only type in digits.'
    }
    if (indexes.some(i => i >= this.hand.length)) {
      return `Allowed index range: (0-${this.hand.length - 1})`;
    }
    return indexes;
  }

  // FIXME: 出牌后应该先结算效果，再弃掉打出的牌
  parseAttack(line: string): Attack | string {
    let indexes = this.parseCardIndexes(line);
    if (typeof (indexes) === 'string') return indexes;

    let cards = indexes.map(i => this.hand[i]);
    if (cards.length === 1) {
      this.discard(indexes);
      return new SingleAttack(cards[0]);
    }
    if (cards.length === 2 && cards.some(c => c.rank === 1) && cards.some(c => c.rank !== 1)) {
      let pet = cards.find(c => c.rank === 1);
      let regular = cards.find(c => c.rank !== 1);
      if (pet === undefined || regular === undefined) {
        throw 'Impossible!';
      }
      this.discard(indexes);
      return new PetAttack(regular, pet.suit);
    }
    let rank = cards[0].rank;
    if (cards.every(c => c.rank === rank) && cards.map(c => strength(c)).reduce((a, b) => a + b) <= 10) {
      this.discard(indexes);
      return new Combo(cards);
    }
    return 'You can not use those cards to attack!';
  }

  parseTakeDamage(line: string): number[] | string {
    let indexes = this.parseCardIndexes(line);
    if (typeof (indexes) === 'string') return indexes;

    if (this.damageCanTake(indexes) >= this.boss.power) {
      return indexes;
    } else {
      return 'Not enough power to take the damage!';
    }
  }

  draw(n: number) {
    let limit = Math.min(n, this.deck.length, HAND_LIMIT - this.hand.length);
    for (let i = 0; i < limit; i++) {
      this.drawOne();
    }
    this.hand.sort((a, b) => {
      if (a.rank === b.rank) {
        return a.suit.localeCompare(b.suit);
      } else {
        return strength(a) - strength(b);
      }
    });
    this.printHand();
  }

  drawOne() {
    if (this.deck.length > 0) {
      if (this.hand.length < HAND_LIMIT) {
        this.hand.push(this.deck[0]);
        this.deck = this.deck.slice(1);
      } else {
        throw 'My hand is full!';
      }
    } else {
      throw 'My deck is empty!';
    }
  }

  restore(n: number) {
    shuffle(this.graveyard);
    this.deck.push(...this.graveyard.slice(0, n));
    this.graveyard = this.graveyard.slice(n);
  }

  dealDamage(n: number): boolean {
    if (n > this.boss.life) {
      console.log(`You killed ${p(this.boss.card)}!`);
      this.graveyard.push(this.boss.card);
      this.nextBoss();
      return true;
    } else if (n === this.boss.life) {
      console.log(`You captured ${p(this.boss.card)}`);
      this.deck = [this.boss.card, ...this.deck];
      this.nextBoss();
      return true;
    } else {
      console.log(`You dealt ${n} damage to ${p(this.boss.card)}`);
      this.boss.life -= n;
      console.log(`life: ${this.boss.life}`)
      return false;
    }
  }

  damageCanTake(indexes: number[]): number {
    return this.defense + indexes.map(i => strength(this.hand[i])).reduce((a, b) => a + b);
  }

  discard(indexes: number[]) {
    let newHand = [];
    for (let i = 0; i < this.hand.length; i++) if (!indexes.includes(i)) {
      newHand.push(this.hand[i]);
    } else {
      this.graveyard.push(this.hand[i]);
    }
    this.hand = newHand;
  }

  nextBoss() {
    this.defense = 0;
    this.slayedBosses.push(this.boss.card);
    this.bosses = this.bosses.slice(1);
    if (this.bosses.length > 0) {
      this.boss = new Boss(this.bosses[0]);
    }
  }

  resetHand(): void {
    if (this.jokerLeft <= 0) {
      throw 'Can not reset!';
    }
    this.jokerLeft--;
    this.graveyard.push(...this.hand);
    this.hand = [];
    this.draw(8);
  }
}

interface Attack {
  get power(): number;
  get effects(): Set<EffectType>;
}

class SingleAttack implements Attack {
  card: Card;
  constructor(card: Card) {
    this.card = card;
  }

  get power(): number {
    return strength(this.card);
  }

  get effects(): Set<EffectType> {
    return new Set([effect(this.card.suit)]);
  }

  toString(): string {
    return `SingleAttack(${p(this.card)})`;
  }
}

class PetAttack extends SingleAttack {
  petSuit: Suit;

  constructor(card: Card, petSuit: Suit) {
    super(card);
    this.petSuit = petSuit;
  }

  get power(): number {
    return strength(this.card) + 1;
  }

  get effects(): Set<EffectType> {
    return new Set([this.card.suit, this.petSuit].map(s => effect(s)));
  }

  toString(): string {
    return `PetAttack(${p(this.card)}+${p({ suit: this.petSuit, rank: 1 })})`
  }
}

class Combo implements Attack {
  cards: Card[];

  constructor(cards: Card[]) {
    this.cards = cards;
    if (new Set(this.cards.map(c => c.rank)).size > 1) {
      throw 'Combo must have exact same rank!';
    }
    if (this.power > 10) {
      throw 'Combo can not > 10!';
    }
    if (this.cards.some(c => c.rank === 1)) {
      throw 'Pet can not be used in a combo!';
    }
  }

  get power(): number {
    return this.cards.reduce((r, b) => r + strength(b), 0);
  }

  get effects(): Set<EffectType> {
    return new Set(this.cards.map(c => effect(c.suit)));
  }

  toString(): string {
    return `Combo(${this.cards.map(p).join('+')})`
  }
}

const game = new Game();
game.play();
