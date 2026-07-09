"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-client";

interface MembershipType {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  durationDays: number;
  isActive: boolean;
}

const inputClass =
  "w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent";

export default function AdminMembershipTypesPage() {
  const [types, setTypes] = useState<MembershipType[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceCents, setPriceCents] = useState("");
  const [durationDays, setDurationDays] = useState("365");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const token = getAccessToken();
    if (!token) return;
    try {
      const result = await api.get<MembershipType[]>("/membership/types/admin/all", token);
      setTypes(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time fetch on mount
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const token = getAccessToken();
    if (!token) return;
    try {
      await api.post(
        "/membership/types",
        {
          name,
          description,
          priceCents: Number(priceCents),
          durationDays: Number(durationDays),
        },
        token,
      );
      setName("");
      setDescription("");
      setPriceCents("");
      setDurationDays("365");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create.");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Membership Types</h1>

      <form onSubmit={handleCreate} className="mt-6 grid gap-3 sm:grid-cols-2">
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={inputClass}
        />
        <input
          placeholder="Price (cents)"
          type="number"
          value={priceCents}
          onChange={(e) => setPriceCents(e.target.value)}
          required
          className={inputClass}
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className={`sm:col-span-2 ${inputClass}`}
        />
        <input
          placeholder="Duration (days)"
          type="number"
          value={durationDays}
          onChange={(e) => setDurationDays(e.target.value)}
          required
          className={inputClass}
        />
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Create
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <ul className="mt-8 divide-y divide-black/10 dark:divide-white/10">
        {types.map((type) => (
          <li key={type.id} className="py-3">
            <p className="font-medium">
              {type.name} {!type.isActive && <span className="text-xs text-black/40">(inactive)</span>}
            </p>
            <p className="text-sm text-black/60 dark:text-white/60">
              {(type.priceCents / 100).toLocaleString()} {type.currency} · {type.durationDays} days
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
