"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../components/ui";
import { apiFetch } from "../../src/lib/api";

export default function LoginPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    try {
      const response = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        if (errorText.includes("Cannot GET")) {
          setError("Cannot GET: check the login route or HTTP method.");
          return;
        }
        throw new Error("Login failed");
      }

      const data = (await response.json()) as { accessToken?: string };

      if (!data.accessToken) {
        throw new Error("Missing access token");
      }

      localStorage.setItem("accessToken", data.accessToken);
      setMessage("Login successful.");
      router.push("/dashboard");
    } catch (submitError) {
      setError("Unable to complete login.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-slate-900/60 p-8">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
            GymStack
          </p>
          <h1 className="text-3xl font-semibold">Welcome back</h1>
          <p className="text-sm text-slate-300">
            Log in to manage your gyms and members.
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm text-slate-200">
            Email
            <input
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-200">
            Password
            <input
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <Button className="w-full" type="submit">
            Log in
          </Button>
        </form>
        {message && <p className="text-sm text-emerald-300">{message}</p>}
        {error && <p className="text-sm text-rose-300">{error}</p>}
      </div>
    </div>
  );
}
