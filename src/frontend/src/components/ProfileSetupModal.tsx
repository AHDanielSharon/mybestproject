import { Sparkles } from "lucide-react";
import { useState } from "react";
import { useSaveCallerUserProfile } from "../hooks/useQueries";
import { Dialog, DialogContent } from "./ui/dialog";

export default function ProfileSetupModal() {
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const saveProfile = useSaveCallerUserProfile();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    saveProfile.mutate(
      {
        name: name.trim(),
        balance: BigInt(0),
      },
      {
        onSuccess: () => {
          // Immediately close the modal — don't wait for query cache to refresh
          setSaved(true);
        },
      }
    );
  };

  // Close as soon as saved
  if (saved) return null;

  return (
    <Dialog open={true}>
      <DialogContent
        className="sm:max-w-[360px] p-0 border-border/40 bg-card/90 backdrop-blur-2xl overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="animate-spring-in">
          {/* Gradient top accent */}
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-accent to-secondary" />

          <div className="px-6 py-7 space-y-6">
            {/* Icon + title */}
            <div className="text-center space-y-3">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center mx-auto">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Welcome to SOCIONET
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a display name to get started
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="setup-name"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  Display Name
                </label>
                <input
                  id="setup-name"
                  type="text"
                  placeholder="e.g. Nova Visuals"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  data-ocid="profile_setup.name_input"
                  className="glass-input w-full px-4 py-3 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={saveProfile.isPending || !name.trim()}
                data-ocid="profile_setup.submit_button"
                className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saveProfile.isPending ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>Let's go 🚀</>
                )}
              </button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
