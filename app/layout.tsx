
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shatranj | Real-time Multiplayer Chess",
  description: "Play online multiplayer chess with real-time moves, audio chat, and matchmaking.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white">
        {children}
      </body>
    </html>
  );
}
