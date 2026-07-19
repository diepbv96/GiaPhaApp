import { supabase } from "@/lib/supabase";
import { DataAccessError } from "@/types";
import type { UserRole } from "@/types";

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new DataAccessError("PERMISSION_DENIED", "Email hoặc mật khẩu không đúng.");
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return null;

  const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (error || !data) return null;
  return data.role as UserRole;
}
