"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/src/providers/AuthProvider";
import { PageHeader } from "@/src/components/common/PageHeader";
import { SectionCard } from "@/src/components/common/SectionCard";
import { ApiFetchError, apiFetch } from "@/src/lib/apiFetch";
import type { LocationBrandingUpdateInput, LocationDomainSetupResponse, LocationSettingsResponse } from "@/src/types/location-settings";

type LocationListItem = {
  id: string;
  name: string;
  displayName?: string | null;
};

type BrandingForm = {
  displayName: string;
  logoUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryColor: string;
  accentGradient: string;
};

type FieldErrors = Partial<Record<keyof BrandingForm | "customDomain", string>>;

const hexColorRegex = /^#(?:[0-9A-Fa-f]{3}){1,2}$/;
const hostnameRegex = /^(?=.{1,253}$)(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[A-Za-z]{2,63}$/;

function toBrandingForm(location: LocationSettingsResponse): BrandingForm {
  return {
    displayName: location.displayName ?? "",
    logoUrl: location.logoUrl ?? "",
    heroTitle: location.heroTitle ?? "",
    heroSubtitle: location.heroSubtitle ?? "",
    primaryColor: location.primaryColor ?? "",
    accentGradient: location.accentGradient ?? "",
  };
}

function getDomainStatus(location?: LocationSettingsResponse): "Not set" | "Pending" | "Verified" {
  if (!location?.customDomain) return "Not set";
  if (location.domainVerifiedAt) return "Verified";
  return "Pending";
}

export default function LocationSettingsClient({ initialLocationId }: { initialLocationId?: string }) {
  const router = useRouter();
  const { loading: authLoading, activeContext } = useAuth();
  const [locations, setLocations] = useState<LocationListItem[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState(initialLocationId ?? "");
  const [selectedLocation, setSelectedLocation] = useState<LocationSettingsResponse | null>(null);
  const [brandingForm, setBrandingForm] = useState<BrandingForm>({
    displayName: "",
    logoUrl: "",
    heroTitle: "",
    heroSubtitle: "",
    primaryColor: "",
    accentGradient: "",
  });
  const [savedBrandingForm, setSavedBrandingForm] = useState<BrandingForm>({
    displayName: "",
    logoUrl: "",
    heroTitle: "",
    heroSubtitle: "",
    primaryColor: "",
    accentGradient: "",
  });
  const [customDomain, setCustomDomain] = useState("");
  const [dnsTxtName, setDnsTxtName] = useState("");
  const [dnsTxtValue, setDnsTxtValue] = useState("");
  const [domainInstructions, setDomainInstructions] = useState("DNS changes may take time to propagate.");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [isSavingDomain, setIsSavingDomain] = useState(false);
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const canManageLocationSettings = useMemo(
    () => activeContext?.role === "TENANT_OWNER" || activeContext?.role === "TENANT_LOCATION_ADMIN",
    [activeContext?.role],
  );

  useEffect(() => {
    if (!initialLocationId) {
      return;
    }
    setSelectedLocationId(initialLocationId);
  }, [initialLocationId]);

  useEffect(() => {
    if (authLoading || !canManageLocationSettings) {
      setLoading(false);
      return;
    }

    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      setPermissionDenied(false);
      try {
        const gyms = await apiFetch<LocationListItem[]>("/api/gyms", { method: "GET" });
        if (!active) return;
        setLocations(gyms);
        if (!selectedLocationId) {
          setSelectedLocationId(gyms[0]?.id ?? "");
        }
      } catch (loadError) {
        if (!active) {
          return;
        }
        if (loadError instanceof ApiFetchError && loadError.statusCode === 401) {
          router.replace("/login");
          return;
        }
        if (loadError instanceof ApiFetchError && loadError.statusCode === 403) {
          setPermissionDenied(true);
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Unable to load locations.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [authLoading, canManageLocationSettings, router, selectedLocationId]);

  useEffect(() => {
    if (!selectedLocationId || !canManageLocationSettings) {
      setSelectedLocation(null);
      return;
    }

    let active = true;
    const loadLocationSettings = async () => {
      setError(null);
      setPermissionDenied(false);
      try {
        const details = await apiFetch<LocationSettingsResponse>(`/api/locations/${selectedLocationId}/branding`, { method: "GET" });
        if (!active) return;

        const mapped = toBrandingForm(details);
        setSelectedLocation(details);
        setBrandingForm(mapped);
        setSavedBrandingForm(mapped);
        setCustomDomain(details.customDomain ?? "");
        setDnsTxtName(details.customDomain ? "_gymstack" : "");
        setDnsTxtValue("");
        setNotice(null);
        setErrors({});
      } catch (loadError) {
        if (!active) {
          return;
        }
        if (loadError instanceof ApiFetchError && loadError.statusCode === 401) {
          router.replace("/login");
          return;
        }
        if (loadError instanceof ApiFetchError && loadError.statusCode === 403) {
          setPermissionDenied(true);
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Unable to load location settings.");
      }
    };

    void loadLocationSettings();

    return () => {
      active = false;
    };
  }, [canManageLocationSettings, router, selectedLocationId]);

  const validate = (): FieldErrors => {
    const nextErrors: FieldErrors = {};

    if (brandingForm.logoUrl.trim() && !/^https?:\/\//.test(brandingForm.logoUrl.trim())) {
      nextErrors.logoUrl = "Logo URL should start with http:// or https://.";
    }

    if (brandingForm.primaryColor.trim() && !hexColorRegex.test(brandingForm.primaryColor.trim())) {
      nextErrors.primaryColor = "Primary color must be a hex value like #4f46e5.";
    }

    if (customDomain.trim() && !hostnameRegex.test(customDomain.trim())) {
      nextErrors.customDomain = "Enter a valid domain like members.example.com.";
    }

    return nextErrors;
  };

  const handleSaveBranding = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedLocation) return;

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSavingBranding(true);
    setError(null);
    setNotice(null);

    try {
      const payload: LocationBrandingUpdateInput = {
        displayName: brandingForm.displayName.trim() || null,
        logoUrl: brandingForm.logoUrl.trim() || null,
        heroTitle: brandingForm.heroTitle.trim() || null,
        heroSubtitle: brandingForm.heroSubtitle.trim() || null,
        primaryColor: brandingForm.primaryColor.trim() || null,
        accentGradient: brandingForm.accentGradient.trim() || null,
      };

      const updated = await apiFetch<LocationSettingsResponse>(`/api/locations/${selectedLocation.id}/branding`, {
        method: "PATCH",
        body: payload,
      });

      const nextSaved = toBrandingForm({ ...selectedLocation, ...updated });
      setSavedBrandingForm(nextSaved);
      setBrandingForm(nextSaved);
      setSelectedLocation((current) => (current ? { ...current, ...updated } : current));
      setLocations((existing) => existing.map((item) => (
        item.id === updated.id
          ? { ...item, displayName: updated.displayName ?? item.displayName }
          : item
      )));
      setNotice("Branding updated successfully.");
      setErrors({});
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save location branding.");
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleSaveCustomDomain = async () => {
    if (!selectedLocation) return;

    const nextErrors = validate();
    if (nextErrors.customDomain) {
      setErrors(nextErrors);
      return;
    }

    setIsSavingDomain(true);
    setError(null);
    setNotice(null);

    try {
      const response = await apiFetch<LocationDomainSetupResponse>(`/api/locations/${selectedLocation.id}/custom-domain`, {
        method: "POST",
        body: {
          customDomain: customDomain.trim(),
        },
      });

      setSelectedLocation((current) => (
        current
          ? { ...current, customDomain: response.customDomain, domainVerifiedAt: response.status === "verified" ? new Date().toISOString() : null }
          : current
      ));
      setCustomDomain(response.customDomain ?? "");
      setDnsTxtName(response.txtRecord.name);
      setDnsTxtValue(response.txtRecord.value);
      setDomainInstructions(response.instructions);
      setNotice("Custom domain saved. Add the TXT record, then click Verify.");
      setErrors({});
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save custom domain.");
    } finally {
      setIsSavingDomain(false);
    }
  };

  const handleVerifyDomain = async () => {
    if (!selectedLocation) return;

    setIsVerifyingDomain(true);
    setError(null);
    setNotice(null);

    try {
      const response = await apiFetch<LocationDomainSetupResponse>(`/api/locations/${selectedLocation.id}/verify-domain`, {
        method: "POST",
      });

      setSelectedLocation((current) => (
        current
          ? {
            ...current,
            customDomain: response.customDomain,
            domainVerifiedAt: response.status === "verified" ? new Date().toISOString() : null,
          }
          : current
      ));
      setDnsTxtName(response.txtRecord.name);
      setDnsTxtValue(response.txtRecord.value);
      setDomainInstructions(response.instructions);
      setNotice(response.message ?? "Verification pending. Please allow DNS propagation.");
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Unable to verify domain.");
    } finally {
      setIsVerifyingDomain(false);
    }
  };

  const handleCopy = async (value: string) => {
    if (!value) {
      return;
    }
    await navigator.clipboard.writeText(value);
    setNotice("Copied to clipboard.");
  };

  const domainStatus = getDomainStatus(selectedLocation ?? undefined);
  const brandingDirty = JSON.stringify(brandingForm) !== JSON.stringify(savedBrandingForm);
  const statusClasses = {
    "Not set": "bg-slate-500/20 text-slate-200",
    Pending: "bg-amber-500/20 text-amber-200",
    Verified: "bg-emerald-500/20 text-emerald-200",
  }[domainStatus];

  if (authLoading || loading) {
    return <section className="space-y-6"><PageHeader title="Location settings" subtitle="Manage branding and custom domains for each location." /><p className="text-sm text-muted-foreground">Loading location settings...</p></section>;
  }

  if (!canManageLocationSettings || permissionDenied) {
    return (
      <section className="space-y-6">
        <PageHeader title="Location settings" subtitle="Manage branding and custom domains for each location." />
        <SectionCard title="Insufficient permissions">
          <p className="text-sm text-muted-foreground">Only tenant owners and location admins can access these settings.</p>
        </SectionCard>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader title="Location settings" subtitle="Manage branding and custom domains for each location." />

      <SectionCard title="Select location">
        <select
          className="input max-w-xl"
          value={selectedLocationId}
          onChange={(event) => {
            const nextLocationId = event.target.value;
            setSelectedLocationId(nextLocationId);
            router.replace(`/platform/locations/${nextLocationId}/settings`);
          }}
        >
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.displayName ?? location.name}
            </option>
          ))}
        </select>
      </SectionCard>

      {selectedLocation ? (
        <>
          <SectionCard title="Branding">
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSaveBranding}>
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">Display Name</span>
                <input className="input" value={brandingForm.displayName} onChange={(event) => setBrandingForm((current) => ({ ...current, displayName: event.target.value }))} placeholder="Downtown Gym" />
              </label>

              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">Logo URL</span>
                <input className="input" value={brandingForm.logoUrl} onChange={(event) => setBrandingForm((current) => ({ ...current, logoUrl: event.target.value }))} placeholder="https://cdn.example.com/logo.png" />
                {errors.logoUrl ? <p className="text-xs text-rose-300">{errors.logoUrl}</p> : null}
              </label>

              <div className="md:col-span-2 rounded-xl border border-white/10 bg-slate-900/30 p-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Logo preview</p>
                {brandingForm.logoUrl ? <Image src={brandingForm.logoUrl} alt="Location logo preview" width={48} height={48} className="h-12 w-12 rounded-full object-cover" unoptimized /> : <p className="text-sm text-muted-foreground">Add a logo URL to preview it here.</p>}
              </div>

              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">Primary color</span>
                <input className="input" value={brandingForm.primaryColor} onChange={(event) => setBrandingForm((current) => ({ ...current, primaryColor: event.target.value }))} placeholder="#4f46e5" />
                {errors.primaryColor ? <p className="text-xs text-rose-300">{errors.primaryColor}</p> : null}
              </label>

              <div className="rounded-xl border border-white/10 bg-slate-900/30 p-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Color swatch</p>
                <div className="h-8 w-20 rounded-md border border-white/20" style={{ background: brandingForm.primaryColor || "#1f2937" }} />
              </div>

              <label className="space-y-1 md:col-span-2">
                <span className="text-xs uppercase tracking-wide text-slate-400">Accent gradient</span>
                <textarea className="input min-h-[84px]" value={brandingForm.accentGradient} onChange={(event) => setBrandingForm((current) => ({ ...current, accentGradient: event.target.value }))} placeholder="linear-gradient(135deg, #4f46e5, #22d3ee)" />
              </label>

              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">Hero title</span>
                <input className="input" value={brandingForm.heroTitle} onChange={(event) => setBrandingForm((current) => ({ ...current, heroTitle: event.target.value }))} placeholder="Train with confidence" />
              </label>

              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">Hero subtitle</span>
                <textarea className="input min-h-[84px]" value={brandingForm.heroSubtitle} onChange={(event) => setBrandingForm((current) => ({ ...current, heroSubtitle: event.target.value }))} placeholder="Book classes, track progress, and stay connected." />
              </label>

              <div className="md:col-span-2 flex justify-end">
                <button className="button hover:brightness-110" type="submit" disabled={isSavingBranding || !brandingDirty}>
                  {isSavingBranding ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Custom domain">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Connect your own domain to this location.</p>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses}`}>{domainStatus}</span>
              </div>

              <label className="space-y-1 block">
                <span className="text-xs uppercase tracking-wide text-slate-400">Custom Domain</span>
                <input className="input" value={customDomain} onChange={(event) => setCustomDomain(event.target.value)} placeholder="members.somegym.com" />
                {errors.customDomain ? <p className="text-xs text-rose-300">{errors.customDomain}</p> : null}
              </label>

              {(dnsTxtValue || dnsTxtName) ? (
                <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4 text-sm text-slate-200 space-y-3">
                  <p className="font-medium text-slate-100">DNS verification (TXT record)</p>
                  <div className="flex items-center gap-2">
                    <p>Name: <code className="text-indigo-200">{dnsTxtName}</code></p>
                    <button className="button secondary h-8 px-3 hover:brightness-110" type="button" onClick={() => void handleCopy(dnsTxtName)}>Copy</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <p>Value: <code className="text-indigo-200">{dnsTxtValue}</code></p>
                    <button className="button secondary h-8 px-3 hover:brightness-110" type="button" onClick={() => void handleCopy(dnsTxtValue)}>Copy</button>
                  </div>
                  <p className="text-xs text-muted-foreground">{domainInstructions}</p>
                </div>
              ) : null}

              <p className="text-sm text-muted-foreground">DNS changes may take time to propagate.</p>

              <div className="flex flex-wrap gap-3">
                <button className="button h-10 px-4 hover:brightness-110" type="button" onClick={handleSaveCustomDomain} disabled={isSavingDomain || !customDomain.trim()}>
                  {isSavingDomain ? "Saving..." : "Set Domain"}
                </button>
                <button className="button secondary h-10 px-4 hover:brightness-110" type="button" onClick={handleVerifyDomain} disabled={isVerifyingDomain || domainStatus === "Not set"}>
                  {isVerifyingDomain ? "Verifying..." : "Verify"}
                </button>
              </div>
            </div>
          </SectionCard>

          {!selectedLocation.tenant.whiteLabelEnabled ? (
            <SectionCard title="White-label">
              <div className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 p-5 shadow-[0_0_0_1px_rgba(99,102,241,0.15)]">
                <p className="text-base font-semibold text-indigo-100">Remove Gym Stack Branding</p>
                <p className="mt-1 text-sm text-indigo-100/80">White-label your microsite with your own brand.</p>
                <button className="button mt-4 h-10 px-4 hover:brightness-110" type="button" onClick={() => router.push("/platform/billing")}>Upgrade</button>
              </div>
            </SectionCard>
          ) : (
            <SectionCard title="White-label">
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">White-label enabled</span>
            </SectionCard>
          )}
        </>
      ) : null}

      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}
