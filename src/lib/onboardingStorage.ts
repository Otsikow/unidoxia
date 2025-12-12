export type OnboardingRole = "agent" | "university";

const STORAGE_KEY: Record<OnboardingRole, string> = {
  agent: "agentOnboardingSeen",
  university: "universityOnboardingSeen",
};

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage ?? window.sessionStorage ?? null;
}

export function hasSeenOnboarding(role: OnboardingRole) {
  const storage = getStorage();
  if (!storage) return false;
  const key = STORAGE_KEY[role];
  return storage.getItem(key) === "true";
}

export function markOnboardingSeen(role: OnboardingRole) {
  const storage = getStorage();
  if (!storage) return;
  const key = STORAGE_KEY[role];
  storage.setItem(key, "true");
}
