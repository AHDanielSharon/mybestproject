import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Lock, Sparkles, ShieldCheck } from "lucide-react";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import ThemeToggle from "../components/ThemeToggle";
import { Button } from "../components/ui/button";
import { Strings } from "../Strings";

export default function LoginPage() {
  const { login, loginStatus, loginError } = useInternetIdentity();

  const handleLogin = useCallback(async () => {
    try {
      await login();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err?.message || Strings.login.failed);
    }
  }, [login]);

  useEffect(() => {
    if (loginStatus === "loginError" && loginError) {
      toast.error(loginError.message || Strings.login.failed);
    }
  }, [loginStatus, loginError]);

  const isLoggingIn = loginStatus === "logging-in";

  return (
    <div
      className="relative w-full min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#070500" }}
      data-ocid="login.page"
    >
      {/* ── Ambient gold orbs ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full animate-breathe"
          style={{
            background: "radial-gradient(circle, oklch(0.80 0.17 70 / 0.12) 0%, transparent 70%)",
            animationDuration: "6s",
          }}
        />
        <div
          className="absolute bottom-1/3 right-1/4 w-[450px] h-[450px] rounded-full animate-breathe"
          style={{
            background: "radial-gradient(circle, oklch(0.65 0.20 45 / 0.10) 0%, transparent 70%)",
            animationDuration: "8s",
            animationDelay: "2s",
          }}
        />
        <div
          className="absolute top-2/3 left-1/2 w-[350px] h-[350px] rounded-full animate-breathe"
          style={{
            background: "radial-gradient(circle, oklch(0.88 0.12 85 / 0.08) 0%, transparent 70%)",
            animationDuration: "7s",
            animationDelay: "1s",
          }}
        />
        {/* Gold particle grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "linear-gradient(oklch(0.80 0.17 70) 1px, transparent 1px), linear-gradient(90deg, oklch(0.80 0.17 70) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* ── Gold glass card ── */}
      <div
        className="relative z-10 w-full flex flex-col items-center gap-7 px-6 py-10 animate-scale-in"
        style={{
          maxWidth: 400,
          margin: "0 16px",
          background: "rgba(14, 10, 2, 0.88)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          borderRadius: "28px",
          border: "1px solid oklch(0.80 0.17 70 / 0.22)",
          boxShadow: "0 0 60px oklch(0.80 0.17 70 / 0.12), 0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 oklch(0.88 0.12 85 / 0.08)",
        }}
      >
        {/* Animated gold border glow */}
        <div
          className="absolute inset-0 rounded-[28px] pointer-events-none animate-border-glow"
          style={{ border: "1px solid transparent" }}
        />

        {/* ── Logo block ── */}
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            {/* Outer glow ring */}
            <div
              className="absolute -inset-3 rounded-[42px] animate-pulse-glow"
              style={{
                background: "radial-gradient(circle, oklch(0.80 0.17 70 / 0.15), transparent 70%)",
              }}
            />
            <div
              className="relative w-28 h-28 rounded-[32px] flex items-center justify-center neon-glow-gold animate-pulse-glow"
              style={{
                background: "linear-gradient(135deg, oklch(0.80 0.17 70 / 0.20) 0%, oklch(0.65 0.20 45 / 0.25) 50%, oklch(0.88 0.12 85 / 0.20) 100%)",
                border: "2px solid oklch(0.80 0.17 70 / 0.40)",
              }}
            >
              <img
                src="/assets/generated/socionet-logo-transparent.dim_200x200.png"
                alt={Strings.welcome.logoAlt}
                className="w-16 h-16 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            <Sparkles
              className="absolute -top-2 -right-2 h-6 w-6 animate-pulse"
              style={{ color: "oklch(0.88 0.12 85)", filter: "drop-shadow(0 0 6px oklch(0.80 0.17 70))" }}
            />
          </div>

          {/* App name */}
          <div className="text-center space-y-1.5">
            <h1
              className="text-4xl font-black tracking-tight animate-text-glow-shift gradient-text"
              style={{ letterSpacing: "-0.5px" }}
            >
              {Strings.welcome.logoAlt}
            </h1>
            <p className="text-sm font-semibold tracking-wide" style={{ color: "oklch(0.72 0.10 70)" }}>
              {Strings.login.nextGenNetwork}
            </p>
            <p
              className="text-xs tracking-[0.25em] uppercase font-mono"
              style={{ color: "oklch(0.55 0.08 65)" }}
            >
              {Strings.login.poweredBy}
            </p>
          </div>
        </div>

        {/* Gold divider */}
        <div className="gold-divider w-full" />

        {/* ── Login CTA ── */}
        <div className="w-full flex flex-col items-center gap-4">
          <Button
            onClick={handleLogin}
            disabled={isLoggingIn}
            size="lg"
            type="button"
            data-ocid="login.submit_button"
            className="w-full h-14 rounded-2xl text-base font-bold transition-all duration-200 active:scale-[0.97] relative overflow-hidden btn-gold border-0"
            style={{
              background: isLoggingIn
                ? "oklch(0.65 0.20 45 / 0.4)"
                : "linear-gradient(135deg, oklch(0.88 0.12 85) 0%, oklch(0.80 0.17 70) 50%, oklch(0.65 0.20 45) 100%)",
              color: isLoggingIn ? "rgba(255,220,100,0.6)" : "#1a1000",
              boxShadow: isLoggingIn ? "none" : "0 4px 24px oklch(0.80 0.17 70 / 0.4), 0 0 40px oklch(0.88 0.12 85 / 0.15), inset 0 1px 0 rgba(255,255,255,0.2)",
              border: "1px solid oklch(0.88 0.12 85 / 0.4)",
            }}
          >
            {/* Shimmer */}
            <span
              className="absolute inset-0 animate-shimmer pointer-events-none"
              style={{
                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
              }}
            />
            {isLoggingIn ? (
              <span className="flex items-center gap-3 relative z-10">
                <span className="h-5 w-5 rounded-full border-2 border-yellow-400/60 border-t-transparent animate-spin" />
                {Strings.login.connecting}
              </span>
            ) : (
              <span className="flex items-center gap-3 relative z-10">
                <Lock className="h-5 w-5" />
                {Strings.login.continue}
              </span>
            )}
          </Button>

          {/* Feature badges */}
          <div className="flex items-center gap-3 w-full">
            {[
              { icon: ShieldCheck, text: Strings.login.secured },
              { icon: Lock, text: Strings.login.noPassword },
              { icon: Sparkles, text: Strings.login.decentralized },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl"
                style={{
                  background: "rgba(212,175,55,0.05)",
                  border: "1px solid rgba(212,175,55,0.1)",
                }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color: "oklch(0.80 0.17 70)" }} />
                <span className="text-[10px] font-medium" style={{ color: "oklch(0.55 0.06 65)" }}>
                  {text}
                </span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-center leading-relaxed px-4" style={{ color: "rgba(200,160,60,0.4)" }}>
            {Strings.login.securedDesc}
            <br />
            {Strings.login.manifesto}
          </p>
        </div>

        {/* Bottom gold accent */}
        <div
          className="w-20 h-1 rounded-full"
          style={{
            background: "linear-gradient(90deg, oklch(0.65 0.20 45), oklch(0.80 0.17 70), oklch(0.88 0.12 85))",
            boxShadow: "0 0 12px oklch(0.80 0.17 70 / 0.5)",
          }}
        />
      </div>

      {/* Bottom hint */}
      <p
        className="relative z-10 mt-6 text-[11px] text-center"
        style={{ color: "oklch(0.40 0.05 60)" }}
      >
        {Strings.login.tapHint}
      </p>
    </div>
  );
}
