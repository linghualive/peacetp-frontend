const USER_PROFILE_KEY = "peacetp_user_profile";

export type UserProfileRole = {
  id: number;
  name: string;
  description?: string;
};

export type UserProfile = {
  id: number;
  name: string;
  phone: string;
  password?: string;
  role?: UserProfileRole;
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: 0,
  name: "",
  phone: "",
  password: "",
  role: undefined,
};

export function getUserProfile(): UserProfile {
  if (typeof window === "undefined") {
    return DEFAULT_USER_PROFILE;
  }

  const storedProfile = window.localStorage.getItem(USER_PROFILE_KEY);
  if (!storedProfile) {
    return DEFAULT_USER_PROFILE;
  }

  try {
    const parsed = JSON.parse(storedProfile) as Partial<UserProfile>;
    return {
      id: typeof parsed.id === "number" ? parsed.id : DEFAULT_USER_PROFILE.id,
      name: parsed.name?.trim() ? parsed.name : DEFAULT_USER_PROFILE.name,
      phone: parsed.phone?.trim() ? parsed.phone : DEFAULT_USER_PROFILE.phone,
      password: parsed.password ?? DEFAULT_USER_PROFILE.password,
      role: parsed.role ?? DEFAULT_USER_PROFILE.role,
    };
  } catch {
    return DEFAULT_USER_PROFILE;
  }
}

export function setUserProfile(profile: Partial<UserProfile>) {
  if (typeof window === "undefined") {
    return;
  }

  const current = getUserProfile();
  const nextProfile: UserProfile = {
    ...DEFAULT_USER_PROFILE,
    ...current,
    ...profile,
  };

  window.localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(nextProfile));
}

export function clearUserProfile() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(USER_PROFILE_KEY);
}
