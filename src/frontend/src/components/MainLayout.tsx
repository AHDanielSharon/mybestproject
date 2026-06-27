import { useEffect } from "react";
import {
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { Clapperboard, Home, MessageCircle, Search, ShieldCheck, User } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import GlobalCallManager from "./GlobalCallManager";
import InstallPWA from "./InstallPWA";
import MobileNavbar from "./MobileNavbar";
import NotificationBadge from "./NotificationBadge";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/explore", icon: Search, label: "Explore" },
  { path: "/reels", icon: Clapperboard, label: "Reels" },
  { path: "/messages", icon: MessageCircle, label: "Messages" },
  { path: "/profile", icon: User, label: "Profile" },
  { path: "/decentracheck/index.html", icon: ShieldCheck, label: "DecentraCheck", external: true },
];

const SPRING = { type: "spring" as const, stiffness: 320, damping: 26, mass: 0.8 };

export default function MainLayout() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const handleNavigate = (path: string) => {
    navigate({ to: path as "/" | "/explore" | "/reels" | "/messages" | "/profile" });
  };

  useEffect(() => {
    const update = () => {
      const sidebar = document.querySelector('nav[aria-label="Primary navigation"]');
      if (sidebar) document.documentElement.style.setProperty("--sidebar-width", `${sidebar.clientWidth}px`);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div
      className="flex gradient-bg-animated gpu-layer"
      style={{ minHeight: "100dvh", height: "100dvh", overflowX: "hidden" }}
    >
      {/* ═══ DESKTOP SIDEBAR ═══ */}
      <nav
        className="hidden md:flex md:flex-col fixed left-0 z-30 top-0 bottom-0 w-20 xl:w-64 gpu-layer"
        style={{
          background: "rgba(8, 5, 1, 0.92)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          borderRight: "1px solid rgba(212, 175, 55, 0.12)",
        }}
        aria-label="Primary navigation"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 xl:px-5 py-5 border-b shrink-0" style={{ borderColor: "rgba(212,175,55,0.08)" }}>
          <motion.div
            className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center neon-glow-gold"
            style={{
              background: "linear-gradient(135deg, oklch(0.80 0.22 70 / 0.25), oklch(0.65 0.25 45 / 0.25))",
              border: "1px solid oklch(0.80 0.22 70 / 0.40)",
            }}
            whileHover={{ scale: 1.05 }}
          >
            <img src="/assets/generated/socionet-logo-transparent.dim_200x200.png" alt="SOCIONET" className="h-6 w-6" />
          </motion.div>
          <span className="hidden xl:block text-base font-black tracking-tight gradient-text select-none truncate">
            SOCIONET
          </span>
        </div>

        {/* Nav links */}
        <div className="flex flex-col gap-1 p-2 pt-4 flex-1 overflow-y-auto overflow-x-hidden">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;
            return (
              <div key={item.path} className="relative">
                {isActive && (
                  <motion.div
                    layoutId="desktop-active-pill"
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: "linear-gradient(135deg, oklch(0.80 0.22 70 / 0.18), oklch(0.65 0.25 45 / 0.10))",
                      border: "1px solid oklch(0.80 0.22 70 / 0.25)",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.3), 0 0 20px oklch(0.80 0.22 70 / 0.10)",
                    }}
                    initial={false}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                <motion.div whileHover={{ x: 2 }} transition={SPRING}>
                  {item.external ? (
                    <a
                      href={item.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`relative z-10 flex items-center gap-3 w-full h-11 px-3 rounded-2xl text-sm font-medium transition-colors duration-200 ${
                        isActive ? "text-yellow-300" : "text-muted-foreground hover:text-foreground"
                      }`}
                      title={item.label}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="hidden xl:block truncate">{item.label}</span>
                    </a>
                  ) : (
                    <Link
                      to={item.path}
                      data-ocid={`sidebar.${item.label.toLowerCase()}_link`}
                      className={`relative z-10 flex items-center gap-3 w-full h-11 px-3 rounded-2xl text-sm font-medium transition-colors duration-200 ${
                        isActive ? "gradient-text font-semibold" : "text-muted-foreground hover:text-foreground"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                      title={item.label}
                    >
                      <Icon
                        className="h-5 w-5 shrink-0 transition-transform duration-200"
                        style={isActive ? {
                          color: "oklch(0.90 0.14 85)",
                          filter: "drop-shadow(0 0 8px oklch(0.80 0.22 70 / 0.8))",
                        } : {}}
                      />
                      <span className="hidden xl:block truncate">{item.label}</span>
                    </Link>
                  )}
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* Bottom controls */}
        <div className="p-3 border-t flex flex-col gap-2 shrink-0" style={{ borderColor: "rgba(212,175,55,0.08)" }}>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBadge />
          </div>
        </div>
      </nav>

      {/* ═══ MAIN CONTENT AREA ═══ */}
      <div className="flex flex-col flex-1 min-w-0 md:ml-20 xl:ml-64 relative gpu-layer">

        {/* ─── Mobile Top Header (Instagram-style) ─── */}
        <header
          className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 gpu-layer"
          style={{
            height: "52px",
            paddingTop: "max(env(safe-area-inset-top), 0px)",
            background: "rgba(7, 5, 1, 0.96)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            borderBottom: "1px solid rgba(212,175,55,0.12)",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center neon-glow-gold"
              style={{
                background: "linear-gradient(135deg, oklch(0.80 0.22 70 / 0.30), oklch(0.65 0.25 45 / 0.25))",
                border: "1px solid oklch(0.80 0.22 70 / 0.45)",
              }}
            >
              <img src="/assets/generated/socionet-logo-transparent.dim_200x200.png" alt="SOCIONET" className="h-4 w-4" />
            </div>
            <span
              className="text-base font-black tracking-tight select-none gradient-text"
              style={{ letterSpacing: "-0.3px" }}
            >
              SOCIONET
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <NotificationBadge />
          </div>
        </header>

        {/* ─── Page content ─── */}
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden w-full gpu-layer-soft"
          style={{
            paddingTop: "52px",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 72px)",
          }}
          id="main-scroll"
        >
          {/* Override for desktop */}
          <style>{`@media (min-width: 768px) { #main-scroll { padding-top: 16px; padding-bottom: 24px; } }`}</style>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPath}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="w-full min-h-full gpu-layer-soft"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ═══ MOBILE BOTTOM NAV ═══ */}
      <MobileNavbar />

      {/* ═══ GLOBAL CALL MANAGER — handles incoming calls on ANY page ═══ */}
      <GlobalCallManager />



      {/* ═══ PWA INSTALL PROMPT ═══ */}
      <InstallPWA />
    </div>
  );
}
