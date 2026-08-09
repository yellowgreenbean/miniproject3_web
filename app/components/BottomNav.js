"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/",
    label: "오늘",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 11.5 12 4l8 7.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 10v9h12v-9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/calendar",
    label: "달력",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M4 10h16M8 3v4M16 3v4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/diary",
    label: "공부 선배",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 5h16v11H9l-4 4V5Z" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="14" cy="9.5" r="2.4" strokeWidth="1.5" />
        <path
          d="M12.1 8.4c-1 -1.2 -2.4 -0.2 -1.6 1M15.9 8.4c1 -1.2 2.4 -0.2 1.6 1"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <circle cx="13.2" cy="9.3" r="0.35" fill="currentColor" stroke="none" />
        <circle cx="14.8" cy="9.3" r="0.35" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <footer className="bottomNav">
      <ul className="navLinks">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link href={item.href} className={`navLink${active ? " navLinkActive" : ""}`}>
                {item.icon}
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </footer>
  );
}
