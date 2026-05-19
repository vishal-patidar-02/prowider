"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/request-service",
    label: "Request Service",
    icon: DocumentIcon,
    badge: undefined,
  },
  {
    href: "/dashboard",
    label: "Live Dashboard",
    icon: GridIcon,
    badge: undefined,
  },
  {
    href: "/test-tools",
    label: "Test Tools",
    icon: FlaskIcon,
    badge: "QA",
  },
] as const;

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 h-16 border-b border-brand-border bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-accent text-white shadow-sm">
            <BrandMark />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[20px] font-extrabold tracking-tight text-brand-primary">
              Prowider
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-brand-muted">
              Lead Distribution Platform
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:gap-3">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-2 rounded-none px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                  active ? "text-brand-primary" : "text-brand-muted hover:text-brand-primary"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="ml-1 inline-flex items-center rounded-full bg-brand-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {item.badge}
                  </span>
                ) : null}
                <span
                  className={`absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-brand-primary transition-opacity ${
                    active ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                  }`}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function BrandMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-current" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" opacity="0.85" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" opacity="0.7" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3.75h6.5L19 9.25V20.25A1.75 1.75 0 0 1 17.25 22H7a2 2 0 0 1-2-2V5.75A2 2 0 0 1 7 3.75Z" />
      <path d="M13.5 3.75V9.5H19" />
      <path d="M8 13h8" />
      <path d="M8 16.5h8" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function FlaskIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 3.75h6" />
      <path d="M10 3.75v5.1L5.62 18.2A2.1 2.1 0 0 0 7.5 21h9a2.1 2.1 0 0 0 1.88-2.8L14 8.85v-5.1" />
      <path d="M8.6 15h6.8" />
    </svg>
  );
}
