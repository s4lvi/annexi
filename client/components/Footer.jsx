// @/components/Footer.js
"use client";

import { FaDiscord } from "react-icons/fa6";

export default function Footer() {
  return (
    <footer className="bg-neutral-800 border-t border-secondary-500/20 py-4 mt-auto">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
        <div className="text-neutral-400 text-sm mb-3 md:mb-0">
          © {new Date().getFullYear()} Annexi. All rights reserved.
        </div>
        <div className="flex items-center">
          <a
            href="https://discord.gg/6YRU8YP5q7"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-700 hover:bg-[#5865F2] text-neutral-200 rounded-lg transition-colors text-sm"
          >
            <FaDiscord />
          </a>
        </div>
      </div>
    </footer>
  );
}
