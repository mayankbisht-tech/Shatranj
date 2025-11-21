"use client";

import { useEffect, useState, useRef } from "react";
import { Socket } from "socket.io-client";

interface User {
  id: string;
  fullname: string;
  username: string;
  score: number;
}

interface Player {
  id: string;
  username: string;
  role: string | null;
}

interface Room {
  id: string;
  name: string;
  code: string;
  creator_id: string;
}

interface LeaderboardEntry {
  id: string;
  fullname: string;
  score: number;
  games_played: number;
  games_won: number;
}

interface GameLobbyProps {
  user: User;
  socket: Socket;
  onLogout: () => void;
  onStartGame: (room: Room) => void;
}

export default function GameLobby({ user, socket, onLogout, onStartGame }: GameLobbyProps) {
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const startPreGameCountdown = () => {
    setCountdown(45);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (!prev || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      console.log("Socket connected!");
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log("Socket disconnected!");
      setIsConnected(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    socket.on("room_joined", (data: { room: Room; players: Player[] }) => {
      console.log("Room joined event received:", data);
      console.log("Setting room:", data.room);
      console.log("Setting players:", data.players);
      setCurrentRoom(data.room);
      setPlayers(data.players);
    });

    socket.on("player_update", (list: Player[]) => {
      setPlayers(list);
    });

    socket.on("roles_assigned", () => {
      alert("Roles assigned. Game starting soon!");
      startPreGameCountdown();
    });

    socket.on("error_msg", (message: string) => {
      alert(message);
      console.error("Socket error:", message);
    });

    const loadLeaderboard = async () => {
      try {
        const res = await fetch("/api/leaderboard");
        const data = await res.json();
        setLeaderboard(data?.results || []);
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
        setLeaderboard([]);
      }
    };
    
    loadLeaderboard();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("room_joined");
      socket.off("player_update");
      socket.off("roles_assigned");
      socket.off("error_msg");
      
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [socket, localStream]);

  const handleCreateRoom = () => {
    if (!roomName) return alert("Enter room name");
    console.log("Creating room:", { name: roomName, userId: user.id, username: user.username });
    socket.emit("create_room", { name: roomName, userId: user.id, username: user.username });
  };

  const handleJoinRoom = () => {
    if (!roomCode) return alert("Enter room code");
    console.log("Joining room:", { code: roomCode, userId: user.id, username: user.username });
    socket.emit("join_room", { code: roomCode.toUpperCase(), userId: user.id, username: user.username });
  };

  const handleAssignRoles = () => {
    if (!currentRoom) return;
    socket.emit("assign_roles", { roomId: currentRoom.id });
    onStartGame(currentRoom);
  };

  const initializeWebRTC = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      
      setLocalStream(stream);
      setIsVideoActive(true);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      console.log("Video call started successfully");
    } catch (err) {
      console.error("Error accessing media devices:", err);
      alert("Could not access camera/microphone. Please check permissions.");
    }
  };

  const stopVideoCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
      setIsVideoActive(false);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">♟️ Shatranj</h1>
          <p className="text-gray-400">Online Chess Game Lobby</p>
        </div>

        {/* Connection Status */}
        <div className={`mb-6 p-3 rounded-lg text-center font-semibold transition-all ${isConnected ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-red-900/50 text-red-300 border border-red-700'}`}>
          {isConnected ? '🟢 Connected to server' : '🔴 Disconnected - Reconnecting...'}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - User & Room Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Info Card */}
            <div className="bg-gray-800/50 backdrop-blur border border-gray-700 p-6 rounded-xl shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{user.fullname}</h2>
                  <p className="text-gray-400">@{user.username}</p>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="bg-yellow-900/30 border border-yellow-700 px-3 py-1 rounded-full">
                      <span className="text-yellow-400 font-semibold">⭐ {user.score} pts</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>

            {/* Create Room Card */}
            <div className="bg-gray-800/50 backdrop-blur border border-gray-700 p-6 rounded-xl shadow-xl">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span>🎮</span> Create New Room
              </h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Enter room name..."
                  className="flex-1 bg-gray-900 border border-gray-600 p-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
                />
                <button
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-blue-500/50"
                  onClick={handleCreateRoom}
                  disabled={!isConnected}
                >
                  Create
                </button>
              </div>
            </div>

            {/* Join Room Card */}
            <div className="bg-gray-800/50 backdrop-blur border border-gray-700 p-6 rounded-xl shadow-xl">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span>🚪</span> Join Existing Room
              </h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Enter room code (e.g., ABC123)"
                  className="flex-1 bg-gray-900 border border-gray-600 p-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors uppercase"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                  maxLength={6}
                />
                <button
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-green-500/50"
                  onClick={handleJoinRoom}
                  disabled={!isConnected || !roomCode}
                >
                  Join
                </button>
              </div>
              {roomCode && (
                <p className="text-sm text-gray-400 mt-3 flex items-center gap-2">
                  <span>🔍</span> Looking for room: <span className="font-mono font-bold text-green-400">{roomCode}</span>
                </p>
              )}
            </div>

            {/* Current Room */}
            {currentRoom && (
              <div className="bg-gradient-to-br from-green-900/40 to-green-800/40 backdrop-blur border-2 border-green-600 p-6 rounded-xl shadow-2xl animate-in">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-green-300 flex items-center gap-2">
                    <span>✓</span> {currentRoom.name}
                  </h3>
                  <div className="bg-green-700/50 px-4 py-2 rounded-lg">
                    <span className="font-mono font-bold text-green-200">{currentRoom.code}</span>
                  </div>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold mb-3 text-gray-300 flex items-center gap-2">
                    <span>👥</span> Players ({players.length}/2)
                  </h4>
                  <div className="space-y-2">
                    {players.length > 0 ? (
                      players.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-gray-700"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-bold">
                              {p.username.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-white">{p.username}</span>
                            {p.id === user.id && (
                              <span className="text-xs bg-blue-600 px-2 py-1 rounded">You</span>
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            p.role === 'white' ? 'bg-gray-200 text-gray-900' :
                            p.role === 'black' ? 'bg-gray-900 text-white border border-gray-600' :
                            'bg-gray-700 text-gray-400'
                          }`}>
                            {p.role || "Waiting..."}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">Waiting for players...</p>
                    )}
                  </div>
                </div>

                {currentRoom.creator_id === user.id && players.length >= 2 && (
                  <button
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-green-500/50 mb-3"
                    onClick={handleAssignRoles}
                  >
                    🎲 Assign Roles & Start Game
                  </button>
                )}

                {countdown !== null && (
                  <div className="bg-red-900/50 border border-red-600 p-4 rounded-lg text-center mb-3">
                    <p className="text-xl font-bold text-red-300">
                      ⏱️ Pre-Game Video Starting in {countdown}s
                    </p>
                  </div>
                )}

                {!isVideoActive ? (
                  <button
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                    onClick={initializeWebRTC}
                  >
                    📹 Start Video Call
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-gray-900 rounded-lg overflow-hidden">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-48 object-cover"
                      />
                      <p className="text-center text-sm text-gray-400 py-2">Your Video</p>
                    </div>
                    <button
                      className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                      onClick={stopVideoCall}
                    >
                      🛑 Stop Video Call
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Leaderboard */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/50 backdrop-blur border border-gray-700 p-6 rounded-xl shadow-xl sticky top-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>🏆</span> Leaderboard
              </h3>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {leaderboard && leaderboard.length > 0 ? (
                  leaderboard.map((u, index) => (
                    <div
                      key={u.id}
                      className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? 'bg-yellow-500 text-yellow-900' :
                          index === 1 ? 'bg-gray-400 text-gray-900' :
                          index === 2 ? 'bg-orange-600 text-white' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-white">{u.fullname}</p>
                          <p className="text-xs text-gray-400">{u.games_played} games</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-yellow-400">{u.score}</p>
                          <p className="text-xs text-gray-400">
                            {((u.games_won / u.games_played) * 100 || 0).toFixed(0)}% WR
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>🎮</p>
                    <p className="mt-2">No players yet</p>
                    <p className="text-sm">Be the first!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
