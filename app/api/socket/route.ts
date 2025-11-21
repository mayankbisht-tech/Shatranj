import { NextResponse } from "next/server";
import { Server } from "socket.io";

declare global {
  var io: Server | undefined;
}

interface RoomData {
  id: string;
  name: string;
  code: string;
  creator_id: string;
  players: Array<{ id: string; username: string; role: string | null }>;
}

export const GET = async () => {
  return NextResponse.json({ message: "Socket route alive" });
};

export const POST = async () => {
  if (!globalThis.io) {
    
    const io = new Server({
      path: "/api/socket",
      cors: { origin: "*" },
    });

    globalThis.io = io;


    const rooms: Record<string, RoomData> = {};

    io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);


      socket.on("create_room", ({ name, userId, username }) => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms[roomId] = {
          id: roomId,
          name,
          code: roomId,
          creator_id: userId,
          players: [{ id: userId, username, role: null }],
        };
        socket.join(roomId);
        socket.emit("room_joined", { room: rooms[roomId], players: rooms[roomId].players });
        console.log("Room created:", rooms[roomId]);
      });

      socket.on("join_room", ({ code, userId, username }) => {
        if (!rooms[code]) {
          socket.emit("error_msg", "Room not found");
          return;
        }
        rooms[code].players.push({ id: userId, username, role: null });
        socket.join(code);
        io.to(code).emit("room_joined", { room: rooms[code], players: rooms[code].players });
      });


      socket.on("assign_roles", ({ roomId }) => {
        const room = rooms[roomId];
        if (!room) return;

        const shuffled = [...room.players].sort(() => 0.5 - Math.random());
        shuffled[0].role = "white";
        shuffled[1].role = "black";

        room.players = shuffled;
        io.to(roomId).emit("roles_assigned");


        room.players.forEach((p) => {
          const s = Array.from(io.sockets.sockets.values()).find((sock) =>
            sock.id === socket.id
          );
          s?.emit("your_role", { role: p.role });
        });
      });


      socket.on("get_role", ({ roomId, userId }: { roomId: string; userId: string }) => {
        const room = rooms[roomId];
        if (!room) return;
        const player = room.players.find((p) => p.id === userId);
        if (!player) return;
        socket.emit("your_role", { role: player.role });
      });


      socket.on("chess_move", ({ roomId, from, to, san }) => {
        socket.to(roomId).emit("opponent_move", { from, to, san });
      });


      socket.on("game_end", ({ roomId, result }) => {
        io.to(roomId).emit("game_over", { result });
      });


      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });

    console.log("Socket.IO server initialized");
  }

  return NextResponse.json({ status: "ok" });
};
