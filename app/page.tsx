"use client";

import { useEffect, useState } from "react";
import io, { Socket } from "socket.io-client";
import AuthForm from "./components/authForm";
import GameLobby from "./components/GameLobby";
import ChessGame from "./components/ChessGame";

interface User {
  id: string;
  fullname: string;
  username: string;
  email: string;
  score: number;
}

interface RoomData {
  id: string;
  name: string;
  code: string;
  creator_id: string;
}

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [currentScreen, setCurrentScreen] = useState<"auth" | "lobby" | "game">(
    "auth"
  );
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  useEffect(() => {
    const s = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000", {
      transports: ["websocket"],
    });

    s.on("connect", () => {
      console.log("Socket connected:", s.id);
    });

    s.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    s.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    const timer = setTimeout(() => {
      setSocket(s);
    }, 0);

    return () => {
      clearTimeout(timer);
      s.disconnect();
    };
  }, []);

  const handleLoginSuccess = (userInfo: User) => {
    setUser(userInfo);
    setCurrentScreen("lobby");
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentScreen("auth");
    socket?.emit("logout");
  };

  const startGame = (roomInfo: RoomData) => {
    setRoomData(roomInfo);
    setCurrentScreen("game");
  };
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {!socket ? (
        <div className="flex flex-col justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-xl text-gray-300">Connecting to server...</p>
        </div>
      ) : currentScreen === "auth" ? (
        <div className="flex justify-center items-center min-h-screen p-4">
          <AuthForm onLogin={handleLoginSuccess} />
        </div>
      ) : currentScreen === "lobby" && user ? (
        <GameLobby
          socket={socket}
          user={user}
          onLogout={handleLogout}
          onStartGame={startGame}
        />
      ) : currentScreen === "game" && user && roomData ? (
        <ChessGame
          socket={socket}
          user={user}
          roomData={roomData}
          roomId={roomData.id}
          onExit={() => setCurrentScreen("lobby")}
        />
      ) : (
        <div className="flex justify-center items-center h-screen">
          <p className="text-xl text-gray-300">Loading...</p>
        </div>
      )}
    </main>
  );
}
