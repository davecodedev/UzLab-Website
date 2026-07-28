import { api } from "@/lib/api";
import {
  MembershipView,
  type DirectoryEntry,
  type MembershipType,
} from "@/components/MembershipView";

async function getTypes(): Promise<MembershipType[]> {
  try {
    return await api.get<MembershipType[]>("/membership/types");
  } catch {
    return [];
  }
}

async function getDirectory(): Promise<DirectoryEntry[]> {
  try {
    return await api.get<DirectoryEntry[]>("/membership/directory");
  } catch {
    return [];
  }
}

export default async function MembershipPage() {
  const [types, directory] = await Promise.all([getTypes(), getDirectory()]);
  return <MembershipView types={types} directory={directory} />;
}
