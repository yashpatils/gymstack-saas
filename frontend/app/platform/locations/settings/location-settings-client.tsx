"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/src/components/common/PageHeader";
import { SectionCard } from "@/src/components/common/SectionCard";
import { apiFetch } from "@/src/lib/apiFetch";

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
};

type BrandingForm = {
  displayName: string;
  logoUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryColor: string;
  accentGradient: string;
};

type DomainRequestResponse = {
  verificationToken: string;
  instructions?: {
    txt?: {
      host?: string;
      value?: string;
    };
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
  const [locations, setLocations] = useState<LocationSettings[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [brandingForm, setBrandingForm] = useState<BrandingForm>({
    displayName: "",
    logoUrl: "",
    heroTitle: "",
    heroSubtitle: "",
    primaryColor: "",
    accentGradient: "",
  });
  const [customDomain, setCustomDomain] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [verificationHost, setVerificationHost] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [isRequestingVerification, setIsRequestingVerification] = useState(false);
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const gyms = await apiFetch<LocationSettings[]>("/api/gyms", { method: "GET" });
        if (!active) return;

        setLocations(gyms);
        const firstLocationId = gyms[0]?.id ?? "";
        setSelectedLocationId(firstLocationId);

        if (gyms[0]) {
          setBrandingForm(toBrandingForm(gyms[0]));
          setCustomDomain(gyms[0].customDomain ?? "");
        }
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
  }, []);

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === selectedLocationId),
    [locations, selectedLocationId],
  );

  useEffect(() => {
    if (!selectedLocation) return;
    setBrandingForm(toBrandingForm(selectedLocation));
    setCustomDomain(selectedLocation.customDomain ?? "");
    setVerificationToken("");
    setVerificationHost("");
    setErrors({});
    setNotice(null);
    setError(null);
  }, [selectedLocation]);

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

      const updated = await apiFetch<LocationSettings>(`/api/gyms/${selectedLocation.id}`, {
        method: "PATCH",
        body: payload,
      });

      setLocations((existing) => existing.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      setNotice("Branding updated.");
      setErrors({});
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save location branding.");
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleRequestVerification = async () => {
    if (!selectedLocation) return;

    const nextErrors = validate();
    if (nextErrors.customDomain) {
      setErrors(nextErrors);
      return;
    }

    setIsRequestingVerification(true);
    setError(null);
    setNotice(null);

    try {
      const response = await apiFetch<DomainRequestResponse>("/api/domains/location/request-verification", {
        method: "POST",
        body: {
          locationId: selectedLocation.id,
          customDomain: customDomain.trim(),
        },
      });

      setVerificationToken(response.verificationToken);
      setVerificationHost(response.instructions?.txt?.host ?? `_gymstack-verification.${customDomain.trim()}`);
      setLocations((existing) => existing.map((item) => (
        item.id === selectedLocation.id
          ? { ...item, customDomain: customDomain.trim(), domainVerifiedAt: null }
          : item
      )));
      setNotice("Verification token created. Add the TXT record, then request verification.");
      setErrors({});
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to request verification.");
    } finally {
      setIsRequestingVerification(false);
    }
  };

  const handleVerifyDomain = async () => {
    if (!selectedLocation) return;

    setIsVerifyingDomain(true);
    setError(null);
    setNotice(null);

    try {
      const response = await apiFetch<{ domainVerifiedAt: string }>("/api/domains/location/verify", {
        method: "POST",
        body: { locationId: selectedLocation.id },
      });

      setLocations((existing) => existing.map((item) => (
        item.id === selectedLocation.id
          ? { ...item, customDomain: customDomain.trim() || item.customDomain, domainVerifiedAt: response.domainVerifiedAt }
          : item
      )));
      setNotice("Domain marked as verified.");
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Unable to verify domain.");
    } finally {
      setIsVerifyingDomain(false);
    }
  };

  const domainStatus = getDomainStatus(selectedLocation);
  const statusClasses = {
    "Not set": "bg-slate-500/20 text-slate-200",
    Pending: "bg-amber-500/20 text-amber-200",
    Verified: "bg-emerald-500/20 text-emerald-200",
  }[domainStatus];

  return (
    <section className="space-y-6">
      <PageHeader
        title="Location settings"
        subtitle="Manage branding and custom domains for each location."
      />

      <SectionCard title="Select location">
        {loading ? <p className="text-sm text-muted-foreground">Loading locations...</p> : null}
        {!loading ? (
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
        ) : null}
        {!loading && locations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Create a location first to manage branding and domain settings.</p>
        ) : null}
      </SectionCard>

      {selectedLocation ? (
        <>
          <SectionCard title="Branding">
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSaveBranding}>
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">Display name</span>
                <input
                  className="input"
                  value={brandingForm.displayName}
                  onChange={(event) => setBrandingForm((current) => ({ ...current, displayName: event.target.value }))}
                  placeholder="Downtown Gym"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">Logo URL</span>
                <input
                  className="input"
                  value={brandingForm.logoUrl}
                  onChange={(event) => setBrandingForm((current) => ({ ...current, logoUrl: event.target.value }))}
                  placeholder="https://cdn.example.com/logo.png"
                />
                {errors.logoUrl ? <p className="text-xs text-rose-300">{errors.logoUrl}</p> : null}
              </label>

              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">Hero title</span>
                <input
                  className="input"
                  value={brandingForm.heroTitle}
                  onChange={(event) => setBrandingForm((current) => ({ ...current, heroTitle: event.target.value }))}
                  placeholder="Train with confidence"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">Hero subtitle</span>
                <input
                  className="input"
                  value={brandingForm.heroSubtitle}
                  onChange={(event) => setBrandingForm((current) => ({ ...current, heroSubtitle: event.target.value }))}
                  placeholder="Book classes, track progress, and stay connected."
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">Primary color</span>
                <input
                  className="input"
                  value={brandingForm.primaryColor}
                  onChange={(event) => setBrandingForm((current) => ({ ...current, primaryColor: event.target.value }))}
                  placeholder="#4f46e5"
                />
                {errors.primaryColor ? <p className="text-xs text-rose-300">{errors.primaryColor}</p> : null}
              </label>

              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-slate-400">Accent gradient</span>
                <input
                  className="input"
                  value={brandingForm.accentGradient}
                  onChange={(event) => setBrandingForm((current) => ({ ...current, accentGradient: event.target.value }))}
                  placeholder="linear-gradient(135deg, #4f46e5, #22d3ee)"
                />
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
                <input
                  className="input"
                  value={customDomain}
                  onChange={(event) => setCustomDomain(event.target.value)}
                  placeholder="location.yourbrand.com"
                />
                {errors.customDomain ? <p className="text-xs text-rose-300">{errors.customDomain}</p> : null}
              </label>

              {(verificationToken || verificationHost) ? (
                <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4 text-sm text-slate-200 space-y-2">
                  <p className="font-medium text-slate-100">DNS verification (TXT record)</p>
                  <p>Host: <code className="text-indigo-200">{verificationHost || `_gymstack-verification.${customDomain}`}</code></p>
                  <p>Value: <code className="text-indigo-200">{verificationToken}</code></p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button className="button" type="button" onClick={handleRequestVerification} disabled={isRequestingVerification || !customDomain.trim()}>
                  {isRequestingVerification ? "Requesting..." : "Request verification"}
                </button>
                <button className="button secondary" type="button" onClick={handleVerifyDomain} disabled={isVerifyingDomain || domainStatus === "Not set"}>
                  {isVerifyingDomain ? "Verifying..." : "Verify now"}
                </button>
              </div>
            </div>
          </SectionCard>
        </>
      ) : null}

      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}
