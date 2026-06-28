import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, List, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const links = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/transactions", label: "Transactions", icon: List },
  ];

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans">
      {/* Mobile Topbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-foreground text-white flex items-center justify-between px-4 z-50">
        <span className="font-bold text-xl tracking-tight">FinSight</span>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-foreground z-40 flex flex-col p-4">
          <nav className="flex-1 space-y-2">
            {links.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-4 rounded-md transition-all ${location === link.href ? "bg-primary text-white font-semibold" : "text-gray-300 hover:bg-gray-800"}`}>
                <link.icon size={24} />
                <span className="text-lg">{link.label}</span>
              </Link>
            ))}
          </nav>
          <div className="mt-auto pt-4 border-t border-gray-800">
            <div className="px-4 py-3 text-gray-400 text-sm truncate">{user?.email}</div>
            <button onClick={signOut} className="w-full flex items-center gap-3 px-4 py-4 text-gray-300 hover:text-white transition-colors cursor-pointer">
              <LogOut size={24} />
              <span className="text-lg">Sign out</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-foreground h-full border-r border-gray-800 shrink-0">
        <div className="h-24 flex items-center px-6">
          <span className="font-bold text-3xl text-white tracking-tight">FinSight</span>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-2">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={`flex items-center gap-3 px-4 py-4 rounded-md cursor-pointer transition-all ${location === link.href ? "bg-primary text-white font-medium" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}>
              <link.icon size={20} />
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className="px-4 py-2 text-gray-400 text-xs truncate mb-2">{user?.email}</div>
          <button onClick={signOut} className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-all cursor-pointer">
            <LogOut size={20} />
            <span className="text-sm font-medium">Sign out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto bg-muted md:bg-white pt-16 md:pt-0">
        <div className="h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
