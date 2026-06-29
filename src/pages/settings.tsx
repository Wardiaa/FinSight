import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { CURRENCIES } from "@/lib/exchange-rates";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Save, LogOut, Check } from "lucide-react";

export default function Settings() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      const { data } = await supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle();
      if (data && (data as any).base_currency) {
        setBaseCurrency((data as any).base_currency);
      }
      setLoading(false);
    }
    loadSettings();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    
    try {
      const { error } = await (supabase as any)
        .from("user_settings")
        .upsert({
          user_id: user.id,
          base_currency: baseCurrency,
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
      
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (err: any) {
      toast({ 
        title: "Error saving settings", 
        description: err.message, 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-10 font-medium text-muted-foreground text-sm">Loading settings...</div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-6 font-sans pb-24 md:pb-10">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <SettingsIcon size={24} className="text-muted-foreground" />
            Preferences
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your account and application settings.</p>
        </div>
      </header>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground mb-4">Localization</h2>
          <div className="max-w-md space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Base Currency</label>
            <p className="text-xs text-muted-foreground/70 mb-2">Used for dashboard totals and budget calculations.</p>
            <select
              value={baseCurrency}
              onChange={(e) => {
                setBaseCurrency(e.target.value);
                setSaved(false);
              }}
              className="w-full bg-background border border-input text-foreground px-4 py-3 rounded-md outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium"
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </div>
          
          <div className="mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-5 py-2.5 rounded-md font-medium text-sm transition-all duration-300 flex items-center gap-2 shadow-sm disabled:opacity-70 ${
                saved
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {saved ? (
                <>
                  <Check size={16} />
                  Changes Saved!
                </>
              ) : saving ? (
                "Saving..."
              ) : (
                <>
                  <Save size={16} />
                  Save Preferences
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground mb-4">Account</h2>
          <div className="max-w-md space-y-6">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email Address</label>
              <div className="mt-1 px-4 py-3 bg-muted/50 border rounded-md text-sm text-foreground font-medium">
                {user?.email}
              </div>
            </div>
            
            <button
              onClick={signOut}
              className="text-destructive border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 px-5 py-2.5 rounded-md font-medium text-sm transition-colors flex items-center gap-2"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}