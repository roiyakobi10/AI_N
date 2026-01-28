
export interface Position {
  x: number;
  y: number;
}

export interface GameItem {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  label: string;
  title: string;
  description: string;
  icon: string;
  examples: string[];
  managementValue: string;
}

export interface Player {
  x: number;
  y: number;
  size: number;
  speed: number;
  color: string;
  targetX: number;
  targetY: number;
  heldItemId: number | null;
}

export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  MODAL_OPEN = 'MODAL_OPEN',
  COMPLETED = 'COMPLETED'
}

export enum QuestStep {
  PICKUP = 'PICKUP',
  DELIVER = 'DELIVER'
}
