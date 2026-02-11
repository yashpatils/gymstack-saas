"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../../../src/lib/api";

type OrganizationResponse = {
  id: string;
  name: string;
  createdAt: string;
};

export default function PlatformSettingsPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadOrg = async () => {
      try {
        const org = await apiFetch<OrganizationResponse>("/api/org", {
          method: "GET",
        });

        if (isMounted) {
          setName(org.name);
        }
      } catch {
        if (isMounted) {
          setMessage("Unable to load organization settings.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadOrg();

    return () => {
      isMounted = false;
    };
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const updated = await apiFetch<OrganizationResponse>("/api/org", {
        method: "PATCH",
        body: { name },
      });

      setName(updated.name);
      setMessage("Organization name updated.");
    } catch {
      setMessage("Unable to update organization name.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page">
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">Manage your organization details.</p>

      <form onSubmit={onSubmit} style={{ marginTop: "1.5rem", maxWidth: "28rem" }}>
        <label htmlFor="org-name" className="label">
          Organization name
        </label>
        <input
          id="org-name"
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={loading || saving}
          minLength={2}
          required
        />

        <button
          type="submit"
          className="button"
          disabled={loading || saving}
          style={{ marginTop: "0.75rem" }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </form>

      {message ? <p style={{ marginTop: "0.75rem" }}>{message}</p> : null}
    </section>
  );
}
