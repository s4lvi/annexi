"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { UserIcon, MailIcon, LockIcon, Loader } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import LoadingScreen from "@/components/LoadingScreen";

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user, loading, login } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.push("/lobby");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

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
        login(data.user);
        router.push("/lobby");
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      console.error(err);
      setMessage("Error connecting to server");
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Verifying your credentials..." />;
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      <Header />
      <div className="container mx-auto px-4 py-8 flex justify-center items-center">
        <div className="bg-neutral-800 rounded-xl shadow-gold-lg w-full max-w-md p-8 border border-secondary-500/20">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-secondary-400 mb-2">
              {mode === "login" ? "Welcome Back!" : "Create Account"}
            </h1>
            <p className="text-neutral-400">
              {mode === "login"
                ? "Enter your credentials to continue"
                : "Fill in your details to get started"}
            </p>
          </div>

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
            <div className="bg-accent-900/20 border border-accent-500 text-accent-400 px-4 py-3 rounded-lg mb-6">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Username
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-neutral-700 border border-neutral-600 text-neutral-100 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 placeholder-neutral-500"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Email
                </label>
                <div className="relative">
                  <MailIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-neutral-700 border border-neutral-600 text-neutral-100 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 placeholder-neutral-500"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Password
              </label>
              <div className="relative">
                <LockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-neutral-700 border border-neutral-600 text-neutral-100 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 placeholder-neutral-500"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-semibold transition-all shadow-gold hover:shadow-gold-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : mode === "login" ? (
                "Login"
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
