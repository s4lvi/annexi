// app/page.js
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";

const generateHexId = () => {
  let hexString = "";
  for (let i = 0; i < 24; i++) {
    // Generate a random hex digit (0-f)
    const hexDigit = Math.floor(Math.random() * 16).toString(16);
    hexString += hexDigit;
  }
  return hexString;
};

export default function LandingPage() {
  const router = useRouter();
  const user =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user"))
      : null;
  useEffect(() => {
    if (user) {
      router.push("/lobby");
    }
  }, [user]);
  const playAsGuest = () => {
    // Generate a random guest username
    const guestId = generateHexId();
    const guestUser = {
      username: `Guest_${guestId.substring(0, 4)}`, // Use first 8 chars for readable username
      _id: guestId, // Full 24-character hex string for MongoDB ObjectId
      isGuest: true,
    };
    localStorage.setItem("user", JSON.stringify(guestUser));
    router.push("/lobby");
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-neutral-800 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <Image
          src="/annexilogo.png"
          alt="Annexi Logo"
          width={256}
          height={256}
          priority
          className="object-contain mb-8"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <button
          onClick={() => router.push("/login")}
          className="w-full px-6 py-4 bg-secondary-500 hover:bg-secondary-600 text-neutral-900 rounded-lg text-lg font-semibold transition-all shadow-gold hover:shadow-gold-lg"
        >
          Login to Play
        </button>

        <button
          onClick={playAsGuest}
          className="w-full px-6 py-4 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg text-lg font-semibold transition-all shadow-lg hover:shadow-xl border border-secondary-500/20"
        >
          Play as Guest
        </button>
      </div>

      <div className="mt-8 text-secondary-300 text-sm">
        <p>Join thousands of players in the ultimate conquest!</p>
      </div>
    </div>
  );
}
