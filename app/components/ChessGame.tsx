"use client";

import { useEffect, useRef, useState } from "react";
import { Chess, Move } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Socket } from "socket.io-client";

const AnyChessboard = Chessboard as unknown as React.ComponentType<{
  position: string;
  onPieceDrop: (source: string, target: string) => boolean;
  boardWidth: number;
  boardOrientation: "white" | "black";
  customBoardStyle: Record<string, string>;
}>;

interface User {
  id: string;
  fullname: string;
  username: string;
}

interface RoomData {
  id: string;
  name: string;
  code: string;
}

interface ChessGameProps {
  user: User;
  roomData: RoomData;
  roomId: string;
  socket: Socket;
  onExit: () => void;
}

export default function ChessGame({ user, roomId, socket }: ChessGameProps) {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");

  const audioStreamRef = useRef<MediaStream | null>(null);

  const initAudioOnly = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      audioStreamRef.current = stream;
    } catch (err) {
      console.error("Audio error:", err);
    }
  };

  useEffect(() => {
    if (!socket) return;

    socket.emit("get_role", { roomId, userId: user.id });

    const handleRole = (data: { role: "white" | "black" }) => setPlayerColor(data.role);
    const handleOpponentMove = ({ from, to }: { from: string; to: string }) => {
      const newGame = new Chess(game.fen());
      const move = newGame.move({ from, to, promotion: "q" });

      if (move) {
        setGame(newGame);
        setFen(newGame.fen());
        setMoveHistory((prev) => [...prev, move]);
      }
    };

    socket.on("your_role", handleRole);
    socket.on("opponent_move", handleOpponentMove);

    initAudioOnly();

    return () => {
      socket.off("your_role", handleRole);
      socket.off("opponent_move", handleOpponentMove);
      audioStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [socket, roomId, user.id, game]);

  const onPieceDrop = (source: string, target: string) => {
    const currentTurn = game.turn() === "w" ? "white" : "black";
    if (currentTurn !== playerColor) return false;

    const newGame = new Chess(game.fen());
    const move = newGame.move({ from: source, to: target, promotion: "q" });

    if (!move) return false;

    setGame(newGame);
    setFen(newGame.fen());
    setMoveHistory((prev) => [...prev, move]);

    socket.emit("chess_move", {
      roomId,
      from: source,
      to: target,
      san: move.san,
    });

    checkGameState(newGame);
    return true;
  };

  const checkGameState = (g: Chess) => {
    if (g.isCheckmate()) {
      socket.emit("game_end", {
        roomId,
        result: g.turn() === "w" ? "black_win" : "white_win",
      });
      alert("Checkmate! Game Over");
    } else if (g.isDraw()) {
      socket.emit("game_end", { roomId, result: "draw" });
      alert("Game Draw!");
    }
  };

  return (
    <div className="flex gap-6 p-6 w-full">
      <div>
        <AnyChessboard
          position={fen}
          onPieceDrop={onPieceDrop}
          boardWidth={500}
          boardOrientation={playerColor}
          customBoardStyle={{
            borderRadius: "8px",
            boxShadow: "0px 0px 10px rgba(0,0,0,0.3)",
          }}
        />

        <div className="mt-3 p-3 bg-gray-100 rounded text-center">
          <p className="font-semibold">
            Turn: {game.turn() === "w" ? "White" : "Black"}
          </p>
          {game.isCheck() && (
            <p className="text-red-600 font-bold">CHECK!</p>
          )}
        </div>
      </div>

      <div className="flex-1">
        <div className="p-4 bg-white rounded shadow">
          <h3 className="font-bold text-lg">Players</h3>
          <p>White: {playerColor === "white" ? user.fullname : "Opponent"}</p>
          <p>Black: {playerColor === "black" ? user.fullname : "Opponent"}</p>
        </div>

        <div className="p-4 bg-white rounded shadow mt-4 h-[400px] overflow-y-auto">
          <h3 className="font-bold text-lg mb-2">Move History</h3>

          <ul className="space-y-1">
            {moveHistory.map((m, i) => (
              <li key={i} className="text-sm">
                <span className="font-semibold">{i + 1}.</span> {m.san}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
