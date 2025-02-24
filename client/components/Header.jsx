// components/Header.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, LogOut } from "lucide-react";
import Image from "next/image";

export default function Header() {
  const [showSettings, setShowSettings] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  const user =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user"))
      : null;

  return (
    <header className="bg-neutral-900 text-neutral-100 shadow-gold border-b border-secondary-500/20">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <a
            href="/"
            className="text-2xl font-bold text-secondary-400 hover:text-secondary-300 transition-colors flex items-center gap-2"
          >
            <Image
              src="/annexilogo.png"
              alt="Annexi Logo"
              width={64}
              height={64}
              priority
              className="object-contain "
            />
          </a>

          <div className="flex items-center gap-4">
            {user && !user.isGuest && (
              <>
                <div className="hidden sm:block">
                  <span className="text-neutral-400">Welcome,</span>{" "}
                  <span className="text-secondary-400">{user.username}</span>
                </div>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 hover:bg-neutral-800 rounded-full transition-colors relative"
                  aria-label="Settings"
                >
                  <Settings className="w-6 h-6 text-secondary-400" />
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg transition-all shadow-lg hover:shadow-xl"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            )}
            {user && user.isGuest && (
              <>
                <div className="hidden sm:block">
                  <span className="text-neutral-400">Welcome,</span>{" "}
                  <span className="text-secondary-400">{user.username}</span>
                </div>
              </>
            )}
            {!user ||
              (user.isGuest && (
                <a
                  href="/login"
                  className="px-2 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all shadow-gold hover:shadow-gold-lg"
                >
                  Login
                </a>
              ))}
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="absolute right-4 mt-2 w-64 bg-neutral-800 rounded-lg shadow-gold py-2 z-50 border border-secondary-500/20">
          <div className="px-4 py-3 border-b border-neutral-700">
            <p className="font-medium text-secondary-400">{user?.username}</p>
            <p className="text-sm text-neutral-400">{user?.email}</p>
          </div>
          <div className="py-2">
            <a
              href="/settings"
              className="block px-4 py-2 text-neutral-200 hover:bg-neutral-700 hover:text-secondary-400 transition-colors"
            >
              Account Settings
            </a>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-accent-400 hover:bg-neutral-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
