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
