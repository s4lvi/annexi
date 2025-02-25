"use client";

import React from "react";
import { Loader } from "lucide-react";

export default function LoadingScreen({ message = "Loading game data..." }) {
  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center">
      <div className="bg-neutral-800 rounded-xl shadow-gold p-8 border border-secondary-500/20 text-center">
        <Loader className="w-12 h-12 animate-spin text-secondary-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-secondary-400 mb-2">{message}</h2>
        <p className="text-neutral-400">
          Please wait while we connect you to the game...
        </p>
      </div>
    </div>
  );
}
