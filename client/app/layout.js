// app/layout.js
import { GameStateProvider } from "../components/gameState";
import { AuthProvider } from "../components/AuthContext";
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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <GameStateProvider>{children}</GameStateProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
