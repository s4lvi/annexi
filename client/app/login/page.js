// app/login/page.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint =
      mode === "login"
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}api/auth/login`
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}api/auth/register`;

    const body =
      mode === "login"
        ? JSON.stringify({ username, password })
        : JSON.stringify({ username, email, password });

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/lobby");
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      console.error(err);
      setMessage("Error connecting to server");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900">
      <Header />
      <div className="container mx-auto px-4 py-8 flex justify-center items-center">
        <div className="bg-neutral-800 rounded-xl shadow-gold-lg w-full max-w-md p-8 border border-secondary-500/20">
          <div className="flex justify-around mb-8">
            <button
              className={`px-6 py-2 font-semibold transition-colors ${
                mode === "login"
                  ? "text-secondary-400 border-b-2 border-secondary-400"
                  : "text-neutral-400 hover:text-neutral-300"
              }`}
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              className={`px-6 py-2 font-semibold transition-colors ${
                mode === "register"
                  ? "text-secondary-400 border-b-2 border-secondary-400"
                  : "text-neutral-400 hover:text-neutral-300"
              }`}
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>

          {message && (
            <div className="bg-accent-900/20 border border-accent-500 text-accent-400 px-4 py-3 rounded mb-4">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 text-neutral-100 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500"
                required
              />
            </div>

            {/* ... similar styling for email and password inputs ... */}

            <button
              type="submit"
              className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-semibold transition-colors shadow-gold hover:shadow-gold-lg"
            >
              {mode === "login" ? "Login" : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
