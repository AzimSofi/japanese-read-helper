import type { Metadata } from "next";
import React from "react";
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

  const homeParams = new URLSearchParams({ fileName: "", dropdownAlwaysOpen: "false" });
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
      <div className="bg-gray-300 py-5 fixed top-0 left-0 w-full p-4 z-50 text-xs" 
        style={{ textAlign: "center" }}>
        <a
          href={`.?${(() => {
            const params = new URLSearchParams(homeParams);
            params.set("fileName", "text-1");
            params.set("dropdownAlwaysOpen", "false");
            return params.toString();
          })()}`}
          className="hover:underline outline-1 ml-5 p-2 bg-amber-50"
        >
          テキスト1
        </a>
        <a
          href={`.?${(() => {
            const params = new URLSearchParams(homeParams);
            params.set("fileName", "text-1");
            params.set("dropdownAlwaysOpen", "true");
            return params.toString();
          })()}`}
          className="hover:underline outline-1 mr-5 p-2 bg-amber-50"
        >
          表示
        </a>
        <a
          href={`.?${(() => {
            const params = new URLSearchParams(homeParams);
            params.set("fileName", "text-2");
            params.set("dropdownAlwaysOpen", "false");
            return params.toString();
          })()}`}
          className="hover:underline outline-1 ml-5 p-2 bg-amber-50"
        >
          テキスト2
        </a>
        <a
          href={`.?${(() => {
            const params = new URLSearchParams(homeParams);
            params.set("fileName", "text-2");
            params.set("dropdownAlwaysOpen", "true");
            return params.toString();
          })()}`}
          className="hover:underline outline-1 mr-5 p-2 bg-amber-50"
        >
          表示
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
      <div className="my-14">
        {children}
      </div>
      </body>
    </html>
  );
}
