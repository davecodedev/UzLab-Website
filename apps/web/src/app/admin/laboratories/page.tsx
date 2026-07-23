"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-client";

interface Laboratory {
  id: string;
  name: string;
  fields: string[];
  accreditationStatus: string;
  isPublished: boolean;
  source: string;
}

const FIELDS = [
  "TESTING",
  "METROLOGY",
  "MEDICINE",
  "ECOLOGY",
  "INDUSTRY",
  "AGRICULTURE",
  "FOOD",
  "CONSTRUCTION",
  "OTHER",
];

const STATUSES = ["ACCREDITED", "SUSPENDED", "EXPIRED", "PENDING", "UNKNOWN"];

const inputClass =
  "w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent";

export default function AdminLaboratoriesPage() {
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [name, setName] = useState("");
  const [fields, setFields] = useState<string[]>([]);
  const [accreditationStatus, setAccreditationStatus] = useState(STATUSES[4]);
  const [accreditationNumber, setAccreditationNumber] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const token = getAccessToken();
    if (!token) return;
    try {
      setLaboratories(await api.get<Laboratory[]>("/laboratories/admin/all", token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time fetch on mount
    load();
  }, []);

  function toggleField(field: string) {
    setFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field],
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const token = getAccessToken();
    if (!token) return;
    try {
      await api.post(
        "/laboratories",
        {
          name,
          fields,
          accreditationStatus,
          accreditationNumber: accreditationNumber || undefined,
          region: region || undefined,
          city: city || undefined,
        },
        token,
      );
      setName("");
      setFields([]);
      setAccreditationNumber("");
      setRegion("");
      setCity("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create.");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Laboratories</h1>

      <form onSubmit={handleCreate} className="mt-6 space-y-3">
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={inputClass}
        />

        <div>
          <label className="block text-xs font-medium text-black/60 dark:text-white/60">
            Fields
          </label>
          <div className="mt-1 flex flex-wrap gap-3">
            {FIELDS.map((f) => (
              <label key={f} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={fields.includes(f)}
                  onChange={() => toggleField(f)}
                />
                {f}
              </label>
            ))}
          </div>
        </div>

        <select
          value={accreditationStatus}
          onChange={(e) => setAccreditationStatus(e.target.value)}
          className={inputClass}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <input
          placeholder="Accreditation number (optional)"
          value={accreditationNumber}
          onChange={(e) => setAccreditationNumber(e.target.value)}
          className={inputClass}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="Region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className={inputClass}
          />
          <input
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Create
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <ul className="mt-8 divide-y divide-black/10 dark:divide-white/10">
        {laboratories.map((lab) => (
          <li key={lab.id} className="py-3">
            <p className="font-medium">
              {lab.name}{" "}
              {!lab.isPublished && <span className="text-xs text-black/40">(unpublished)</span>}
            </p>
            <p className="text-sm text-black/60 dark:text-white/60">
              {[lab.fields.join(", "), lab.accreditationStatus, lab.source]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
