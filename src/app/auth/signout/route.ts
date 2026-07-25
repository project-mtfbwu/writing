import { signOutAction } from "@/lib/auth/actions";

export async function POST() {
  await signOutAction();
}
