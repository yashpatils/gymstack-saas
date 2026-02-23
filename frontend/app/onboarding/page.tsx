"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";
import { apiFetch } from "@/src/lib/apiFetch";
import { ApiFetchError } from "../../src/lib/apiFetch";
import { Alert, Button, Input, Spinner } from "../components/ui";
import { checkGymSlugAvailability, createGym } from "../../src/lib/gyms";
import { normalizeSlug } from "../../src/lib/slug";
import type { Gym } from "../../src/types/gym";
import { useAuth } from "../../src/providers/AuthProvider";
import { getApiError } from "../../src/lib/security";

type SlugStatus = "idle" | "checking" | "valid" | "invalid" | "taken" | "reserved" | "error";

export default function OnboardingPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [gymName, setGymName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [slugMessage, setSlugMessage] = useState("");
  const slugRequestSequence = useRef(0);

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

  useEffect(() => {
    const normalized = normalizeSlug(slug);

    if (!normalized) {
      setSlugStatus("idle");
      setSlugMessage("");
      return;
    }

    const timeout = setTimeout(async () => {
      const sequence = ++slugRequestSequence.current;
      setSlugStatus("checking");
      setSlugMessage("Checking slug availability...");

      try {
        const availability = await checkGymSlugAvailability(normalized);
        if (sequence !== slugRequestSequence.current) {
          return;
        }

        if (!availability.validFormat) {
          setSlugStatus(availability.reserved ? "reserved" : "invalid");
          setSlugMessage(availability.reason ?? "Invalid slug format");
          return;
        }

        if (availability.reserved) {
          setSlugStatus("reserved");
          setSlugMessage(availability.reason ?? "This slug is reserved");
          return;
        }

        if (!availability.available) {
          setSlugStatus("taken");
          setSlugMessage(availability.reason ?? "This slug is already in use");
          return;
        }

        setSlugStatus("valid");
        setSlugMessage(`Available: ${availability.slug}`);
      } catch {
        if (sequence !== slugRequestSequence.current) {
          return;
        }
        setSlugStatus("error");
        setSlugMessage("Could not check slug availability.");
      }
    }, 500);

    return () => {
      clearTimeout(timeout);
    };
  }, [slug]);

  useEffect(() => {
    const normalizedNameSlug = normalizeSlug(gymName);
    if (!normalizedNameSlug) {
      return;
    }

    setSlug((currentSlug) => {
      const normalizedCurrent = normalizeSlug(currentSlug);
      if (!normalizedCurrent || normalizedCurrent === normalizeSlug(gymName.trim())) {
        return normalizedNameSlug;
      }
      return currentSlug;
    });
  }, [gymName]);

  const handleCreateGym = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = gymName.trim();

    const normalizedSlug = normalizeSlug(slug);

    if (!name || !normalizedSlug) {
      return;
    }

    if (slugStatus !== "valid") {
      setError(slugMessage || "Please choose an available slug before continuing.");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      await createGym({ name, timezone, slug: normalizedSlug });
      await refreshUser();
      router.replace("/platform");
    } catch (createError) {
      if (createError instanceof ApiFetchError && createError.statusCode === 403) {
        setError("You already belong to a tenant and do not have permission to create another gym.");
      } else if (createError instanceof ApiFetchError) {
        const apiError = getApiError(createError);
        if (apiError.code === "SLUG_TAKEN" || apiError.code === "SLUG_RESERVED" || apiError.code === "SLUG_INVALID") {
          setError(apiError.message);
        } else {
          setError(createError.message);
        }
      } else {
        setError(createError instanceof Error ? createError.message : "Unable to create gym.");
      }
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
                <Input
                  label="Gym URL slug"
                  name="slug"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  helperText={slugMessage || "Used in your gym URL. Lowercase letters, numbers, and hyphens only."}
                  error={slugStatus === "invalid" || slugStatus === "reserved" || slugStatus === "taken" ? slugMessage : undefined}
                  required
                />
                <Button type="submit" disabled={creating || slugStatus !== "valid"}>
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
