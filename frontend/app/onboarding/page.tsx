"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";
import { apiFetch } from "../lib/api";
import { Alert, Button, Input, Spinner } from "../components/ui";

type Gym = {
  id: string;
  name: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [gymName, setGymName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdGym, setCreatedGym] = useState<Gym | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadGyms = async () => {
      setLoading(true);
      setError(null);

      try {
        const gyms = await apiFetch<Gym[]>("/api/gyms", { method: "GET" });

        if (!active) {
          return;
        }

        if (Array.isArray(gyms) && gyms.length > 0) {
          router.replace("/platform");
          return;
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load gyms.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadGyms();

    return () => {
      active = false;
    };
  }, [router]);

  const handleCreateGym = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = gymName.trim();

    if (!name) {
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const gym = await apiFetch<Gym>("/api/gyms", {
        method: "POST",
        body: { name },
      });
      setCreatedGym(gym);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create gym.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-slate-950 px-4 py-12 text-white sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/30">
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-sky-200/90">GymStack onboarding</p>
              <h1 className="mt-2 text-2xl font-semibold">Set up your first gym</h1>
            </div>

            {error ? <Alert>{error}</Alert> : null}

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Spinner />
                Checking your workspace...
              </div>
            ) : createdGym ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-200">
                  Success! <span className="font-medium text-white">{createdGym.name}</span> is ready.
                </p>
                <Button onClick={() => router.push("/platform")}>Go to dashboard</Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleCreateGym}>
                <Input
                  label="Gym name"
                  name="gymName"
                  value={gymName}
                  placeholder="Downtown Fitness"
                  onChange={(event) => setGymName(event.target.value)}
                  required
                />
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <>
                      <Spinner />
                      Creating gym...
                    </>
                  ) : (
                    "Create gym"
                  )}
                </Button>
              </form>
            )}
          </div>
        </section>
      </main>
    </ProtectedRoute>
  );
}
