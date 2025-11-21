import { prisma } from './prisma';
import { Chess } from 'chess.js';

export class ChessGameManager {
    private games: Map<string, Chess>;
    
    constructor() {
        this.games = new Map();
    }
    
    async createGame(roomId: string) {
        await prisma.game.create({
            data: {
                room_id: roomId,
                status: "in_progress",
            }
        });
        const chess = new Chess();
        this.games.set(roomId, chess);
        return {
            roomId: roomId,
            current_fen: chess.fen(),
        };
    }
} 