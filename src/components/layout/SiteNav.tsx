"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV } from "@/lib/navigation";

export function SiteNav() {
  const pathname = usePathname() || "";
  return (
    <nav className="site-nav" aria-label="Primary">
      <Link href="/" className="site-nav__brand">
        Writing
      </Link>
      <ul className="site-nav__list">
        {PRIMARY_NAV.filter((item) => item.label !== "Home").map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`) ||
            (item.label === "Write" && pathname.startsWith("/projects")) ||
            (item.label === "Test" &&
              (pathname.startsWith("/test") || pathname.includes("/scene-lab")));
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={active ? "is-active" : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="site-nav__account">
        <Link href="/account">Account</Link>
        <Link href="/login">Sign in</Link>
      </div>
    </nav>
  );
}
