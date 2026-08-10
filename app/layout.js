import { Noto_Sans_KR, Do_Hyeon } from "next/font/google";
import "./globals.css";

// Variable font — covers 100-900, so no weight list is needed.
const bodyFont = Noto_Sans_KR({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const displayFont = Do_Hyeon({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata = {
  title: "오늘의 하루",
  description: "할 일 관리와 일기 기록을 위한 AI 서비스",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body>
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
          <defs>
            <filter id="handwobble" x="-15%" y="-15%" width="130%" height="130%">
              <feTurbulence type="fractalNoise" baseFrequency="0.045 0.09" numOctaves="2" seed="6" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>
        {children}
      </body>
    </html>
  );
}
