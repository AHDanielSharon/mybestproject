import { Link, useRouterState } from "@tanstack/react-router";
import { Clapperboard, Home, MessageCircle, Search, User } from "lucide-react";
import { motion } from "motion/react";

const NAV_ITEMS = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/explore", icon: Search, label: "Explore" },
  { path: "/reels", icon: Clapperboard, label: "Reels" },
  { path: "/messages", icon: MessageCircle, label: "Messages" },
  { path: "/profile", icon: User, label: "Profile" },
];

const EASE = { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const };

export default function MobileNavbar() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden gpu-layer"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      data-ocid="mobile_bottom_nav"
    >
      {/* Top gold glow line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent 0%, oklch(0.80 0.17 70 / 0.5) 20%, oklch(0.88 0.12 85 / 0.8) 50%, oklch(0.80 0.17 70 / 0.5) 80%, transparent 100%)",
        }}
      />

      <div
        className="relative flex items-stretch"
        style={{
          height: "56px",
          background: "rgba(7, 5, 1, 0.97)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              data-ocid={`nav.${item.label.toLowerCase()}_link`}
              className="relative flex flex-col items-center justify-center flex-1 select-none"
              style={{ padding: "4px 4px 2px" }}
            >
              {/* Icon */}
              <div className="relative z-10 flex items-center justify-center" style={{ height: "28px", width: "28px" }}>
                <Icon
                  size={isActive ? 24 : 22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  style={
                    isActive
                      ? {
                          color: "oklch(0.90 0.14 85)",
                          filter: "drop-shadow(0 0 8px oklch(0.80 0.22 70 / 0.9))",
                        }
                      : { color: "oklch(0.45 0.04 60)" }
                  }
                />
              </div>

              {/* Label */}
              <span
                className="relative z-10 text-[10px] font-semibold mt-0.5 leading-none transition-colors duration-200"
                style={{
                  color: isActive
                    ? "oklch(0.88 0.14 80)"
                    : "oklch(0.35 0.03 60)",
                  letterSpacing: "0.01em",
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
