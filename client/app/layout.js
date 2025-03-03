// app/layout.js
import { GameStateProvider } from "../components/gameState";
import { AuthProvider } from "../components/AuthContext";
import { CardCollectionProvider } from "../components/CardCollectionContext";
import { SocketProvider } from "@/components/SocketContext";
import "./globals.css";

export const metadata = {
  title: "Annexi",
  description: "Forth and Conquer!",
  metadataBase: new URL("https://annexi.io"),
  openGraph: {
    title: "Annexi",
    description: "Forth and Conquer!",
    url: "https://annexi.io",
    image: "https://annexi.io/annexilogo.png",
  },
  twitter: {
    card: "summary_large_image",
    title: "Annexi",
    description: "Forth and Conquer!",
    image: "https://annexi.io/annexilogo.png",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <GameStateProvider>
            <SocketProvider>
              <CardCollectionProvider>{children}</CardCollectionProvider>
            </SocketProvider>
          </GameStateProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
