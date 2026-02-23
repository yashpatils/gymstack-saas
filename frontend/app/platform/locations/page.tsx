"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageCard, PageContainer, PageHeader } from "../../../src/components/platform/page/primitives";
import { EmptyState, LoadingState } from "../../../src/components/platform/data";
import { checkGymSlugAvailability, createGym, listGyms, type Gym, updateGym } from "../../../src/lib/gyms";
import { normalizeSlug } from "../../../src/lib/slug";
import { useAuth } from "../../../src/providers/AuthProvider";

type LocationForm = {
  name: string;
  timezone: string;
  slug: string;
  address: string;
};

const initialForm: LocationForm = { name: "", timezone: "UTC", slug: "", address: "" };

export default function LocationsPage() {
  const router = useRouter();
  const { activeTenant, activeContext, chooseContext } = useAuth();
  const [locations, setLocations] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<LocationForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [slugHint, setSlugHint] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setLocations(await listGyms());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load locations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const normalized = normalizeSlug(form.slug);
      const availability = await checkGymSlugAvailability(normalized);
      if (!availability.available) {
        throw new Error(availability.reason ?? "Slug is unavailable");
      }

      if (editingId) {
        await updateGym(editingId, { ...form, slug: normalized });
      } else {
        const created = await createGym({ ...form, slug: normalized });
        const tenantId = activeTenant?.id ?? activeContext?.tenantId;
        if (tenantId) {
          await chooseContext(tenantId, created.id);
        }
        router.push("/platform/dashboard");
        return;
      }

      setForm(initialForm);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save location");
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = useMemo(() => form.name && form.timezone && form.slug, [form]);

  return (
    <PageContainer>
      <PageHeader title="Locations" description="Manage locations and active location context." />
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <PageCard title={editingId ? "Edit location" : "Create location"}>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
          <input className="input" placeholder="Timezone (e.g. America/New_York)" value={form.timezone} onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))} required />
          <input
            className="input"
            placeholder="Slug"
            value={form.slug}
            onChange={async (e) => {
              const raw = e.target.value;
              setForm((p) => ({ ...p, slug: raw }));
              if (!raw.trim()) {
                setSlugHint(null);
                return;
              }
              const result = await checkGymSlugAvailability(normalizeSlug(raw));
              setSlugHint(result.available ? "Slug available" : (result.reason ?? "Slug unavailable"));
            }}
            required
          />
          <input className="input" placeholder="Address" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
          <div className="md:col-span-2 flex gap-3">
            <button className="button" disabled={saving || !canSubmit} type="submit">{saving ? "Saving..." : editingId ? "Save location" : "Create location"}</button>
            {editingId ? <button className="button secondary" type="button" onClick={() => { setEditingId(null); setForm(initialForm); }}>Cancel edit</button> : null}
            {slugHint ? <p className="text-xs text-muted-foreground self-center">{slugHint}</p> : null}
          </div>
        </form>
      </PageCard>

      <PageCard title="All locations">
        {loading ? <LoadingState message="Loading locations..." /> : null}
        {!loading && locations.length === 0 ? <EmptyState title="No locations yet" description="Create your first location." /> : null}
        {!loading && locations.length > 0 ? (
          <div className="space-y-2">
            {locations.map((location) => (
              <div key={location.id} className="flex items-center justify-between rounded border border-border p-3">
                <div>
                  <p className="font-medium">{location.name}</p>
                  <p className="text-xs text-muted-foreground">{location.slug} · {location.timezone}</p>
                </div>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => {
                    setEditingId(location.id);
                    setForm({
                      name: location.name,
                      timezone: location.timezone,
                      slug: location.slug,
                      address: location.address ?? "",
                    });
                  }}
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </PageCard>
    </PageContainer>
  );
}
