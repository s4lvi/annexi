"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  LogOut,
  Grid3X3,
  BookOpen,
  ShoppingCart,
  User,
  CreditCard,
  Shield,
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/components/AuthContext";
import { useCardCollection } from "@/components/CardCollectionContext";

export default function Header() {
  const [showSettings, setShowSettings] = useState(false);
  const [showNavMenu, setShowNavMenu] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();
  const { userCurrency } = useCardCollection();

  const handleLogout = () => {
    logout(); // This will also redirect to home page based on your AuthContext
  };

  const navigateTo = (path) => {
    router.push(path);
    setShowNavMenu(false);
    setShowSettings(false);
  };

  return (
    <header className="bg-neutral-900 text-neutral-100 shadow-gold border-b border-secondary-500/20">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div
            onClick={() => router.push(user ? "/lobby" : "/")}
            className="text-2xl font-bold text-secondary-400 hover:text-secondary-300 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Image
              src="/annexilogo.png"
              alt="Annexi Logo"
              width={64}
              height={64}
              priority
              className="object-contain"
            />
          </div>

          {/* Navigation links - only visible when logged in */}
          {user && (
            <nav className="hidden md:flex items-center space-x-6">
              <button
                onClick={() => navigateTo("/collection")}
                className="text-neutral-300 hover:text-secondary-400 flex items-center gap-1 transition-colors"
              >
                <Grid3X3 className="w-4 h-4" />
                <span>Collection</span>
              </button>
              <button
                onClick={() => navigateTo("/decks")}
                className="text-neutral-300 hover:text-primary-400 flex items-center gap-1 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span>Decks</span>
              </button>
              <button
                onClick={() => navigateTo("/shop")}
                className="text-neutral-300 hover:text-amber-400 flex items-center gap-1 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Shop</span>
              </button>
              <button
                onClick={() => navigateTo("/profile")}
                className="text-neutral-300 hover:text-purple-400 flex items-center gap-1 transition-colors"
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </button>
              {user.isAdmin && (
                <button
                  onClick={() => navigateTo("/admin")}
                  className="text-neutral-300 hover:text-purple-400 flex items-center gap-1 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin</span>
                </button>
              )}
            </nav>
          )}

          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden md:flex items-center px-3 py-1 bg-neutral-800 rounded-lg">
                <CreditCard className="w-4 h-4 text-amber-400 mr-2" />
                <span className="text-amber-400 font-medium">
                  {userCurrency}
                </span>
              </div>
            )}

            {/* Mobile nav toggle */}
            {user && (
              <button
                className="md:hidden p-2 hover:bg-neutral-800 rounded-lg"
                onClick={() => setShowNavMenu(!showNavMenu)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-neutral-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16m-7 6h7"
                  />
                </svg>
              </button>
            )}

            {user && !user.isGuest && (
              <>
                <div className="hidden sm:inline">
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
                <button
                  onClick={() => router.push("/login")}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all shadow-gold hover:shadow-gold-lg"
                >
                  Login
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
            {!user && (
              <button
                onClick={() => router.push("/login")}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all shadow-gold hover:shadow-gold-lg"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {showNavMenu && user && (
        <div className="md:hidden absolute left-0 right-0 bg-neutral-800 shadow-gold border-b border-secondary-500/20 z-50">
          <div className="container mx-auto py-2 px-4">
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => navigateTo("/collection")}
                className="p-3 hover:bg-neutral-700 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Grid3X3 className="w-5 h-5 text-secondary-400" />
                <span>Card Collection</span>
              </button>
              <button
                onClick={() => navigateTo("/decks")}
                className="p-3 hover:bg-neutral-700 rounded-lg flex items-center gap-2 transition-colors"
              >
                <BookOpen className="w-5 h-5 text-primary-400" />
                <span>Deck Builder</span>
              </button>
              <button
                onClick={() => navigateTo("/shop")}
                className="p-3 hover:bg-neutral-700 rounded-lg flex items-center gap-2 transition-colors"
              >
                <ShoppingCart className="w-5 h-5 text-amber-400" />
                <span>Card Shop</span>
              </button>
              <button
                onClick={() => navigateTo("/profile")}
                className="p-3 hover:bg-neutral-700 rounded-lg flex items-center gap-2 transition-colors"
              >
                <User className="w-5 h-5 text-purple-400" />
                <span>User Profile</span>
              </button>
              <div className="p-3 flex items-center">
                <CreditCard className="w-5 h-5 text-amber-400 mr-2" />
                <span className="text-amber-400 font-medium">
                  {userCurrency} currency
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Dropdown */}
      {showSettings && (
        <div className="absolute right-4 mt-2 w-64 bg-neutral-800 rounded-lg shadow-gold py-2 z-50 border border-secondary-500/20">
          <div className="px-4 py-3 border-b border-neutral-700">
            <p className="font-medium text-secondary-400">{user?.username}</p>
            <p className="text-sm text-neutral-400">{user?.email}</p>
            <div className="mt-2 flex items-center">
              <CreditCard className="w-4 h-4 text-amber-400 mr-2" />
              <span className="text-amber-400 font-medium">
                {userCurrency} currency
              </span>
            </div>
          </div>
          <div className="py-2">
            <button
              onClick={() => navigateTo("/profile")}
              className="block w-full text-left px-4 py-2 text-neutral-200 hover:bg-neutral-700 hover:text-secondary-400 transition-colors"
            >
              Account Settings
            </button>
            <button
              onClick={() => navigateTo("/collection")}
              className="block w-full text-left px-4 py-2 text-neutral-200 hover:bg-neutral-700 hover:text-secondary-400 transition-colors"
            >
              Card Collection
            </button>
            <button
              onClick={() => navigateTo("/decks")}
              className="block w-full text-left px-4 py-2 text-neutral-200 hover:bg-neutral-700 hover:text-secondary-400 transition-colors"
            >
              Deck Builder
            </button>
            <div className="border-t border-neutral-700 my-1"></div>
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
