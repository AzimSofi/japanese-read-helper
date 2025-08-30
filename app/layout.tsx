import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Read helper",
  description: "A tool to help you read and understand your target language(jp) better.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
      <div className="bg-gray-300 py-5" style={{ textAlign: "center" }}>
        <a href="./" className="hover:underline outline-1 m-5 p-2 bg-amber-50">
          ホーム
        </a>
        <a href="/text-input" className="hover:underline outline-1 m-5 p-2 bg-red-50">
          入力
        </a>
        <a href="/text-input-ai" className="hover:underline outline-1 m-5 p-2 bg-red-50">
          入力-AI
        </a>
        <a href="/ocr" className="hover:underline outline-1 m-5 p-2 bg-green-50">
          OCR
        </a>
        <a href="/visual-novel" className="hover:underline outline-1 m-5 p-2 bg-blue-50">
          ビジュアルノベル
        </a>
      </div>
      <div /*className="mx-36 my-5"*/>
        {children}
      </div>
      </body>
    </html>
  );
}
