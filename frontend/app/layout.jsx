import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../context/ThemeContext.jsx";
import { CartProvider } from "../context/CartContext.jsx";
import { UserProvider } from "../context/UserContext.jsx";

const display = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-display" });
const sans = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-mono" });

export const metadata = {
  title: "Tech Arcade BD",
  description:
    "Genuine electronics and gadgets, delivered across Bangladesh. Cash on delivery and secure bKash/Nagad payment available.",
  icons: {
    icon: "/icon.png", 
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head />
      <body className="min-h-screen flex flex-col">
        <ThemeProvider>
          <UserProvider>
            <CartProvider>{children}</CartProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
