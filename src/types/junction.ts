import { Position } from './trail';

export interface Junction {
  id: string;
  position: Position;
  trails: string[];
  description?: string;
  name?: string;
} 