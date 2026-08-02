"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, User, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/feed", icon: Home, label: "Inicio" },
  { href: "/create", icon: PlusCircle, label: "Crear" },
  { href: "/professional", icon: Stethoscope, label: "Expertos" },
  { href: "/profile", icon: User, label: "Perfil" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors",
                isActive ? "text-rose-600" : "text-gray-500"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "fill-current")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
