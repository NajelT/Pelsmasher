const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://127.0.0.1:8080/api";
const authTokenStorageKey = "pelsmasher.authToken";

export type ApiMuscleKey =
  | "CHEST"
  | "BACK"
  | "SHOULDERS"
  | "BICEPS"
  | "TRICEPS"
  | "FOREARMS"
  | "LEGS"
  | "CALVES"
  | "ABS"
  | "GLUTES"
  | "CUSTOM";

export type ApiMuscleGroup = {
  id: string;
  imageSrc?: string;
  muscleKey: ApiMuscleKey;
  name: string;
  preset: boolean;
};

export type ApiExercise = {
  id: string;
  name: string;
};

export type ApiTrainingOption = {
  completedSessions: number;
  defaultOption: boolean;
  exercises: ApiExercise[];
  id: string;
  muscleGroupId: string;
  name: string;
};

export type ApiLoggedSet = {
  exerciseId: string;
  exerciseName: string;
  id: string;
  performedAt: string;
  reps: number;
  setNumber: number;
  volume: number;
  weight: number;
};

export type ApiWorkoutSession = {
  completedAt: string;
  durationSeconds: number;
  id: string;
  muscleGroupId: string;
  sets: ApiLoggedSet[];
  startedAt: string;
  totalSets: number;
  totalVolume: number;
  workoutSetId: string;
  workoutSetName: string;
};

export type ApiWorkoutAnalyticsExercise = {
  currentBestWeight: number;
  currentSets: number;
  currentVolume: number;
  diff: number;
  name: string;
  previousBestWeight: number;
  previousSets: number;
  previousVolume: number;
};

export type ApiWorkoutAnalytics = {
  completedAt: string;
  currentSets: number;
  currentVolume: number;
  diff: number;
  durationSeconds: number;
  exercises: ApiWorkoutAnalyticsExercise[];
  previousSets: number;
  previousVolume: number;
  verdict: string;
  workoutSetName: string;
};

export type ApiCompleteWorkoutResponse = {
  analytics: ApiWorkoutAnalytics;
  session: ApiWorkoutSession;
};

export type ApiAuthUser = {
  displayName: string;
  email: string;
  id: string;
};

export type ApiAuthResponse = {
  token: string;
  user: ApiAuthUser;
};

export type CreateMuscleGroupPayload = {
  imageSrc?: string;
  muscleKey: ApiMuscleKey;
  name: string;
};

export type UpdateMuscleGroupPayload = Partial<CreateMuscleGroupPayload>;

export type SaveTrainingOptionPayload = {
  exercises: Array<{ name: string }>;
  muscleGroupId: string;
  name: string;
};

export type UpdateTrainingOptionPayload = Partial<
  Pick<SaveTrainingOptionPayload, "exercises" | "name">
>;

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const detail = await response.text();
    let parsedError = "";

    try {
      const parsed = JSON.parse(detail) as { error?: string };
      parsedError = parsed.error ?? "";
    } catch {
      parsedError = "";
    }

    throw new Error(parsedError || detail || `API request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getAuthToken() {
  return window.localStorage.getItem(authTokenStorageKey);
}

export function saveAuthToken(token: string) {
  window.localStorage.setItem(authTokenStorageKey, token);
}

export function clearAuthToken() {
  window.localStorage.removeItem(authTokenStorageKey);
}

export { apiBaseUrl };
