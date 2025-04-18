export interface Position {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  position: Position;
  snake: Position[];
  direction: string;
  score: number;
}

export interface GameState {
  players: Map<string, Player>;
  food: Position;
  gridSize: number;
}

export type TransactionStatus = 'idle' | 'pending' | 'confirmed' | 'failed'; 