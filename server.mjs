import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("create_room", ({ name, userId, username }) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms[roomId] = {
      id: roomId,
      name,
      code: roomId,
      creator_id: userId,
      players: [{ id: userId, username: username || "Player", role: null }],
    };
    socket.join(roomId);
    socket.emit("room_joined", {
      room: rooms[roomId],
      players: rooms[roomId].players,
    });
    console.log("Room created:", rooms[roomId]);
  });

  socket.on("join_room", ({ code, userId, username }) => {
    console.log("Join room request:", { code, userId, username });
    
    if (!rooms[code]) {
      socket.emit("error_msg", "Room not found");
      console.log("Room not found:", code);
      return;
    }
    
    const existingPlayer = rooms[code].players.find((p) => p.id === userId);
    if (!existingPlayer) {
      rooms[code].players.push({
        id: userId,
        username: username || "Player",
        role: null,
      });
    }
    
    socket.join(code);
    io.to(code).emit("room_joined", {
      room: rooms[code],
      players: rooms[code].players,
    });
    console.log("Player joined room:", rooms[code]);
  });

  socket.on("assign_roles", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    const shuffled = [...room.players].sort(() => 0.5 - Math.random());
    if (shuffled[0]) shuffled[0].role = "white";
    if (shuffled[1]) shuffled[1].role = "black";

    room.players = shuffled;
    io.to(roomId).emit("roles_assigned");

    room.players.forEach((p) => {
      const playerSocket = Array.from(io.sockets.sockets.values()).find(
        (sock) => sock.id === socket.id
      );
      playerSocket?.emit("your_role", { role: p.role });
    });
  });

  socket.on("get_role", ({ roomId, userId }) => {
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

const PORT = process.env.SOCKET_PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
