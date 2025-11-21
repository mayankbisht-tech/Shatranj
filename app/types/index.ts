export interface user{
    id:string;
    fullname:string;
    username:string;
    email:string;
    
    score:number;
    games_played:number;
    games_won:number;
    created_at:Date;
}
export interface Player{
    id:string;
    username:string;
    avatar?:string;
    fullname:string;
    score:number;
    isReady:boolean;
    socketId:string;
}
export interface RoomData {
  roomId: string;
  hostId: string;
  players: Player[];
  isGameStarted: boolean;
  maxPlayers: number;
  createdAt: Date;
}

export interface GameState {
  roomId: string;
  round: number;
  totalRounds: number;
  currentPlayerId: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  scores: Record<string, number>;
  startedAt: Date | null;
  endsAt: Date | null;
}