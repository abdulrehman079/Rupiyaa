"use client";

import { useState } from "react";
import {
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth-context";
import { withViewTransition } from "@/lib/view-transition";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup" | "reset";
type Step = "welcome" | "auth";

export function LandingPage() {
  const [step, setStep] = useState<Step>("welcome");
  const [mode, setMode] = useState<Mode>("signin");

  const goToAuth = () => withViewTransition(() => setStep("auth"));
  const goToWelcome = () => withViewTransition(() => setStep("welcome"));

  if (step === "welcome") {
    return <WelcomeScreen onContinue={goToAuth} />;
  }
  return (
    <AuthScreen mode={mode} setMode={setMode} onBack={goToWelcome} />
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Decorative SVGs                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

function HeroPattern() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-25 mix-blend-overlay anim-drift"
      viewBox="0 0 400 600"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="hp-rg" cx="50%" cy="20%" r="80%">
          <stop offset="0%" stopColor="white" stopOpacity="0.4" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="600" fill="url(#hp-rg)" />
      {/* Topographic-style curves */}
      {Array.from({ length: 14 }).map((_, i) => {
        const y = 80 + i * 36;
        return (
          <path
            key={i}
            d={`M-40,${y} Q 100,${y - 30} 200,${y} T 440,${y - 10}`}
            stroke="white"
            strokeOpacity={0.35 - i * 0.02}
            strokeWidth={1.2}
            fill="none"
          />
        );
      })}
      {/* Soft floating orbs */}
      <circle cx="80" cy="120" r="60" fill="white" fillOpacity="0.06" />
      <circle cx="320" cy="80" r="40" fill="white" fillOpacity="0.08" />
      <circle cx="300" cy="320" r="80" fill="white" fillOpacity="0.05" />
    </svg>
  );
}

function WaveDivider({ className }: { className?: string }) {
  return (
    <svg
      className={cn("block w-full h-12 lg:h-16 -mb-px", className)}
      viewBox="0 0 400 60"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {/* Fills with the surface color the form sits on */}
      <path
        d="M0,30 C80,5 160,55 240,30 C320,5 360,40 400,28 L400,60 L0,60 Z"
        className="fill-background"
      />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Welcome screen                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

function WelcomeScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="min-h-screen flex flex-col bg-primary text-zinc-900 overflow-hidden">
      {/* Hero (top ~65%) */}
      <div
        className="relative flex-1 flex flex-col items-center justify-center px-6"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 2rem)" }}
      >
        <HeroPattern />
        <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto">
          <img
            src="/logo.png"
            alt="Rupiyaa"
            className="anim-float w-28 h-28 lg:w-36 lg:h-36 rounded-3xl object-cover shadow-2xl mb-4"
          />
          <h1 className="text-5xl lg:text-6xl font-bold tracking-tight">
            Rupiyaa
          </h1>
          <p className="text-xs uppercase tracking-[0.3em] font-semibold opacity-80 mt-3">
            Personal Finance
          </p>
        </div>
      </div>

      {/* Wave divider */}
      <WaveDivider />

      {/* Bottom welcome panel */}
      <div
        className="bg-background text-foreground px-6 pt-2 pb-8"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}
      >
        <div className="max-w-md mx-auto flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Welcome
            </h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Track expenses, split bills, and stay on top of every rupee.
            </p>
          </div>
          <button
            type="button"
            onClick={onContinue}
            aria-label="Continue"
            className="shrink-0 inline-flex items-center gap-2 pl-4 pr-2 py-2 rounded-full bg-primary text-zinc-900 shadow-[0_8px_24px_-6px_rgba(233,168,37,0.6)] active:scale-95 transition-transform"
          >
            <span className="text-sm font-semibold">Continue</span>
            <span className="grid place-items-center h-9 w-9 rounded-full bg-zinc-900/15">
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Auth screen                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

type AuthScreenProps = {
  mode: Mode;
  setMode: (m: Mode) => void;
  onBack: () => void;
};

function AuthScreen({ mode, setMode, onBack }: AuthScreenProps) {
  const { signInEmail, signUpEmail, signInGoogle, resetPassword } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setError(null);
    setInfo(null);
  };
  const switchMode = (m: Mode) => {
    if (m === mode) return;
    withViewTransition(() => {
      setError(null);
      setInfo(null);
      setMode(m);
    });
  };

  const handleGoogle = async () => {
    reset();
    setBusy(true);
    try {
      await signInGoogle();
    } catch (e: unknown) {
      setError(prettyError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInEmail(email.trim(), password);
      } else if (mode === "signup") {
        if (password.length < 6) {
          setError("Password must be at least 6 characters.");
          return;
        }
        await signUpEmail(email.trim(), password, name.trim() || undefined);
      } else {
        await resetPassword(email.trim());
        setInfo("Password reset email sent. Check your inbox.");
      }
    } catch (err: unknown) {
      setError(prettyError(err));
    } finally {
      setBusy(false);
    }
  };

  const heading =
    mode === "signin"
      ? "Sign in"
      : mode === "signup"
        ? "Create account"
        : "Reset password";

  return (
    <div className="min-h-screen flex flex-col bg-primary text-zinc-900">
      {/* Top hero strip */}
      <div
        className="relative px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
      >
        <HeroPattern />
        <div className="relative z-10 flex items-center gap-3 max-w-md mx-auto">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="h-10 w-10 rounded-full grid place-items-center bg-zinc-900/15 active:scale-95 transition-transform"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Rupiyaa"
              className="w-9 h-9 rounded-xl object-cover"
            />
            <span className="font-semibold">Rupiyaa</span>
          </div>
        </div>
        <div className="relative z-10 max-w-md mx-auto pt-12 pb-10">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
            {heading}
          </h1>
          <div className="h-1 w-12 bg-zinc-900/80 rounded-full mt-2" />
        </div>
      </div>

      {/* Wave divider */}
      <WaveDivider />

      {/* Form panel */}
      <div
        className="flex-1 bg-background text-foreground px-6 pt-6"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}
      >
        <div className="max-w-md mx-auto">
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "signup" && (
              <Field
                label="Name"
                icon={<UserGlyph />}
                value={name}
                onChange={setName}
                placeholder="Your name"
                autoComplete="name"
              />
            )}

            <Field
              label="Email"
              icon={<Mail className="h-4 w-4 text-muted-foreground" />}
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              autoComplete="email"
              required
              inputMode="email"
            />

            {mode !== "reset" && (
              <Field
                label="Password"
                icon={<Lock className="h-4 w-4 text-muted-foreground" />}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={setPassword}
                placeholder="Enter your password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={6}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="p-1 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
              />
            )}

            {mode === "signin" && (
              <div className="flex items-center justify-between text-sm">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={remember}
                    onCheckedChange={(c) => setRemember(!!c)}
                    aria-label="Remember me"
                  />
                  <span className="text-muted-foreground">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => switchMode("reset")}
                  className="text-primary font-medium hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {info && (
              <p className="text-sm text-accent bg-accent/10 border border-accent/30 rounded-lg px-3 py-2">
                {info}
              </p>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="w-full h-12 rounded-full text-base font-semibold shadow-[0_8px_24px_-6px_rgba(233,168,37,0.5)]"
            >
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === "signin"
                ? "Login"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset email"}
            </Button>

            {mode !== "reset" && (
              <>
                <div className="relative my-1">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <span className="relative bg-background px-3 text-xs text-muted-foreground mx-auto block w-fit">
                    or continue with
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "group relative w-full h-12 rounded-full overflow-hidden shadow-sm transition-all duration-300",
                    // hover: subtle lift with a soft gold ring (primary is gold in both themes)
                    "hover:bg-secondary hover:text-foreground",
                    "hover:shadow-[0_10px_28px_-8px_color-mix(in_oklab,var(--primary)_45%,transparent)]",
                    "hover:ring-2 hover:ring-primary/30 hover:border-primary/40",
                  )}
                  onClick={handleGoogle}
                  disabled={busy}
                >
                  {/* Shimmer sweep on hover — gold tint, theme-agnostic */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-linear-to-r from-transparent via-primary/20 to-transparent skew-x-[-20deg] translate-x-[-50%] group-hover:translate-x-[400%] transition-transform duration-1000 ease-out"
                  />
                  <GoogleGlyph className="h-4 w-4 mr-2" />
                  <span className="relative">Continue with Google</span>
                </Button>
              </>
            )}
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === "signin" && (
              <>
                Don&apos;t have an Account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="text-primary font-semibold hover:underline"
                >
                  Sign up
                </button>
              </>
            )}
            {mode === "signup" && (
              <>
                Already have one?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="text-primary font-semibold hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
            {mode === "reset" && (
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="text-primary font-semibold hover:underline"
              >
                Back to sign in
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Small bits                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

type FieldProps = {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  inputMode?: "email" | "text" | "numeric" | "tel" | "url" | "search" | "none" | "decimal";
  trailing?: React.ReactNode;
};

function Field({
  label,
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  required,
  minLength,
  inputMode,
  trailing,
}: FieldProps) {
  const id = `f-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2 border-b border-border focus-within:border-primary transition-colors pb-1">
        <span className="shrink-0">{icon}</span>
        <input
          id={id}
          type={type}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm py-1.5 placeholder:text-muted-foreground/60"
        />
        {trailing}
      </div>
    </div>
  );
}

function UserGlyph() {
  return (
    <svg
      className="h-4 w-4 text-muted-foreground"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.92h5.45c-.24 1.4-.97 2.59-2.06 3.38v2.81h3.33c1.95-1.8 3.07-4.45 3.07-7.59 0-.71-.06-1.4-.18-2.06H12z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.33-2.58c-.92.62-2.1.99-3.29.99-2.53 0-4.67-1.7-5.43-4H3.13v2.5C4.78 19.98 8.13 22 12 22z"
      />
      <path
        fill="#FBBC05"
        d="M6.57 13.98c-.2-.6-.31-1.24-.31-1.98s.11-1.38.31-1.98V7.52H3.13C2.41 8.92 2 10.42 2 12s.41 3.08 1.13 4.48l3.44-2.5z"
      />
      <path
        fill="#4285F4"
        d="M12 5.96c1.47 0 2.78.5 3.81 1.48l2.85-2.85C16.95 2.93 14.7 2 12 2 8.13 2 4.78 4.02 3.13 7.52l3.44 2.5C7.33 7.66 9.47 5.96 12 5.96z"
      />
    </svg>
  );
}

function prettyError(e: unknown): string {
  const err = (e || {}) as { code?: string; message?: string };
  const code: string = err.code || "";
  switch (code) {
    case "auth/invalid-email":
      return "That email doesn't look right.";
    case "auth/user-not-found":
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Email or password is incorrect.";
    case "auth/email-already-in-use":
      return "An account with that email already exists. Try signing in.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/popup-closed-by-user":
      return "Sign-in popup closed before completing.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again in a moment.";
    case "auth/operation-not-allowed":
      return "This sign-in method isn't enabled in Firebase yet.";
    default:
      return err.message || "Something went wrong. Please try again.";
  }
}
