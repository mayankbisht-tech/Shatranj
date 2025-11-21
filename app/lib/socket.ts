import { Server, Socket } from "socket.io";
import { prisma } from "./prisma";
import { Chess } from "chess.js";

export class SocketManager {
  private io: Server;
  private rooms: Map<string, string[]> = new Map();
  private games: Map<string, Chess> = new Map(); 
  private timers: Map<string, NodeJS.Timeout> = new Map(); 

  constructor(io: Server) {
    this.io = io;
    this.initialize();
  }

  private initialize() {
    this.io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      socket.on("room:create", (data) =>
        this.handleCreateRoom(socket, data)
      );

      socket.on("room:join", (data) =>
        this.handleJoinRoom(socket, data)
      );

      socket.on("room:leave", () =>
        this.handleLeaveRoom(socket)
      );

      socket.on("chess:move", (data) =>
        this.handleChessMove(socket, data)
      );

      socket.on("signal:offer", (data) =>
        this.forwardSignal(socket, data, "signal:offer")
      );

      socket.on("signal:answer", (data) =>
        this.forwardSignal(socket, data, "signal:answer")
      );

      socket.on("signal:ice", (data) =>
        this.forwardSignal(socket, data, "signal:ice")
      );

      socket.on("disconnect", () =>
        this.handleLeaveRoom(socket)
      );
    });
  }

  private async handleCreateRoom(socket: Socket, { roomId }: { roomId: string; userId: string }) {
    this.rooms.set(roomId, [socket.id]);
    socket.join(roomId);
    this.startPreGameTimer(roomId);

    socket.emit("room:created", { roomId });
  }

  private async handleJoinRoom(socket: Socket, { roomId }: { roomId: string }) {
    const players = this.rooms.get(roomId) || [];

    if (players.length >= 2) {
      socket.emit("room:full");
      return;
    }

    players.push(socket.id);
    this.rooms.set(roomId, players);
    socket.join(roomId);

    this.io.to(roomId).emit("room:joined", { players });
  }

  private handleLeaveRoom(socket: Socket) {
    for (const [roomId, players] of this.rooms.entries()) {
      const newPlayers = players.filter((id) => id !== socket.id);

      if (newPlayers.length === 0) {
        this.rooms.delete(roomId);
        this.games.delete(roomId);
        this.cancelTimer(roomId);
      } else {
        this.rooms.set(roomId, newPlayers);
      }

      socket.leave(roomId);
    }
  }

  private startPreGameTimer(roomId: string) {
    this.cancelTimer(roomId);

    const timer = setTimeout(() => {
      this.startGame(roomId);
    }, 45000); 
    this.timers.set(roomId, timer);
    this.io.to(roomId).emit("phase:pre-game");
  }

  private startGame(roomId: string) {
    this.cancelTimer(roomId);

    const chess = new Chess();
    this.games.set(roomId, chess);

    this.io.to(roomId).emit("phase:game", {
      fen: chess.fen(),
    });
  }

  private startPostGameVideo(roomId: string) {
    this.cancelTimer(roomId);

    const timer = setTimeout(() => {
      this.finishGame(roomId);
    }, 60000); 

    this.timers.set(roomId, timer);

    this.io.to(roomId).emit("phase:post-game");
  }

  private finishGame(roomId: string) {
    this.cancelTimer(roomId);

    this.io.to(roomId).emit("phase:complete");
  }

  private cancelTimer(roomId: string) {
    const timer = this.timers.get(roomId);
    if (timer) clearTimeout(timer);
  }
  private async handleChessMove(socket: Socket, { roomId, move }: { roomId: string; move: string }) {
    const game = this.games.get(roomId);
    if (!game) return;

    const fenBefore = game.fen();
    const result = game.move(move);

    if (!result) {
      socket.emit("move:invalid");
      return;
    }

    const fenAfter = game.fen();

    this.io.to(roomId).emit("chess:move", {
      move: result.san,
      fen: fenAfter,
    });

    await prisma.move.create({
      data: {
        game_id: roomId,
        move_number: game.history().length,
        player_role: result.color === "w" ? "white" : "black",
        move_san: result.san,
        fen_before: fenBefore,
        fen_after: fenAfter,
      },
    });

    if (game.isGameOver()) {
      this.io.to(roomId).emit("game:over", {
        result: game.isCheckmate()
          ? result.color === "w"
            ? "white_win"
            : "black_win"
          : "draw",
      });

      this.startPostGameVideo(roomId);
    }
  }

  private forwardSignal(socket: Socket, data: { to: string; signal: unknown }, event: string) {
    const { to, signal } = data;
    this.io.to(to).emit(event, {
      from: socket.id,
      signal,
    });
  }
}
