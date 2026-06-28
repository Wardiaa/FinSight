import { useState } from "react";
import { Redirect } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

export default function Auth() {
  const { user } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (user) {
    return <Redirect to="/" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "An error occurred during Google sign-in.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mr-32 -mt-32 w-[600px] h-[600px] bg-primary rounded-full opacity-10 blur-[2px]" />
      <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-[400px] h-[400px] bg-accent rotate-45 opacity-5 blur-[2px]" />

      <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-lg relative z-10">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground tracking-tight mb-2">
            Track Every Dollar.
          </h1>
          <p className="text-gray-500 font-medium">Gain clarity on your spending.</p>
        </div>

        <div className="flex bg-muted p-1 rounded-md mb-8">
          <button
            type="button"
            className={`flex-1 py-3 text-sm font-semibold rounded-sm transition-all cursor-pointer ${
              isLogin ? "bg-white text-foreground shadow-none" : "text-gray-500 hover:text-foreground"
            }`}
            onClick={() => {
              setIsLogin(true);
              setError(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`flex-1 py-3 text-sm font-semibold rounded-sm transition-all cursor-pointer ${
              !isLogin ? "bg-white text-foreground shadow-none" : "text-gray-500 hover:text-foreground"
            }`}
            onClick={() => {
              setIsLogin(false);
              setError(null);
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full bg-white text-foreground h-14 rounded-md font-semibold text-lg border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 disabled:opacity-70 cursor-pointer flex items-center justify-center gap-3 mb-6"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>{googleLoading ? "Please wait..." : `Continue with Google`}</span>
        </button>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500 font-medium">or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-destructive p-4 rounded-md text-sm font-medium border-l-4 border-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-muted text-foreground p-4 rounded-md outline-none focus:bg-white focus:border-2 focus:border-primary transition-all duration-200"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-muted text-foreground p-4 rounded-md outline-none focus:bg-white focus:border-2 focus:border-primary transition-all duration-200"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white h-14 rounded-md font-semibold text-lg hover:bg-blue-600 hover:scale-[1.02] transition-all duration-200 disabled:opacity-70 disabled:hover:scale-100 cursor-pointer"
          >
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}