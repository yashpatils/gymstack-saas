"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/providers/AuthProvider";
import { PageHeader } from "@/src/components/common/PageHeader";
import { SectionCard } from "@/src/components/common/SectionCard";
import { apiFetch } from "@/src/lib/apiFetch";

type LocationListItem = {
  id: string;
  name: string;
  displayName?: string | null;
};

type LocationSettings = {
  id: string;
  name: string;
  displayName?: string | null;
  logoUrl?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  primaryColor?: string | null;
  accentGradient?: string | null;
  customDomain?: string | null;
  domainVerifiedAt?: string | null;
  tenant?: {
    id: string;
    whiteLabelEnabled: boolean;
  };
};

type BrandingForm = {
  displayName: string;
  logoUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryColor: string;
  accentGradient: string;
};

type DomainResponse = {
  locationId: string;
  customDomain: string | null;
  domainVerifiedAt: string | null;
  status?: "pending_verification" | "verified";
  dnsInstructions: {
    txtRecord: {
      type: "TXT";
      name: string | null;
      value: string;
    };
    cnameGuidance: string;
  };
};

type FieldErrors = Partial<Record<keyof BrandingForm | "customDomain", string>>;

const hexColorRegex = /^#(?:[0-9A-Fa-f]{3}){1,2}$/;
const hostnameRegex = /^(?=.{1,253}$)(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[A-Za-z]{2,63}$/;

function toBrandingForm(location: LocationSettings): BrandingForm {
  return {
    displayName: location.displayName ?? "",
    logoUrl: location.logoUrl ?? "",
    heroTitle: location.heroTitle ?? "",
    heroSubtitle: location.heroSubtitle ?? "",
    primaryColor: location.primaryColor ?? "",
    accentGradient: location.accentGradient ?? "",
  };
}

function getDomainStatus(location?: LocationSettings): "Not set" | "Pending" | "Verified" {
  if (!location?.customDomain) return "Not set";
  if (location.domainVerifiedAt) return "Verified";
  return "Pending";
}

export default function LocationSettingsClient() {
  const { loading: authLoading, permissions, permissionKeys, activeContext, tenantFeatures } = useAuth();
  const [locations, setLocations] = useState<LocationListItem[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<LocationSettings | null>(null);
  const [brandingForm, setBrandingForm] = useState<BrandingForm>({
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
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [isSavingDomain, setIsSavingDomain] = useState(false);
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
  const [isManuallyVerifyingDomain, setIsManuallyVerifyingDomain] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canManageLocationSettings = useMemo(
    () =>
      permissions.canManageLocations
      || permissions.canManageTenant
      || permissionKeys.includes("location:manage")
      || permissionKeys.includes("locations:update")
      || activeContext?.role === "TENANT_OWNER"
      || activeContext?.role === "TENANT_LOCATION_ADMIN",
    [activeContext?.role, permissionKeys, permissions.canManageLocations, permissions.canManageTenant],
  );

  useEffect(() => {
    if (authLoading || !canManageLocationSettings) {
      setLoading(false);
      return;
    }

    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const gyms = await apiFetch<LocationListItem[]>("/api/gyms", { method: "GET" });
        if (!active) return;
        setLocations(gyms);
        setSelectedLocationId(gyms[0]?.id ?? "");
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load locations.");
        }
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
  }, [authLoading, canManageLocationSettings]);

  useEffect(() => {
    if (!selectedLocationId || !canManageLocationSettings) {
      setSelectedLocation(null);
      return;
    }

    let active = true;
    const loadLocationSettings = async () => {
      setError(null);
      try {
        const details = await apiFetch<LocationSettings>(`/api/locations/${selectedLocationId}/branding`, { method: "GET" });
        if (!active) return;

        setSelectedLocation(details);
        setBrandingForm(toBrandingForm(details));
        setCustomDomain(details.customDomain ?? "");
        setDnsTxtName("");
        setDnsTxtValue("");
        setNotice(null);
        setErrors({});
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load location settings.");
        }
      }
    };

    void loadLocationSettings();

    return () => {
      active = false;
    };
  }, [canManageLocationSettings, selectedLocationId]);

  const validate = (): FieldErrors => {
    const nextErrors: FieldErrors = {};

    if (brandingForm.logoUrl.trim() && !/^https?:\/\//.test(brandingForm.logoUrl.trim())) {
      nextErrors.logoUrl = "Logo URL should start with http:// or https://.";
    }

    if (brandingForm.primaryColor.trim() && !hexColorRegex.test(brandingForm.primaryColor.trim())) {
      nextErrors.primaryColor = "Primary color must be a hex value like #4f46e5.";
    }

    if (customDomain.trim() && !hostnameRegex.test(customDomain.trim())) {
      nextErrors.customDomain = "Enter a valid domain like locations.example.com.";
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
      const payload = {
        displayName: brandingForm.displayName.trim() || null,
        logoUrl: brandingForm.logoUrl.trim() || null,
        heroTitle: brandingForm.heroTitle.trim() || null,
        heroSubtitle: brandingForm.heroSubtitle.trim() || null,
        primaryColor: brandingForm.primaryColor.trim() || null,
        accentGradient: brandingForm.accentGradient.trim() || null,
      };

      const updated = await apiFetch<LocationSettings>(`/api/locations/${selectedLocation.id}/branding`, {
        method: "PATCH",
        body: payload,
      });

      setSelectedLocation((current) => (current ? { ...current, ...updated } : current));
      setLocations((existing) => existing.map((item) => (
        item.id === updated.id
          ? { ...item, displayName: updated.displayName ?? item.displayName }
          : item
      )));
      setNotice("Branding updated.");
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
      const response = await apiFetch<DomainResponse>(`/api/locations/${selectedLocation.id}/custom-domain`, {
        method: "POST",
        body: {
          customDomain: customDomain.trim(),
        },
      });

      setSelectedLocation((current) => (
        current
          ? { ...current, customDomain: response.customDomain, domainVerifiedAt: response.domainVerifiedAt }
          : current
      ));
      setCustomDomain(response.customDomain ?? "");
      setDnsTxtName(response.dnsInstructions.txtRecord.name ?? "");
      setDnsTxtValue(response.dnsInstructions.txtRecord.value);
      setNotice("Custom domain saved. Add the TXT record, then request verification.");
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
      const response = await apiFetch<DomainResponse>(`/api/locations/${selectedLocation.id}/verify-domain`, {
        method: "POST",
      });

      setSelectedLocation((current) => (
        current
          ? { ...current, customDomain: response.customDomain, domainVerifiedAt: response.domainVerifiedAt }
          : current
      ));
      setDnsTxtName(response.dnsInstructions.txtRecord.name ?? "");
      setDnsTxtValue(response.dnsInstructions.txtRecord.value);
      setNotice("Verification request recorded. Domain will remain pending until proof is confirmed.");
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Unable to verify domain.");
    } finally {
      setIsVerifyingDomain(false);
    }
  };

  const handleManualVerifyDomain = async () => {
    if (!selectedLocation) return;

    setIsManuallyVerifyingDomain(true);
    setError(null);
    setNotice(null);

    try {
      const response = await apiFetch<DomainResponse>(`/api/locations/${selectedLocation.id}/verify-domain`, {
        method: "POST",
        body: { manualVerify: true },
      });

      setSelectedLocation((current) => (
        current
          ? { ...current, customDomain: response.customDomain, domainVerifiedAt: response.domainVerifiedAt }
          : current
      ));
      setDnsTxtName(response.dnsInstructions.txtRecord.name ?? "");
      setDnsTxtValue(response.dnsInstructions.txtRecord.value);
      setNotice("Domain manually marked as verified for MVP rollout.");
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Unable to manually verify domain.");
    } finally {
      setIsManuallyVerifyingDomain(false);
    }
  };

  const domainStatus = getDomainStatus(selectedLocation ?? undefined);
  const statusClasses = {
    "Not set": "bg-slate-500/20 text-slate-200",
    Pending: "bg-amber-500/20 text-amber-200",
    Verified: "bg-emerald-500/20 text-emerald-200",
  }[domainStatus];

  if (authLoading || loading) {
    return <section className="space-y-6"><PageHeader title="Location settings" subtitle="Manage branding and custom domains for each location." /><p className="text-sm text-muted-foreground">Loading location settings...</p></section>;
  }

  if (!canManageLocationSettings) {
    return (
      <section className="space-y-6">
        <PageHeader title="Location settings" subtitle="Manage branding and custom domains for each location." />
        <SectionCard title="Access denied">
          <p className="text-sm text-muted-foreground">Only tenant owners or location admins can access location branding and domain controls.</p>
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
          onChange={(event) => setSelectedLocationId(event.target.value)}
        >
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.displayName ?? location.name}
            </option>
          ))}
        </select>
        {locations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Create a location first to manage branding and domain settings.</p>
        ) : null}
      </SectionCard>

      {selectedLocation ? (
        <>
          <SectionCard title="Branding">
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSaveBranding}>
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">Display name</span>
                <input className="input" value={brandingForm.displayName} onChange={(event) => setBrandingForm((current) => ({ ...current, displayName: event.target.value }))} placeholder="Downtown Gym" />
              </label>

              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">Logo URL</span>
                <input className="input" value={brandingForm.logoUrl} onChange={(event) => setBrandingForm((current) => ({ ...current, logoUrl: event.target.value }))} placeholder="https://cdn.example.com/logo.png" />
                {errors.logoUrl ? <p className="text-xs text-rose-300">{errors.logoUrl}</p> : null}
              </label>

              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">Hero title</span>
                <input className="input" value={brandingForm.heroTitle} onChange={(event) => setBrandingForm((current) => ({ ...current, heroTitle: event.target.value }))} placeholder="Train with confidence" />
              </label>

              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">Hero subtitle</span>
                <input className="input" value={brandingForm.heroSubtitle} onChange={(event) => setBrandingForm((current) => ({ ...current, heroSubtitle: event.target.value }))} placeholder="Book classes, track progress, and stay connected." />
              </label>

              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">Primary color</span>
                <input className="input" value={brandingForm.primaryColor} onChange={(event) => setBrandingForm((current) => ({ ...current, primaryColor: event.target.value }))} placeholder="#4f46e5" />
                {errors.primaryColor ? <p className="text-xs text-rose-300">{errors.primaryColor}</p> : null}
              </label>

              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">Accent gradient</span>
                <input className="input" value={brandingForm.accentGradient} onChange={(event) => setBrandingForm((current) => ({ ...current, accentGradient: event.target.value }))} placeholder="linear-gradient(135deg, #4f46e5, #22d3ee)" />
              </label>

              <div className="md:col-span-2 flex justify-end">
                <button className="button" type="submit" disabled={isSavingBranding}>
                  {isSavingBranding ? "Saving..." : "Save branding"}
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
                <span className="text-xs uppercase tracking-wide text-slate-400">Custom domain</span>
                <input className="input" value={customDomain} onChange={(event) => setCustomDomain(event.target.value)} placeholder="location.yourbrand.com" />
                {errors.customDomain ? <p className="text-xs text-rose-300">{errors.customDomain}</p> : null}
              </label>

              {(dnsTxtValue || dnsTxtName) ? (
                <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4 text-sm text-slate-200 space-y-2">
                  <p className="font-medium text-slate-100">DNS verification (TXT record)</p>
                  <p>Host: <code className="text-indigo-200">{dnsTxtName || customDomain}</code></p>
                  <p>Value: <code className="text-indigo-200">{dnsTxtValue}</code></p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button className="button" type="button" onClick={handleSaveCustomDomain} disabled={isSavingDomain || !customDomain.trim()}>
                  {isSavingDomain ? "Saving..." : "Save custom domain"}
                </button>
                <button className="button secondary" type="button" onClick={handleVerifyDomain} disabled={isVerifyingDomain || domainStatus === "Not set"}>
                  {isVerifyingDomain ? "Requesting..." : "Request verification"}
                </button>
                <button
                  className="button secondary"
                  type="button"
                  onClick={handleManualVerifyDomain}
                  disabled={isManuallyVerifyingDomain || domainStatus === "Not set" || domainStatus === "Verified"}
                >
                  {isManuallyVerifyingDomain ? "Verifying..." : "Mark verified (MVP)"}
                </button>
              </div>
            </div>
          </SectionCard>

          {!((selectedLocation.tenant?.whiteLabelEnabled ?? tenantFeatures?.whiteLabelEnabled ?? false)) ? (
            <SectionCard title="White-label branding">
              <p className="text-sm text-muted-foreground">Remove Gym Stack branding from your microsites.</p>
              <div className="mt-4 rounded-lg border border-indigo-400/30 bg-indigo-500/10 p-4">
                <p className="text-sm text-indigo-100">Upgrade to white-label to remove the microsite footer branding. Coming soon in billing.</p>
              </div>
            </SectionCard>
          ) : null}
        </>
      ) : null}

      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}
