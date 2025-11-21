"use client";

import { useState } from "react";

interface User {
  id: string;
  fullname: string;
  username: string;
  email: string;
  score: number;
}

interface AuthFormProps {
  onLogin: (user: User) => void;
}

export default function AuthForm({ onLogin }: AuthFormProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullname: "",
    username: "",
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/register";

      const payload =
        mode === "login"
          ? { email: form.email, password: form.password }
          : form;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("Auth response:", { status: res.status, data });
      
      if (!res.ok) {
        const errorMsg = data.error || data.message || "Something went wrong";
        throw new Error(errorMsg);
      }

      localStorage.setItem("token", data.token);
      onLogin(data.user);
    } catch (err) {
      console.error("Auth error:", err);
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!form.email) return alert("Enter your email first!");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });

      const data = await res.json();
      alert(data.message);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      alert(errorMessage);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-gray-800/50 backdrop-blur border border-gray-700 p-8 rounded-2xl shadow-2xl">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold mb-2">♟️ Shatranj</h1>
        <h2 className="text-2xl font-semibold text-gray-300">
          {mode === "login" ? "Welcome Back" : "Create Account"}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "register" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
              <input
                type="text"
                name="fullname"
                placeholder="John Doe"
                value={form.fullname}
                onChange={handleChange}
                className="w-full bg-gray-900 border border-gray-600 p-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
              <input
                type="text"
                name="username"
                placeholder="johndoe"
                value={form.username}
                onChange={handleChange}
                className="w-full bg-gray-900 border border-gray-600 p-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
          <input
            type="email"
            name="email"
            placeholder="john@example.com"
            value={form.email}
            onChange={handleChange}
            className="w-full bg-gray-900 border border-gray-600 p-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
          <input
            type="password"
            name="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            className="w-full bg-gray-900 border border-gray-600 p-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            required
            minLength={6}
          />
          {mode === "register" && (
            <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-blue-500/50 disabled:cursor-not-allowed"
        >
          {loading
            ? "⏳ Please wait..."
            : mode === "login"
            ? "🔓 Login"
            : "🎮 Create Account"}
        </button>
      </form>

      {mode === "login" && (
        <button
          className="text-sm text-blue-400 hover:text-blue-300 cursor-pointer mt-4 text-center w-full transition-colors"
          onClick={handleResetPassword}
        >
          Forgot password?
        </button>
      )}

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-400">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}
        </p>
        <button
          className="text-blue-400 hover:text-blue-300 font-semibold mt-1 transition-colors"
          onClick={toggleMode}
        >
          {mode === "login" ? "Create Account →" : "← Back to Login"}
        </button>
      </div>
    </div>
  );
}
