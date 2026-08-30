import {
  ChangeEvent,
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  History,
  ImagePlus,
  Link2,
  LogOut,
  Minus,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Settings,
  Share2,
  Timer,
  Trash2,
  Unlink2,
  X,
  Zap
} from "lucide-react";
import {
  ApiAuthResponse,
  ApiAuthUser,
  ApiCompleteWorkoutResponse,
  ApiLoggedSet,
  ApiMuscleGroup,
  ApiMuscleKey,
  ApiTrainingOption,
  ApiWorkoutSession,
  apiBaseUrl,
  apiRequest,
  clearAuthToken,
  saveAuthToken
} from "./api";

type MuscleKey =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "legs"
  | "abs"
  | "forearms"
  | "calves"
  | "glutes"
  | "custom";

type MuscleGroup = {
  id: string;
  name: string;
  muscleKey: MuscleKey;
  imageSrc?: string;
};

export type WorkoutHistoryEntry = {
  id: string;
  performedAt: string;
  summary: string;
};

export type Exercise = {
  id: string;
  name: string;
  history: WorkoutHistoryEntry[];
  supersetGroup?: number | null;
};

type ExerciseDraft = {
  name: string;
  supersetGroup: number | null;
};

export type WorkoutSet = {
  id: string;
  muscleGroupId: string;
  name: string;
  exercises: Exercise[];
  history: WorkoutHistoryEntry[];
  completedSessions?: number;
  isDefault?: boolean;
  archived?: boolean;
};

type LoggedExerciseSet = {
  exerciseName?: string;
  id: string;
  exerciseId: string;
  weight: number;
  reps: number;
  performedAt: string;
};

export type CompletedWorkoutPayload = {
  completedAt: string;
  durationSeconds: number;
  exerciseResults: Array<{
    exerciseId: string;
    exerciseName: string;
    sets: LoggedExerciseSet[];
  }>;
  id: string;
  muscleGroupId: string;
  startedAt: string;
  totalSets: number;
  workoutSetId: string;
  workoutSetName: string;
};

type WorkoutAnalyticsExercise = {
  currentBestWeight: number;
  currentSets: number;
  currentVolume: number;
  diff: number;
  name: string;
  previousBestWeight: number;
  previousSets: number;
  previousVolume: number;
};

export type WorkoutAnalytics = {
  completedAt: string;
  currentSets: number;
  currentVolume: number;
  diff: number;
  durationSeconds: number;
  exercises: WorkoutAnalyticsExercise[];
  previousSets: number;
  previousVolume: number;
  verdict: string;
  workoutSetName: string;
};

type MuscleGroupOverride = Partial<
  Pick<MuscleGroup, "imageSrc" | "muscleKey" | "name">
>;

type CountdownStep = 3 | 2 | 1 | "sauce" | null;
type HistoryView = "compare" | "sessions";

const defaultRestDurationSeconds = 90;
const minRestDurationSeconds = 10;
const maxRestDurationSeconds = 120;
const restDurationStepSeconds = 10;
const restDurationSecondsStorageKey = "pelsmasher.restDurationSeconds";
const restTimerEnabledStorageKey = "pelsmasher.restTimerEnabled";
const customGroupsStorageKey = "pelsmasher.customMuscleGroups";
const hiddenMuscleGroupsStorageKey = "pelsmasher.hiddenMuscleGroups";
const muscleGroupOverridesStorageKey = "pelsmasher.muscleGroupOverrides";
const customWorkoutSetsStorageKey = "pelsmasher.customWorkoutSets";
const archivedWorkoutSetsStorageKey = "pelsmasher.archivedWorkoutSets";
const lastCompletedWorkoutStorageKey = "pelsmasher.lastCompletedWorkout";
const syncedCompletedWorkoutsStorageKey = "pelsmasher.syncedCompletedWorkouts";
const authUserStorageKey = "pelsmasher.authUser";
const legacyCustomGroupsStorageKey = "pelmeshek.customMuscleGroups";

type ApiStatus = "loading" | "online" | "offline";

const presetGroups: MuscleGroup[] = [
  { id: "chest", name: "Chest", muscleKey: "chest" },
  { id: "back", name: "Back", muscleKey: "back" },
  { id: "shoulders", name: "Shoulders", muscleKey: "shoulders" },
  { id: "biceps", name: "Biceps", muscleKey: "biceps" },
  { id: "triceps", name: "Triceps", muscleKey: "triceps" },
  { id: "forearms", name: "Forearms", muscleKey: "forearms" },
  { id: "legs", name: "Legs", muscleKey: "legs" },
  { id: "calves", name: "Calves", muscleKey: "calves" },
  { id: "abs", name: "Abs", muscleKey: "abs" }
];

const workoutSetTemplatesByKey: Record<
  MuscleKey,
  { name: string; exercises: string[] }[]
> = {
  chest: [
    { name: "Heavy Press", exercises: ["Bench Press", "Incline Press", "Dips"] },
    { name: "Chest Volume", exercises: ["Dumbbell Press", "Cable Fly", "Push-Up"] }
  ],
  back: [
    { name: "Heavy Pull", exercises: ["Deadlift", "Barbell Row", "Pull-Up"] },
    { name: "Back Width", exercises: ["Lat Pulldown", "Seated Row", "Pullover"] }
  ],
  shoulders: [
    { name: "Overhead Power", exercises: ["Overhead Press", "Arnold Press", "Lateral Raise"] },
    { name: "Delt Volume", exercises: ["Lateral Raise", "Rear Delt Fly", "Face Pull"] }
  ],
  biceps: [
    { name: "Curl Strength", exercises: ["Barbell Curl", "Hammer Curl", "Preacher Curl"] },
    { name: "Biceps Pump", exercises: ["Cable Curl", "Incline Curl", "Concentration Curl"] }
  ],
  triceps: [
    { name: "Lockout Strength", exercises: ["Close-Grip Bench", "Skullcrusher", "Pushdown"] },
    { name: "Triceps Pump", exercises: ["Rope Pushdown", "Overhead Extension", "Dips"] }
  ],
  forearms: [
    { name: "Grip Work", exercises: ["Wrist Curl", "Reverse Curl", "Farmer Hold"] },
    { name: "Forearm Pump", exercises: ["Cable Wrist Curl", "Plate Pinch", "Dead Hang"] }
  ],
  legs: [
    { name: "Heavy Legs", exercises: ["Squat", "Leg Press", "Romanian Deadlift"] },
    { name: "Leg Volume", exercises: ["Hack Squat", "Leg Extension", "Leg Curl"] }
  ],
  calves: [
    { name: "Calf Builder", exercises: ["Standing Calf Raise", "Seated Calf Raise"] },
    { name: "Calf Burn", exercises: ["Leg Press Calf Raise", "Single-Leg Calf Raise"] }
  ],
  abs: [
    { name: "Core Strength", exercises: ["Cable Crunch", "Hanging Leg Raise", "Plank"] },
    { name: "Abs Volume", exercises: ["Crunch", "Reverse Crunch", "Ab Wheel"] }
  ],
  glutes: [
    { name: "Glute Power", exercises: ["Hip Thrust", "Romanian Deadlift", "Lunge"] },
    { name: "Glute Volume", exercises: ["Cable Kickback", "Split Squat", "Glute Bridge"] }
  ],
  custom: [
    { name: "Main Set", exercises: [] },
    { name: "Volume Set", exercises: [] }
  ]
};

function inferMuscleKey(name: string): MuscleKey {
  const value = name.trim().toLowerCase();

  if (value.includes("chest") || value.includes("pec")) return "chest";
  if (value.includes("back") || value.includes("lat")) return "back";
  if (value.includes("shoulder") || value.includes("delt")) return "shoulders";
  if (value.includes("bicep")) return "biceps";
  if (value.includes("tricep")) return "triceps";
  if (value.includes("forearm")) return "forearms";
  if (value.includes("calf") || value.includes("calves")) return "calves";
  if (value.includes("glute")) return "glutes";
  if (value.includes("leg") || value.includes("quad") || value.includes("ham")) {
    return "legs";
  }
  if (value.includes("ab") || value.includes("core")) return "abs";

  return "custom";
}

function toApiMuscleKey(muscleKey: MuscleKey): ApiMuscleKey {
  return muscleKey.toUpperCase() as ApiMuscleKey;
}

function fromApiMuscleKey(muscleKey: ApiMuscleKey): MuscleKey {
  return muscleKey.toLowerCase() as MuscleKey;
}

function mapApiMuscleGroup(group: ApiMuscleGroup): MuscleGroup {
  return {
    id: group.id,
    imageSrc: group.imageSrc,
    muscleKey: fromApiMuscleKey(group.muscleKey),
    name: group.name
  };
}

function mapApiTrainingOption(option: ApiTrainingOption): WorkoutSet {
  return {
    completedSessions: option.completedSessions,
    exercises: option.exercises.map((exercise) => ({
      history: [],
      id: exercise.id,
      name: exercise.name,
      supersetGroup: exercise.supersetGroup ?? null
    })),
    history: [],
    id: option.id,
    isDefault: option.defaultOption,
    muscleGroupId: option.muscleGroupId,
    name: option.name
  };
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildExercises(names: string[], setId: string): Exercise[] {
  return names.map((name, index) => ({
    id: `${setId}-exercise-${slugify(name) || index}`,
    name,
    history: []
  }));
}

function buildExercisesWithHistory(
  names: string[],
  setId: string,
  existingExercises: Exercise[] = []
): Exercise[] {
  return names.map((name, index) => {
    const existingExercise = existingExercises.find(
      (exercise) => exercise.name.toLowerCase() === name.toLowerCase()
    );

    return {
      id: existingExercise?.id ?? `${setId}-exercise-${slugify(name) || index}`,
      name,
      history: existingExercise?.history ?? []
    };
  });
}

function normalizeExercises(
  exercises: Partial<Exercise>[] | string[] | undefined,
  setId: string
): Exercise[] {
  if (!exercises) return [];

  return exercises
    .map((exercise, index) => {
      if (typeof exercise === "string") {
        return {
          id: `${setId}-exercise-${slugify(exercise) || index}`,
          name: exercise,
          history: []
        };
      }

      if (!exercise.name) return null;

      return {
        id: exercise.id ?? `${setId}-exercise-${slugify(exercise.name) || index}`,
        name: exercise.name,
        history: exercise.history ?? []
      };
    })
    .filter((exercise): exercise is Exercise => Boolean(exercise));
}

function buildDefaultWorkoutSets(group: MuscleGroup): WorkoutSet[] {
  const templates = workoutSetTemplatesByKey[group.muscleKey];

  return templates.map((template, index) => {
    const id = `default-${group.id}-${index}`;

    return {
      id,
      muscleGroupId: group.id,
      name: template.name,
      exercises: buildExercises(template.exercises, id),
      history: [],
      isDefault: true
    };
  });
}

function readCustomGroups() {
  try {
    const stored =
      window.localStorage.getItem(customGroupsStorageKey) ??
      window.localStorage.getItem(legacyCustomGroupsStorageKey);
    if (!stored) return [];

    const groups = JSON.parse(stored) as Partial<MuscleGroup>[];
    return groups
      .filter((group): group is Partial<MuscleGroup> & { name: string } =>
        Boolean(group.name)
      )
      .map((group) => ({
        id: group.id ?? `custom-${group.name}`,
        name: group.name,
        muscleKey: group.muscleKey ?? inferMuscleKey(group.name),
        imageSrc: group.imageSrc
      }));
  } catch {
    return [];
  }
}

function readHiddenMuscleGroupIds() {
  try {
    const stored = window.localStorage.getItem(hiddenMuscleGroupsStorageKey);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

function readMuscleGroupOverrides() {
  try {
    const stored = window.localStorage.getItem(muscleGroupOverridesStorageKey);
    if (!stored) return {};

    return JSON.parse(stored) as Record<string, MuscleGroupOverride>;
  } catch {
    return {};
  }
}

function readCustomWorkoutSets() {
  try {
    const stored = window.localStorage.getItem(customWorkoutSetsStorageKey);
    if (!stored) return [];

    const workoutSets = JSON.parse(stored) as Partial<WorkoutSet>[];
    return workoutSets
      .filter(
        (set): set is Partial<WorkoutSet> & { id: string; muscleGroupId: string; name: string } =>
          Boolean(set.id && set.muscleGroupId && set.name)
      )
      .map((set) => ({
        id: set.id,
        muscleGroupId: set.muscleGroupId,
        name: set.name,
        exercises: normalizeExercises(set.exercises, set.id),
        history: set.history ?? [],
        isDefault: set.isDefault,
        archived: set.archived
      }));
  } catch {
    return [];
  }
}

function readArchivedWorkoutSetIds() {
  try {
    const stored = window.localStorage.getItem(archivedWorkoutSetsStorageKey);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

function saveCustomGroups(groups: MuscleGroup[]) {
  window.localStorage.setItem(customGroupsStorageKey, JSON.stringify(groups));
  window.localStorage.removeItem(legacyCustomGroupsStorageKey);
}

function saveHiddenMuscleGroupIds(ids: string[]) {
  window.localStorage.setItem(hiddenMuscleGroupsStorageKey, JSON.stringify(ids));
}

function saveMuscleGroupOverrides(
  overrides: Record<string, MuscleGroupOverride>
) {
  window.localStorage.setItem(
    muscleGroupOverridesStorageKey,
    JSON.stringify(overrides)
  );
}

function saveCustomWorkoutSets(workoutSets: WorkoutSet[]) {
  window.localStorage.setItem(
    customWorkoutSetsStorageKey,
    JSON.stringify(workoutSets)
  );
}

function saveArchivedWorkoutSetIds(ids: string[]) {
  window.localStorage.setItem(archivedWorkoutSetsStorageKey, JSON.stringify(ids));
}

function readRestDurationSeconds() {
  try {
    const stored = window.localStorage.getItem(restDurationSecondsStorageKey);
    const parsed = stored ? Number(stored) : NaN;

    return Number.isFinite(parsed)
      ? clamp(parsed, minRestDurationSeconds, maxRestDurationSeconds)
      : defaultRestDurationSeconds;
  } catch {
    return defaultRestDurationSeconds;
  }
}

function saveRestDurationSeconds(seconds: number) {
  window.localStorage.setItem(restDurationSecondsStorageKey, String(seconds));
}

function readRestTimerEnabled() {
  try {
    return window.localStorage.getItem(restTimerEnabledStorageKey) !== "false";
  } catch {
    return true;
  }
}

function saveRestTimerEnabled(enabled: boolean) {
  window.localStorage.setItem(restTimerEnabledStorageKey, String(enabled));
}

function resizeImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Choose an image file"));
      return;
    }

    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 720;
      const scale = Math.min(1, size / Math.max(image.width, image.height));
      const width = Math.round(image.width * scale);
      const height = Math.round(image.height * scale);

      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")?.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.86));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image"));
    };

    image.src = objectUrl;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatMetricValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatRestTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatWorkoutElapsed(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatHistoryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short"
  });
}

function formatHistoryDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString([], {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  });
}

function formatSetResult(set: Pick<LoggedExerciseSet, "reps" | "weight">) {
  return `${formatMetricValue(set.weight)} x ${set.reps}`;
}

function buildExerciseDisplayLabels(
  exercises: Array<Pick<Exercise, "supersetGroup">>
): string[] {
  const labels: string[] = [];
  let roundNumber = 0;
  let index = 0;

  while (index < exercises.length) {
    const group = exercises[index].supersetGroup;
    roundNumber += 1;

    if (group == null) {
      labels.push(String(roundNumber));
      index += 1;
      continue;
    }

    let letterCode = 0;
    while (index < exercises.length && exercises[index].supersetGroup === group) {
      labels.push(`${roundNumber}${String.fromCharCode(65 + letterCode)}`);
      letterCode += 1;
      index += 1;
    }
  }

  return labels;
}

function calculateSetVolume(set: Pick<LoggedExerciseSet, "reps" | "weight">) {
  return set.weight * set.reps;
}

function formatVolume(value: number) {
  return `${formatMetricValue(value)} kg`;
}

function sumSetVolume(sets: Array<Pick<LoggedExerciseSet, "reps" | "weight">>) {
  return sets.reduce((total, set) => total + calculateSetVolume(set), 0);
}

function getBestWeight(sets: Array<Pick<LoggedExerciseSet, "weight">>) {
  return sets.reduce((best, set) => Math.max(best, set.weight), 0);
}

function getCompletedExerciseSets(
  workout: CompletedWorkoutPayload,
  exercise: Exercise
) {
  return (
    workout.exerciseResults.find(
      (result) =>
        result.exerciseId === exercise.id ||
        result.exerciseName.trim().toLowerCase() ===
          exercise.name.trim().toLowerCase()
    )?.sets ?? []
  );
}

function isSameExercise(
  set: Pick<ApiLoggedSet, "exerciseId" | "exerciseName">,
  exercise: Exercise
) {
  return (
    set.exerciseId === exercise.id ||
    set.exerciseName.trim().toLowerCase() === exercise.name.trim().toLowerCase()
  );
}

function getSessionExerciseSets(
  session: ApiWorkoutSession | undefined,
  exercise: Exercise
) {
  if (!session) return [];

  return session.sets
    .filter((set) => isSameExercise(set, exercise))
    .sort((firstSet, secondSet) => firstSet.setNumber - secondSet.setNumber);
}

export function buildCompletedWorkoutPayloadFromSession(
  session: ApiWorkoutSession
): CompletedWorkoutPayload {
  const exerciseResults: CompletedWorkoutPayload["exerciseResults"] = [];

  for (const set of session.sets) {
    let result = exerciseResults.find(
      (candidate) => candidate.exerciseId === set.exerciseId
    );

    if (!result) {
      result = {
        exerciseId: set.exerciseId,
        exerciseName: set.exerciseName,
        sets: []
      };
      exerciseResults.push(result);
    }

    result.sets.push({
      id: set.id,
      exerciseId: set.exerciseId,
      exerciseName: set.exerciseName,
      weight: set.weight,
      reps: set.reps,
      performedAt: set.performedAt
    });
  }

  return {
    completedAt: session.completedAt,
    durationSeconds: session.durationSeconds,
    exerciseResults,
    id: session.id,
    muscleGroupId: session.muscleGroupId,
    startedAt: session.startedAt,
    totalSets: session.totalSets,
    workoutSetId: session.workoutSetId,
    workoutSetName: session.workoutSetName
  };
}

export function buildWorkoutAnalytics(
  workout: CompletedWorkoutPayload,
  workoutSet: WorkoutSet,
  previousSession: ApiWorkoutSession | undefined
): WorkoutAnalytics {
  const previousSets = previousSession?.sets ?? [];
  const currentVolume = workout.exerciseResults.reduce(
    (total, result) => total + sumSetVolume(result.sets),
    0
  );
  const previousVolume = sumSetVolume(previousSets);
  const diff = currentVolume - previousVolume;
  const exercises = workoutSet.exercises.map((exercise) => {
    const currentExerciseSets = getCompletedExerciseSets(workout, exercise);
    const previousExerciseSets = getSessionExerciseSets(previousSession, exercise);
    const currentExerciseVolume = sumSetVolume(currentExerciseSets);
    const previousExerciseVolume = sumSetVolume(previousExerciseSets);

    return {
      currentBestWeight: getBestWeight(currentExerciseSets),
      currentSets: currentExerciseSets.length,
      currentVolume: currentExerciseVolume,
      diff: currentExerciseVolume - previousExerciseVolume,
      name: exercise.name,
      previousBestWeight: getBestWeight(previousExerciseSets),
      previousSets: previousExerciseSets.length,
      previousVolume: previousExerciseVolume
    };
  });
  const improvedCount = exercises.filter((exercise) => exercise.diff > 0).length;
  const worsenedCount = exercises.filter((exercise) => exercise.diff < 0).length;
  const verdict = !previousSession
    ? "First saved workout for this option. This is now your baseline."
    : diff > 0
      ? `Overall volume improved by ${formatVolume(diff)}. ${improvedCount} exercise${improvedCount === 1 ? "" : "s"} up.`
      : diff < 0
        ? `Overall volume dropped by ${formatVolume(Math.abs(diff))}. ${worsenedCount} exercise${worsenedCount === 1 ? "" : "s"} down.`
        : "Overall volume matched the previous workout.";

  return {
    completedAt: workout.completedAt,
    currentSets: workout.totalSets,
    currentVolume,
    diff,
    durationSeconds: workout.durationSeconds,
    exercises,
    previousSets: previousSession?.totalSets ?? 0,
    previousVolume,
    verdict,
    workoutSetName: workout.workoutSetName
  };
}

function buildWorkoutShareText(analytics: WorkoutAnalytics) {
  const lines = [
    `PELSMASHER · ${analytics.workoutSetName}`,
    `${formatVolume(analytics.currentVolume)} total volume, ${analytics.currentSets} sets`,
    analytics.previousVolume > 0
      ? `${analytics.diff >= 0 ? "+" : ""}${formatVolume(analytics.diff)} vs last session`
      : "First logged session for this option",
    "",
    analytics.verdict
  ];

  const topExercise = [...analytics.exercises].sort((a, b) => b.diff - a.diff)[0];

  if (topExercise && topExercise.diff > 0) {
    lines.push(`Best gain: ${topExercise.name} +${formatVolume(topExercise.diff)}`);
  }

  return lines.join("\n");
}

function buildBaselineSetsFromSession(
  workoutSet: WorkoutSet,
  session: ApiWorkoutSession | undefined
): Record<string, LoggedExerciseSet[]> {
  if (!session) return {};

  return workoutSet.exercises.reduce<Record<string, LoggedExerciseSet[]>>(
    (baselineSets, exercise) => {
      const sets = getSessionExerciseSets(session, exercise).map((set) => ({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        id: `baseline-${session.id}-${set.id}`,
        performedAt: set.performedAt,
        reps: set.reps,
        weight: set.weight
      }));

      if (sets.length > 0) {
        baselineSets[exercise.id] = sets;
      }

      return baselineSets;
    },
    {}
  );
}

function escapeExcelValue(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function excelCell(
  value: string | number,
  className = "",
  colspan?: number
) {
  const classAttribute = className ? ` class="${className}"` : "";
  const colspanAttribute = colspan ? ` colspan="${colspan}"` : "";

  return `<td${classAttribute}${colspanAttribute}>${escapeExcelValue(value)}</td>`;
}

function excelHeaderCell(value: string | number) {
  return `<th>${escapeExcelValue(value)}</th>`;
}

function excelRow(cells: string[]) {
  return `<tr>${cells.join("")}</tr>`;
}

function downloadTrainingOptionHistory(
  workoutSet: WorkoutSet,
  history: ApiWorkoutSession[]
) {
  const totalSets = history.reduce((total, session) => total + session.totalSets, 0);
  const totalVolume = history.reduce(
    (total, session) => total + session.totalVolume,
    0
  );
  const latestSession = history[0];
  const summaryRows = workoutSet.exercises.map((exercise) => {
    const exerciseSetsBySession = history.map((session) =>
      getSessionExerciseSets(session, exercise)
    );
    const allSets = exerciseSetsBySession.flat();
    const bestSet = allSets.reduce<ApiLoggedSet | undefined>((best, set) => {
      if (!best) return set;
      if (set.weight > best.weight) return set;
      if (set.weight === best.weight && set.reps > best.reps) return set;
      return best;
    }, undefined);
    const lastSets = exerciseSetsBySession.find((sets) => sets.length > 0) ?? [];
    const exerciseVolume = allSets.reduce(
      (total, set) => total + set.volume,
      0
    );

    return excelRow([
      excelCell(exercise.name, "exercise-name"),
      excelCell(exerciseSetsBySession.filter((sets) => sets.length > 0).length, "number"),
      excelCell(allSets.length, "number"),
      excelCell(formatVolume(exerciseVolume), "number"),
      excelCell(bestSet ? formatMetricValue(bestSet.weight) : "-", "number"),
      excelCell(bestSet ? formatSetResult(bestSet) : "-", "result"),
      excelCell(
        lastSets.length > 0 ? lastSets.map(formatSetResult).join(" | ") : "-",
        "result"
      )
    ]);
  });
  const sessionRows = history.flatMap((session, sessionIndex) => {
    const rows = [
      excelRow([
        excelCell(
          `Session ${sessionIndex + 1} - ${formatHistoryDateTime(session.completedAt)}`,
          "session-title",
          7
        )
      ]),
      excelRow([
        excelCell("Completed", "meta-label"),
        excelCell(formatHistoryDateTime(session.completedAt), "meta-value"),
        excelCell("Duration", "meta-label"),
        excelCell(formatWorkoutElapsed(session.durationSeconds), "meta-value"),
        excelCell("Total sets", "meta-label"),
        excelCell(session.totalSets, "meta-value number"),
        excelCell(formatVolume(session.totalVolume), "meta-value number")
      ]),
      excelRow([
        excelHeaderCell("Exercise"),
        excelHeaderCell("Set"),
        excelHeaderCell("Weight kg"),
        excelHeaderCell("Reps"),
        excelHeaderCell("Volume kg"),
        excelHeaderCell("Result"),
        excelHeaderCell("Performed at")
      ])
    ];

    workoutSet.exercises.forEach((exercise) => {
      const sets = getSessionExerciseSets(session, exercise);

      if (sets.length === 0) {
        rows.push(
          excelRow([
            excelCell(exercise.name, "exercise-name"),
            excelCell("-", "empty"),
            excelCell("-", "empty"),
            excelCell("-", "empty"),
            excelCell("-", "empty"),
            excelCell("No sets logged", "empty"),
            excelCell("-", "empty")
          ])
        );
        return;
      }

      sets.forEach((set, setIndex) => {
        rows.push(
          excelRow([
            excelCell(setIndex === 0 ? exercise.name : "", "exercise-name"),
            excelCell(set.setNumber, "number"),
            excelCell(formatMetricValue(set.weight), "number"),
            excelCell(set.reps, "number"),
            excelCell(formatMetricValue(set.volume), "number"),
            excelCell(formatSetResult(set), "result"),
            excelCell(formatHistoryDateTime(set.performedAt), "date")
          ])
        );
      });
    });

    rows.push(excelRow([excelCell("", "spacer", 7)]));

    return rows;
  });
  const tableRows = [
    excelRow([excelCell(`${workoutSet.name} - Training history`, "title", 7)]),
    excelRow([
      excelCell("Generated", "meta-label"),
      excelCell(formatHistoryDateTime(new Date().toISOString()), "meta-value"),
      excelCell("Sessions", "meta-label"),
      excelCell(history.length, "meta-value number"),
      excelCell("Total sets", "meta-label"),
      excelCell(totalSets, "meta-value number"),
      excelCell(formatVolume(totalVolume), "meta-value number")
    ]),
    excelRow([
      excelCell("Latest session", "meta-label"),
      excelCell(
        latestSession ? formatHistoryDateTime(latestSession.completedAt) : "-",
        "meta-value",
        6
      )
    ]),
    excelRow([excelCell("", "spacer", 7)]),
    excelRow([excelCell("Exercise summary", "section-title", 7)]),
    excelRow([
      excelHeaderCell("Exercise"),
      excelHeaderCell("Sessions"),
      excelHeaderCell("Sets"),
      excelHeaderCell("Volume kg"),
      excelHeaderCell("Best weight"),
      excelHeaderCell("Best set"),
      excelHeaderCell("Last session sets")
    ]),
    ...summaryRows,
    excelRow([excelCell("", "spacer", 7)]),
    excelRow([excelCell("Session details", "section-title", 7)]),
    ...sessionRows
  ].join("");
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #8aa47e; padding: 7px 9px; vertical-align: middle; }
    th { background: #10251a; color: #c7ff35; font-weight: 700; text-align: left; }
    .title { background: #c7ff35; color: #07140d; font-size: 22px; font-weight: 800; }
    .section-title { background: #1b3428; color: #ffffff; font-size: 16px; font-weight: 800; }
    .session-title { background: #263f1f; color: #ffffff; font-size: 14px; font-weight: 800; }
    .meta-label { background: #edf9e5; color: #243b2b; font-weight: 800; }
    .meta-value { background: #ffffff; color: #111111; font-weight: 600; }
    .exercise-name { background: #f6fbf1; color: #111111; font-weight: 800; }
    .number { text-align: right; }
    .result { font-weight: 700; }
    .date { color: #34463a; }
    .empty { color: #777777; text-align: center; }
    .spacer { border: 0; height: 12px; background: #ffffff; }
  </style>
</head>
<body>
  <table>${tableRows}</table>
</body>
</html>`;
  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${slugify(workoutSet.name) || "training-option"}-history.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function normalizeIsoTimestamp(value: string | undefined, fallback: string) {
  if (!value) return fallback;

  const parsedTime = Date.parse(value);
  return Number.isNaN(parsedTime) ? fallback : new Date(parsedTime).toISOString();
}

function readSyncedCompletedWorkoutIds() {
  try {
    const stored = window.localStorage.getItem(syncedCompletedWorkoutsStorageKey);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

function readAuthUser() {
  try {
    const stored = window.localStorage.getItem(authUserStorageKey);
    return stored ? (JSON.parse(stored) as ApiAuthUser) : null;
  } catch {
    return null;
  }
}

function saveAuthUser(user: ApiAuthUser) {
  window.localStorage.setItem(authUserStorageKey, JSON.stringify(user));
}

function clearAuthUser() {
  window.localStorage.removeItem(authUserStorageKey);
}

function getAuthErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;

  return error.message === "Not Found"
    ? "Auth API not found. Restart backend."
    : error.message;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function saveSyncedCompletedWorkoutId(id: string) {
  const syncedIds = readSyncedCompletedWorkoutIds();
  if (syncedIds.includes(id)) return;

  window.localStorage.setItem(
    syncedCompletedWorkoutsStorageKey,
    JSON.stringify([...syncedIds, id])
  );
}

function normalizeCompletedWorkoutForApi(
  workout: CompletedWorkoutPayload
): CompletedWorkoutPayload {
  const completedAt = normalizeIsoTimestamp(
    workout.completedAt,
    new Date().toISOString()
  );

  return {
    ...workout,
    completedAt,
    exerciseResults: workout.exerciseResults.map((result) => ({
      ...result,
      sets: result.sets.map((set) => ({
        ...set,
        exerciseName: set.exerciseName ?? result.exerciseName,
        performedAt: normalizeIsoTimestamp(set.performedAt, completedAt)
      }))
    })),
    startedAt: normalizeIsoTimestamp(workout.startedAt, completedAt)
  };
}

function composeWorkoutSetsForGroup(
  group: MuscleGroup,
  customWorkoutSets: WorkoutSet[],
  archivedWorkoutSetIds: string[]
) {
  const defaultSets = buildDefaultWorkoutSets(group);
  const customSetsForGroup = customWorkoutSets.filter(
    (set) => set.muscleGroupId === group.id && !set.archived
  );
  const customSetIds = new Set(customSetsForGroup.map((set) => set.id));

  return [
    ...defaultSets.filter((set) => !customSetIds.has(set.id)),
    ...customSetsForGroup
  ].filter((set) => !archivedWorkoutSetIds.includes(set.id));
}

let pickerAudioContext: AudioContext | null = null;

function playPickerClick() {
  try {
    const AudioContextConstructor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextConstructor) return;

    pickerAudioContext ??= new AudioContextConstructor();
    if (pickerAudioContext.state === "suspended") {
      void pickerAudioContext.resume();
    }

    const oscillator = pickerAudioContext.createOscillator();
    const gain = pickerAudioContext.createGain();
    const now = pickerAudioContext.currentTime;

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(1450, now);
    oscillator.frequency.exponentialRampToValueAtTime(760, now + 0.018);
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.032);
    oscillator.connect(gain);
    gain.connect(pickerAudioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.035);

    if (navigator.vibrate) navigator.vibrate(6);
  } catch {
    // Audio feedback is progressive enhancement.
  }
}

function playSmashCueSound() {
  try {
    const AudioContextConstructor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextConstructor) return;

    pickerAudioContext ??= new AudioContextConstructor();
    if (pickerAudioContext.state === "suspended") {
      void pickerAudioContext.resume();
    }

    // A gentle two-note chime (G5 -> C6, a resolving fourth) — pleasant
    // notification tone rather than a harsh buzz, distinct from the picker
    // click.
    [
      { frequency: 784, offset: 0 },
      { frequency: 1046.5, offset: 0.11 }
    ].forEach(({ frequency, offset }) => {
      const oscillator = pickerAudioContext!.createOscillator();
      const gain = pickerAudioContext!.createGain();
      const now = pickerAudioContext!.currentTime + offset;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      oscillator.connect(gain);
      gain.connect(pickerAudioContext!.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.36);
    });

    if (navigator.vibrate) navigator.vibrate([30, 30, 60]);
  } catch {
    // Audio feedback is progressive enhancement.
  }
}

function snapMetricValue(value: number, min: number, max: number, step: number) {
  return clamp(Math.round(value / step) * step, min, max);
}

function VerticalMetricPicker({
  label,
  majorEvery,
  max,
  min,
  onChange,
  pixelsPerStep,
  step,
  value
}: {
  label: string;
  majorEvery: number;
  max: number;
  min: number;
  onChange: (value: number) => void;
  pixelsPerStep: number;
  step: number;
  value: number;
}) {
  const ticks = useMemo(() => {
    const count = Math.round((max - min) / step);
    return Array.from({ length: count + 1 }, (_, index) => min + index * step);
  }, [max, min, step]);
  const dragRef = useRef({
    lastSnap: value,
    pointerId: null as number | null,
    rawValue: value,
    startValue: value,
    startY: 0
  });
  const [previewValue, setPreviewValue] = useState<number | null>(null);
  const displayValue = previewValue ?? value;
  const stripOffset = ((displayValue - min) / step) * pixelsPerStep;

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    dragRef.current = {
      lastSnap: value,
      pointerId: event.pointerId,
      rawValue: value,
      startValue: value,
      startY: event.clientY
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) return;

    const deltaY = drag.startY - event.clientY;
    const rawValue = clamp(
      drag.startValue + (deltaY / pixelsPerStep) * step,
      min,
      max
    );
    const snappedValue = snapMetricValue(rawValue, min, max, step);

    drag.rawValue = rawValue;
    setPreviewValue(snappedValue);

    if (snappedValue !== drag.lastSnap) {
      drag.lastSnap = snappedValue;
      onChange(snappedValue);
      playPickerClick();
    }
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) return;

    drag.pointerId = null;
    const snappedValue = snapMetricValue(drag.rawValue, min, max, step);
    setPreviewValue(null);
    onChange(snappedValue);
  }

  return (
    <section className="vertical-picker" aria-label={label}>
      <div className="vertical-picker-heading">
        <span>{label}</span>
      </div>
      <div
        className="vertical-track"
        role="slider"
        aria-label={label}
        aria-valuemax={max}
        aria-valuemin={min}
        aria-valuenow={value}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;

          event.preventDefault();
          const direction = event.key === "ArrowUp" ? 1 : -1;
          const nextValue = snapMetricValue(value + direction * step, min, max, step);
          onChange(nextValue);
          playPickerClick();
        }}
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
      >
        <div className="vertical-cursor" aria-hidden="true" />
        <div
          className="vertical-strip"
          style={{
            height: `${Math.max(ticks.length * pixelsPerStep, 1)}px`,
            transform: `translateY(-${stripOffset}px)`
          }}
        >
          {ticks.map((tickValue, index) => {
            const isMajor =
              Math.abs(tickValue / majorEvery - Math.round(tickValue / majorEvery)) <
              0.001;
            const isSelected = Math.abs(tickValue - value) < 0.001;

            return (
              <span
                className={`vertical-tick${isMajor ? " is-major" : ""}${
                  isSelected ? " is-selected" : ""
                }`}
                key={`${label}-${tickValue}`}
                style={{ top: `${index * pixelsPerStep}px` }}
              >
                {isMajor && !isSelected ? (
                  <em>{formatMetricValue(tickValue)}</em>
                ) : null}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>("loading");
  const [apiError, setApiError] = useState("");
  const [authUser, setAuthUser] = useState<ApiAuthUser | null>(readAuthUser);
  const [authUsername, setAuthUsername] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authRepeatPassword, setAuthRepeatPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [apiMuscleGroups, setApiMuscleGroups] = useState<MuscleGroup[] | null>(
    null
  );
  const [apiWorkoutSetsByGroup, setApiWorkoutSetsByGroup] = useState<
    Record<string, WorkoutSet[]>
  >({});
  const [trainingOptionHistoryById, setTrainingOptionHistoryById] = useState<
    Record<string, ApiWorkoutSession[]>
  >({});
  const [historyView, setHistoryView] = useState<HistoryView>("compare");
  const [workoutBaselineSets, setWorkoutBaselineSets] = useState<
    Record<string, LoggedExerciseSet[]>
  >({});
  const [customGroups, setCustomGroups] =
    useState<MuscleGroup[]>(readCustomGroups);
  const [hiddenMuscleGroupIds, setHiddenMuscleGroupIds] = useState<string[]>(
    readHiddenMuscleGroupIds
  );
  const [muscleGroupOverrides, setMuscleGroupOverrides] = useState<
    Record<string, MuscleGroupOverride>
  >(readMuscleGroupOverrides);
  const [customWorkoutSets, setCustomWorkoutSets] =
    useState<WorkoutSet[]>(readCustomWorkoutSets);
  const [archivedWorkoutSetIds, setArchivedWorkoutSetIds] = useState<string[]>(
    readArchivedWorkoutSetIds
  );
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupImageSrc, setNewGroupImageSrc] = useState<string | null>(null);
  const [newGroupImageName, setNewGroupImageName] = useState("");
  const [newWorkoutSetName, setNewWorkoutSetName] = useState("");
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newWorkoutExercises, setNewWorkoutExercises] = useState<ExerciseDraft[]>([]);
  const [selectedDraftNames, setSelectedDraftNames] = useState<string[]>([]);
  const [isOptionDialogOpen, setIsOptionDialogOpen] = useState(false);
  const [editingWorkoutSetId, setEditingWorkoutSetId] = useState<string | null>(
    null
  );
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [photoError, setPhotoError] = useState("");
  const [openMuscleMenuId, setOpenMuscleMenuId] = useState<string | null>(null);
  const [editingMuscleGroupId, setEditingMuscleGroupId] = useState<string | null>(
    null
  );
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupImageSrc, setEditGroupImageSrc] = useState<string | null>(null);
  const [editGroupImageName, setEditGroupImageName] = useState("");
  const [editPhotoInputKey, setEditPhotoInputKey] = useState(0);
  const [editPhotoError, setEditPhotoError] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedWorkoutSetId, setSelectedWorkoutSetId] = useState<string | null>(
    null
  );
  const [startedWorkoutSetId, setStartedWorkoutSetId] = useState<string | null>(
    null
  );
  const [countdownWorkoutSetId, setCountdownWorkoutSetId] = useState<
    string | null
  >(null);
  const [countdownWorkoutGroupId, setCountdownWorkoutGroupId] = useState<
    string | null
  >(null);
  const [countdownStep, setCountdownStep] = useState<CountdownStep>(null);
  const [activeWorkoutGroupId, setActiveWorkoutGroupId] = useState<string | null>(
    null
  );
  const [activeWorkoutSetId, setActiveWorkoutSetId] = useState<string | null>(
    null
  );
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [lastLoggedExerciseId, setLastLoggedExerciseId] = useState<string | null>(
    null
  );
  const [workoutLogs, setWorkoutLogs] = useState<
    Record<string, LoggedExerciseSet[]>
  >({});
  const [weightValue, setWeightValue] = useState(80);
  const [repValue, setRepValue] = useState(8);
  const [finishedExerciseIds, setFinishedExerciseIds] = useState<string[]>([]);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restRemainingSeconds, setRestRemainingSeconds] = useState(0);
  const [smashCueActive, setSmashCueActive] = useState(false);
  const [restDurationSeconds, setRestDurationSeconds] = useState(() =>
    readRestDurationSeconds()
  );
  const [restTimerEnabled, setRestTimerEnabled] = useState(() =>
    readRestTimerEnabled()
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  function toggleRestTimerEnabled() {
    setRestTimerEnabled((previousEnabled) => {
      const nextEnabled = !previousEnabled;
      saveRestTimerEnabled(nextEnabled);
      return nextEnabled;
    });
  }

  function adjustRestDurationSeconds(deltaSeconds: number) {
    setRestDurationSeconds((previousSeconds) => {
      const nextSeconds = clamp(
        previousSeconds + deltaSeconds,
        minRestDurationSeconds,
        maxRestDurationSeconds
      );

      saveRestDurationSeconds(nextSeconds);
      return nextSeconds;
    });
  }
  const [workoutStartedAt, setWorkoutStartedAt] = useState<number | null>(null);
  const [workoutElapsedSeconds, setWorkoutElapsedSeconds] = useState(0);
  const [workoutAnalytics, setWorkoutAnalytics] =
    useState<WorkoutAnalytics | null>(null);
  const [shareStatus, setShareStatus] = useState("");

  async function handleAuthSuccess(response: ApiAuthResponse) {
    saveAuthToken(response.token);
    saveAuthUser(response.user);
    setAuthUser(response.user);
    setAuthUsername("");
    setAuthPassword("");
    setAuthRepeatPassword("");
    setAuthError("");
    setAuthMode("login");
    setApiWorkoutSetsByGroup({});
    setTrainingOptionHistoryById({});
    setSelectedGroupId(null);
    setSelectedWorkoutSetId(null);
    setWorkoutAnalytics(null);
    setIsSettingsOpen(false);
    await refreshMuscleGroups();
  }

  async function handleLogin() {
    if (!isValidEmail(authEmail)) {
      setAuthError("Enter a valid email");
      return;
    }

    try {
      const response = await apiRequest<ApiAuthResponse>("/auth/login", {
        body: JSON.stringify({
          email: authEmail.trim(),
          password: authPassword
        }),
        method: "POST"
      });
      await handleAuthSuccess(response);
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, "Login failed"));
    }
  }

  async function handleRegister() {
    if (!authUsername.trim()) {
      setAuthError("Enter a username");
      return;
    }
    if (!isValidEmail(authEmail)) {
      setAuthError("Enter a valid email");
      return;
    }

    try {
      const response = await apiRequest<ApiAuthResponse>("/auth/register", {
        body: JSON.stringify({
          username: authUsername.trim(),
          email: authEmail.trim(),
          password: authPassword,
          repeatPassword: authRepeatPassword
        }),
        method: "POST"
      });
      await handleAuthSuccess(response);
    } catch (error) {
      setAuthError(getAuthErrorMessage(error, "Registration failed"));
    }
  }

  function handleLogout() {
    clearAuthToken();
    clearAuthUser();
    setAuthUser(null);
    setApiWorkoutSetsByGroup({});
    setTrainingOptionHistoryById({});
    setSelectedGroupId(null);
    setSelectedWorkoutSetId(null);
    setWorkoutAnalytics(null);
    setIsSettingsOpen(false);
  }

  const localAllMuscleGroups = useMemo(
    () => [
      ...presetGroups.map((group) => ({
        ...group,
        ...muscleGroupOverrides[group.id],
        muscleKey: muscleGroupOverrides[group.id]?.muscleKey ?? group.muscleKey
      })),
      ...customGroups
    ],
    [customGroups, muscleGroupOverrides]
  );
  const allMuscleGroups = apiMuscleGroups ?? localAllMuscleGroups;

  const muscleGroups = useMemo(
    () => [
      ...allMuscleGroups.filter(
        (group) =>
          apiMuscleGroups ||
          !presetGroups.some((presetGroup) => presetGroup.id === group.id) ||
          !hiddenMuscleGroupIds.includes(group.id)
      )
    ],
    [allMuscleGroups, apiMuscleGroups, hiddenMuscleGroupIds]
  );
  const selectedGroup = muscleGroups.find((group) => group.id === selectedGroupId);
  const editingMuscleGroup = muscleGroups.find(
    (group) => group.id === editingMuscleGroupId
  );
  const activeWorkoutGroup = allMuscleGroups.find(
    (group) => group.id === activeWorkoutGroupId
  );

  const workoutSets = useMemo(() => {
    if (!selectedGroup) return [];
    const apiWorkoutSets = apiWorkoutSetsByGroup[selectedGroup.id];

    if (apiWorkoutSets) return apiWorkoutSets;

    return composeWorkoutSetsForGroup(
      selectedGroup,
      customWorkoutSets,
      archivedWorkoutSetIds
    );
  }, [apiWorkoutSetsByGroup, archivedWorkoutSetIds, customWorkoutSets, selectedGroup]);
  const activeWorkoutSets = useMemo(() => {
    if (!activeWorkoutGroup) return [];
    const apiWorkoutSets = apiWorkoutSetsByGroup[activeWorkoutGroup.id];

    if (apiWorkoutSets) return apiWorkoutSets;

    return composeWorkoutSetsForGroup(
      activeWorkoutGroup,
      customWorkoutSets,
      archivedWorkoutSetIds
    );
  }, [
    activeWorkoutGroup,
    apiWorkoutSetsByGroup,
    archivedWorkoutSetIds,
    customWorkoutSets
  ]);

  const selectedWorkoutSet = workoutSets.find(
    (set) => set.id === selectedWorkoutSetId
  );
  const selectedWorkoutHistory = selectedWorkoutSet
    ? trainingOptionHistoryById[selectedWorkoutSet.id] ?? []
    : [];
  const selectedBaseSession = selectedWorkoutHistory[0];
  const isSelectedWorkoutLive = Boolean(
    selectedWorkoutSet && activeWorkoutSetId === selectedWorkoutSet.id
  );
  const comparePreviousSession = isSelectedWorkoutLive
    ? selectedWorkoutHistory[0]
    : selectedWorkoutHistory[1];
  const compareLastSession = isSelectedWorkoutLive
    ? undefined
    : selectedWorkoutHistory[0];
  const activeWorkoutSet = activeWorkoutSets.find(
    (set) => set.id === activeWorkoutSetId
  );
  const activeExercise = activeWorkoutSet?.exercises.find(
    (exercise) => exercise.id === activeExerciseId
  );
  const activeExerciseIndex =
    activeWorkoutSet && activeExercise
      ? activeWorkoutSet.exercises.findIndex(
          (exercise) => exercise.id === activeExercise.id
        )
      : -1;
  const nextExercise =
    activeWorkoutSet && activeExerciseIndex >= 0
      ? activeWorkoutSet.exercises[activeExerciseIndex + 1]
      : undefined;
  const activeExerciseLogs = activeExercise
    ? workoutLogs[activeExercise.id] ?? []
    : [];
  const canCreateWorkoutOption =
    Boolean(newWorkoutSetName.trim()) &&
    (newWorkoutExercises.length > 0 || Boolean(newExerciseName.trim()));

  async function refreshMuscleGroups() {
    try {
      const groups = await apiRequest<ApiMuscleGroup[]>("/muscle-groups");
      setApiMuscleGroups(groups.map(mapApiMuscleGroup));
      setApiStatus("online");
      setApiError("");
    } catch (error) {
      setApiStatus("offline");
      setApiMuscleGroups(null);
      setApiError(error instanceof Error ? error.message : "Backend offline");
    }
  }

  async function refreshWorkoutSetsForGroup(muscleGroupId: string) {
    try {
      const options = await apiRequest<ApiTrainingOption[]>(
        `/muscle-groups/${muscleGroupId}/training-options`
      );
      setApiWorkoutSetsByGroup((setsByGroup) => ({
        ...setsByGroup,
        [muscleGroupId]: options.map(mapApiTrainingOption)
      }));
      setApiStatus("online");
      setApiError("");
    } catch (error) {
      setApiStatus("offline");
      setApiError(error instanceof Error ? error.message : "Backend offline");
    }
  }

  async function refreshTrainingOptionHistory(workoutSetId: string) {
    try {
      const history = await apiRequest<ApiWorkoutSession[]>(
        `/training-options/${workoutSetId}/history`
      );
      setTrainingOptionHistoryById((historyById) => ({
        ...historyById,
        [workoutSetId]: history
      }));
      setApiStatus("online");
      setApiError("");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Could not load history");
    }
  }

  async function syncCompletedWorkout(workout: CompletedWorkoutPayload) {
    const normalizedWorkout = normalizeCompletedWorkoutForApi(workout);

    const response = await apiRequest<ApiCompleteWorkoutResponse>("/workout-sessions", {
      body: JSON.stringify(normalizedWorkout),
      method: "POST"
    });
    saveSyncedCompletedWorkoutId(normalizedWorkout.id);
    await refreshWorkoutSetsForGroup(normalizedWorkout.muscleGroupId);
    await refreshTrainingOptionHistory(normalizedWorkout.workoutSetId);

    return response;
  }

  useEffect(() => {
    if (!authUser) return;

    void refreshMuscleGroups();
  }, [authUser]);

  useEffect(() => {
    if (apiStatus !== "online") return;

    try {
      const storedWorkout = window.localStorage.getItem(
        lastCompletedWorkoutStorageKey
      );
      if (!storedWorkout) return;

      const workout = JSON.parse(storedWorkout) as CompletedWorkoutPayload;
      if (!workout.id || readSyncedCompletedWorkoutIds().includes(workout.id)) {
        return;
      }

      void syncCompletedWorkout(workout).catch((error) => {
        setApiError(
          error instanceof Error ? error.message : "Could not sync workout"
        );
      });
    } catch {
      setApiError("Could not read pending workout");
    }
  }, [apiStatus]);

  useEffect(() => {
    if (!selectedGroupId || apiStatus === "offline") return;

    void refreshWorkoutSetsForGroup(selectedGroupId);
  }, [apiStatus, selectedGroupId]);

  useEffect(() => {
    if (!selectedWorkoutSetId || apiStatus !== "online") return;

    void refreshTrainingOptionHistory(selectedWorkoutSetId);
  }, [apiStatus, selectedWorkoutSetId]);

  useEffect(() => {
    if (countdownStep === null) return undefined;

    const timeout = window.setTimeout(
      () => {
        if (countdownStep === 3) {
          setCountdownStep(2);
          return;
        }
        if (countdownStep === 2) {
          setCountdownStep(1);
          return;
        }
        if (countdownStep === 1) {
          setCountdownStep("sauce");
          return;
        }

        setActiveWorkoutGroupId(countdownWorkoutGroupId);
        setActiveWorkoutSetId(countdownWorkoutSetId);
        setActiveExerciseId(null);
        setSelectedWorkoutSetId(null);
        setStartedWorkoutSetId(null);
        setSelectedGroupId(countdownWorkoutGroupId);
        setCountdownWorkoutSetId(null);
        setCountdownWorkoutGroupId(null);
        setCountdownStep(null);
        setWorkoutLogs({});
        setLastLoggedExerciseId(null);
        setWorkoutStartedAt(Date.now());
        setWorkoutElapsedSeconds(0);
      },
      countdownStep === "sauce" ? 850 : 650
    );

    return () => window.clearTimeout(timeout);
  }, [countdownStep, countdownWorkoutGroupId, countdownWorkoutSetId]);

  useEffect(() => {
    if (!workoutStartedAt) return undefined;
    const startedAt = workoutStartedAt;

    function updateWorkoutElapsed() {
      setWorkoutElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
      );
    }

    updateWorkoutElapsed();
    const interval = window.setInterval(updateWorkoutElapsed, 1000);

    return () => window.clearInterval(interval);
  }, [workoutStartedAt]);

  useEffect(() => {
    if (!restEndsAt) return undefined;
    const endsAt = restEndsAt;

    function updateRestTimer() {
      const remainingSeconds = Math.max(
        0,
        Math.ceil((endsAt - Date.now()) / 1000)
      );

      setRestRemainingSeconds(remainingSeconds);

      if (remainingSeconds === 0) {
        setRestEndsAt(null);
        setSmashCueActive(true);
        playSmashCueSound();
      }
    }

    updateRestTimer();
    const interval = window.setInterval(updateRestTimer, 250);

    return () => window.clearInterval(interval);
  }, [restEndsAt]);

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setPhotoError("");
      setNewGroupImageSrc(await resizeImage(file));
      setNewGroupImageName(file.name);
    } catch (error) {
      setNewGroupImageSrc(null);
      setNewGroupImageName("");
      setPhotoError(error instanceof Error ? error.message : "Photo failed");
    }
  }

  async function handleEditImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setEditPhotoError("");
      setEditGroupImageSrc(await resizeImage(file));
      setEditGroupImageName(file.name);
    } catch (error) {
      setEditPhotoError(error instanceof Error ? error.message : "Photo failed");
    }
  }

  async function handleAddGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = newGroupName.trim();
    if (!name) return;

    const existingGroup = muscleGroups.find(
      (group) => group.name.toLowerCase() === name.toLowerCase()
    );
    if (existingGroup) {
      setNewGroupName("");
      setNewGroupImageSrc(null);
      setNewGroupImageName("");
      setPhotoInputKey((key) => key + 1);
      return;
    }

    if (apiStatus === "online") {
      try {
        const createdGroup = await apiRequest<ApiMuscleGroup>("/muscle-groups", {
          body: JSON.stringify({
            imageSrc: newGroupImageSrc ?? undefined,
            muscleKey: toApiMuscleKey(inferMuscleKey(name)),
            name
          }),
          method: "POST"
        });

        setApiMuscleGroups((groups) => [
          ...(groups ?? []),
          mapApiMuscleGroup(createdGroup)
        ]);
        setNewGroupName("");
        setNewGroupImageSrc(null);
        setNewGroupImageName("");
        setPhotoInputKey((key) => key + 1);
        setPhotoError("");
        setApiError("");
        return;
      } catch (error) {
        setApiError(error instanceof Error ? error.message : "Could not add group");
        return;
      }
    }

    const group: MuscleGroup = {
      id: `custom-${Date.now()}`,
      name,
      muscleKey: inferMuscleKey(name),
      imageSrc: newGroupImageSrc ?? undefined
    };
    const nextGroups = [...customGroups, group];

    setCustomGroups(nextGroups);
    saveCustomGroups(nextGroups);
    setNewGroupName("");
    setNewGroupImageSrc(null);
    setNewGroupImageName("");
    setPhotoInputKey((key) => key + 1);
    setPhotoError("");
  }

  function openEditMuscleGroupDialog(group: MuscleGroup) {
    setEditingMuscleGroupId(group.id);
    setEditGroupName(group.name);
    setEditGroupImageSrc(group.imageSrc ?? null);
    setEditGroupImageName("");
    setEditPhotoError("");
    setEditPhotoInputKey((key) => key + 1);
    setOpenMuscleMenuId(null);
  }

  function closeEditMuscleGroupDialog() {
    setEditingMuscleGroupId(null);
    setEditGroupName("");
    setEditGroupImageSrc(null);
    setEditGroupImageName("");
    setEditPhotoError("");
  }

  async function handleSaveMuscleGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingMuscleGroupId) return;

    const name = editGroupName.trim();
    if (!name) return;

    const existingGroup = muscleGroups.find(
      (group) =>
        group.id !== editingMuscleGroupId &&
        group.name.toLowerCase() === name.toLowerCase()
    );
    if (existingGroup) return;

    if (apiStatus === "online") {
      try {
        const updatedGroup = await apiRequest<ApiMuscleGroup>(
          `/muscle-groups/${editingMuscleGroupId}`,
          {
            body: JSON.stringify({
              imageSrc: editGroupImageSrc ?? undefined,
              muscleKey: toApiMuscleKey(inferMuscleKey(name)),
              name
            }),
            method: "PATCH"
          }
        );

        setApiMuscleGroups((groups) =>
          (groups ?? []).map((group) =>
            group.id === updatedGroup.id ? mapApiMuscleGroup(updatedGroup) : group
          )
        );
        closeEditMuscleGroupDialog();
        setApiError("");
        return;
      } catch (error) {
        setApiError(error instanceof Error ? error.message : "Could not save group");
        return;
      }
    }

    const editedCustomGroup = customGroups.find(
      (group) => group.id === editingMuscleGroupId
    );

    if (editedCustomGroup) {
      const nextGroups = customGroups.map((group) =>
        group.id === editingMuscleGroupId
          ? {
              ...group,
              imageSrc: editGroupImageSrc ?? undefined,
              muscleKey: inferMuscleKey(name),
              name
            }
          : group
      );

      setCustomGroups(nextGroups);
      saveCustomGroups(nextGroups);
      closeEditMuscleGroupDialog();
      return;
    }

    const presetGroup = presetGroups.find((group) => group.id === editingMuscleGroupId);
    if (!presetGroup) return;

    const nextOverrides = {
      ...muscleGroupOverrides,
      [presetGroup.id]: {
        imageSrc: editGroupImageSrc ?? undefined,
        muscleKey: presetGroup.muscleKey,
        name
      }
    };

    setMuscleGroupOverrides(nextOverrides);
    saveMuscleGroupOverrides(nextOverrides);
    closeEditMuscleGroupDialog();
  }

  async function handleDeleteMuscleGroup(group: MuscleGroup) {
    setOpenMuscleMenuId(null);

    if (apiStatus === "online") {
      try {
        await apiRequest<void>(`/muscle-groups/${group.id}`, {
          method: "DELETE"
        });
        setApiMuscleGroups((groups) =>
          (groups ?? []).filter((muscleGroup) => muscleGroup.id !== group.id)
        );
        setApiWorkoutSetsByGroup((setsByGroup) => {
          const nextSetsByGroup = { ...setsByGroup };
          delete nextSetsByGroup[group.id];
          return nextSetsByGroup;
        });
        if (selectedGroupId === group.id) {
          setSelectedGroupId(null);
        }
        setApiError("");
        return;
      } catch (error) {
        setApiError(error instanceof Error ? error.message : "Could not delete group");
        return;
      }
    }

    if (group.id.startsWith("custom-")) {
      const nextGroups = customGroups.filter(
        (customGroup) => customGroup.id !== group.id
      );
      const nextWorkoutSets = customWorkoutSets.filter(
        (workoutSet) => workoutSet.muscleGroupId !== group.id
      );

      setCustomGroups(nextGroups);
      saveCustomGroups(nextGroups);
      setCustomWorkoutSets(nextWorkoutSets);
      saveCustomWorkoutSets(nextWorkoutSets);
      return;
    }

    const nextHiddenIds = hiddenMuscleGroupIds.includes(group.id)
      ? hiddenMuscleGroupIds
      : [...hiddenMuscleGroupIds, group.id];

    setHiddenMuscleGroupIds(nextHiddenIds);
    saveHiddenMuscleGroupIds(nextHiddenIds);
  }

  function resetWorkoutOptionDraft() {
    setNewWorkoutSetName("");
    setNewExerciseName("");
    setNewWorkoutExercises([]);
    setSelectedDraftNames([]);
    setEditingWorkoutSetId(null);
  }

  function openCreateOptionDialog() {
    resetWorkoutOptionDraft();
    setIsOptionDialogOpen(true);
  }

  function openEditOptionDialog(workoutSet: WorkoutSet) {
    setNewWorkoutSetName(workoutSet.name);
    setNewExerciseName("");
    setNewWorkoutExercises(
      workoutSet.exercises.map((exercise) => ({
        name: exercise.name,
        supersetGroup: exercise.supersetGroup ?? null
      }))
    );
    setSelectedDraftNames([]);
    setEditingWorkoutSetId(workoutSet.id);
    setIsOptionDialogOpen(true);
  }

  function closeOptionDialog() {
    setIsOptionDialogOpen(false);
    resetWorkoutOptionDraft();
  }

  function closeSelectedOptionDialog() {
    setSelectedWorkoutSetId(null);
    setStartedWorkoutSetId(null);
  }

  function beginWorkout(workoutSetId: string) {
    if (!selectedGroup) return;
    const workoutSet = workoutSets.find((set) => set.id === workoutSetId);
    const history = trainingOptionHistoryById[workoutSetId] ?? [];
    const baseSession = history[0];

    setCountdownWorkoutGroupId(selectedGroup.id);
    setCountdownWorkoutSetId(workoutSetId);
    setCountdownStep(3);
    setStartedWorkoutSetId(workoutSetId);
    setWorkoutBaselineSets(
      workoutSet ? buildBaselineSetsFromSession(workoutSet, baseSession) : {}
    );
    setFinishedExerciseIds([]);
    setRestEndsAt(null);
    setRestRemainingSeconds(0);
    setSmashCueActive(false);
    setWorkoutAnalytics(null);
  }

  function exitWorkout() {
    setActiveWorkoutGroupId(null);
    setActiveWorkoutSetId(null);
    setActiveExerciseId(null);
    setLastLoggedExerciseId(null);
    setCountdownWorkoutSetId(null);
    setCountdownWorkoutGroupId(null);
    setCountdownStep(null);
    setWorkoutLogs({});
    setWorkoutBaselineSets({});
    setFinishedExerciseIds([]);
    setRestEndsAt(null);
    setRestRemainingSeconds(0);
    setSmashCueActive(false);
    setWorkoutStartedAt(null);
    setWorkoutElapsedSeconds(0);
  }

  function buildCompletedWorkoutPayload(): CompletedWorkoutPayload | null {
    if (!activeWorkoutGroupId || !activeWorkoutSet || !workoutStartedAt) {
      return null;
    }

    const exerciseResults = activeWorkoutSet.exercises.map((exercise) => ({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      sets: (workoutLogs[exercise.id] ?? []).map((set) => ({
        ...set,
        exerciseName: exercise.name
      }))
    }));
    const totalSets = exerciseResults.reduce(
      (total, result) => total + result.sets.length,
      0
    );
    const completedAtMs = Date.now();

    return {
      completedAt: new Date(completedAtMs).toISOString(),
      durationSeconds: Math.max(
        0,
        Math.floor((completedAtMs - workoutStartedAt) / 1000)
      ),
      exerciseResults,
      id: `completed-workout-${completedAtMs}`,
      muscleGroupId: activeWorkoutGroupId,
      startedAt: new Date(workoutStartedAt).toISOString(),
      totalSets,
      workoutSetId: activeWorkoutSet.id,
      workoutSetName: activeWorkoutSet.name
    };
  }

  async function finishWorkout() {
    const completedWorkout = buildCompletedWorkoutPayload();

    if (completedWorkout) {
      const previousSession =
        trainingOptionHistoryById[completedWorkout.workoutSetId]?.[0];
      const analytics = activeWorkoutSet
        ? buildWorkoutAnalytics(completedWorkout, activeWorkoutSet, previousSession)
        : null;

      window.localStorage.setItem(
        lastCompletedWorkoutStorageKey,
        JSON.stringify(completedWorkout)
      );
      setWorkoutAnalytics(analytics);

      if (apiStatus === "online") {
        try {
          const response = await syncCompletedWorkout(completedWorkout);
          setWorkoutAnalytics(response.analytics);
          setApiError("");
        } catch (error) {
          setApiError(
            error instanceof Error ? error.message : "Could not save workout"
          );
        }
      }
    }

    exitWorkout();
    setSelectedGroupId(null);
    setSelectedWorkoutSetId(null);
    setStartedWorkoutSetId(null);
  }

  function viewPastSessionStats(
    session: ApiWorkoutSession,
    workoutSet: WorkoutSet,
    history: ApiWorkoutSession[]
  ) {
    const sessionIndex = history.findIndex((entry) => entry.id === session.id);
    const previousSession =
      sessionIndex === -1 ? undefined : history[sessionIndex + 1];
    const completedWorkout = buildCompletedWorkoutPayloadFromSession(session);

    setWorkoutAnalytics(
      buildWorkoutAnalytics(completedWorkout, workoutSet, previousSession)
    );
  }

  async function handleShareWorkout(analytics: WorkoutAnalytics) {
    const text = buildWorkoutShareText(analytics);

    if (navigator.share) {
      try {
        await navigator.share({ text, title: "Pelsmasher workout" });
      } catch {
        // user cancelled the native share sheet, nothing to do
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setShareStatus("Copied to clipboard");
    } catch {
      setShareStatus("Could not share");
    }

    setTimeout(() => setShareStatus(""), 2500);
  }

  function returnToActiveWorkout() {
    if (!activeWorkoutGroupId || !activeWorkoutSetId) return;

    setSelectedGroupId(activeWorkoutGroupId);
    setSelectedWorkoutSetId(null);
    setStartedWorkoutSetId(null);
    setIsOptionDialogOpen(false);
    setOpenMuscleMenuId(null);
    closeEditMuscleGroupDialog();
    closeOptionDialog();
  }

  function openExerciseRecorder(exercise: Exercise) {
    const exerciseLogs = workoutLogs[exercise.id] ?? [];
    const lastLoggedSet = exerciseLogs[exerciseLogs.length - 1];
    const baselineSets = workoutBaselineSets[exercise.id] ?? [];
    const nextBaselineSet = baselineSets[exerciseLogs.length] ?? baselineSets[0];

    setActiveExerciseId(exercise.id);
    setWeightValue(lastLoggedSet?.weight ?? nextBaselineSet?.weight ?? 80);
    setRepValue(lastLoggedSet?.reps ?? nextBaselineSet?.reps ?? 8);
    setSmashCueActive(false);
  }

  function logExerciseSet() {
    if (!activeExercise) return;

    const loggedSet: LoggedExerciseSet = {
      id: `logged-set-${Date.now()}`,
      exerciseId: activeExercise.id,
      weight: weightValue,
      reps: repValue,
      performedAt: new Date().toISOString()
    };

    setWorkoutLogs((logs) => ({
      ...logs,
      [activeExercise.id]: [...(logs[activeExercise.id] ?? []), loggedSet]
    }));
    setLastLoggedExerciseId(activeExercise.id);
    setWeightValue((value) => clamp(value + 2.5, 0, 300));

    const hasSupersetPartnerNext =
      activeExercise.supersetGroup != null &&
      nextExercise?.supersetGroup === activeExercise.supersetGroup;

    if (hasSupersetPartnerNext && nextExercise) {
      setRestEndsAt(null);
      setRestRemainingSeconds(0);
      setSmashCueActive(false);
      openExerciseRecorder(nextExercise);
      return;
    }

    setSmashCueActive(false);

    if (restTimerEnabled) {
      setRestRemainingSeconds(restDurationSeconds);
      setRestEndsAt(Date.now() + restDurationSeconds * 1000);
    } else {
      setRestRemainingSeconds(0);
      setRestEndsAt(null);
    }

    if (activeExercise.supersetGroup != null && activeWorkoutSet) {
      const firstGroupMember = activeWorkoutSet.exercises.find(
        (exercise) => exercise.supersetGroup === activeExercise.supersetGroup
      );

      if (firstGroupMember && firstGroupMember.id !== activeExercise.id) {
        openExerciseRecorder(firstGroupMember);
      }
    }
  }

  function goToNextExercise() {
    if (!activeExercise) return;

    setFinishedExerciseIds((ids) =>
      ids.includes(activeExercise.id) ? ids : [...ids, activeExercise.id]
    );
    setRestEndsAt(null);
    setRestRemainingSeconds(0);
    setSmashCueActive(false);

    if (nextExercise) {
      openExerciseRecorder(nextExercise);
      return;
    }

    setActiveExerciseId(null);
  }

  function handleAddExerciseDraft() {
    const name = newExerciseName.trim();
    if (!name) return;

    const alreadyAdded = newWorkoutExercises.some(
      (exercise) => exercise.name.toLowerCase() === name.toLowerCase()
    );
    if (alreadyAdded) {
      setNewExerciseName("");
      return;
    }

    setNewWorkoutExercises((exercises) => [
      ...exercises,
      { name, supersetGroup: null }
    ]);
    setNewExerciseName("");
  }

  function handleRemoveExerciseDraft(name: string) {
    setNewWorkoutExercises((exercises) =>
      exercises.filter((exercise) => exercise.name !== name)
    );
    setSelectedDraftNames((names) => names.filter((selected) => selected !== name));
  }

  function toggleDraftSelection(name: string) {
    setSelectedDraftNames((names) =>
      names.includes(name)
        ? names.filter((selected) => selected !== name)
        : [...names, name]
    );
  }

  function groupSelectedAsSuperset() {
    if (selectedDraftNames.length < 2) return;

    const nextGroup =
      1 +
      newWorkoutExercises.reduce(
        (max, exercise) => Math.max(max, exercise.supersetGroup ?? 0),
        0
      );

    setNewWorkoutExercises((exercises) => {
      const firstSelectedIndex = exercises.findIndex((exercise) =>
        selectedDraftNames.includes(exercise.name)
      );
      const rest = exercises.filter(
        (exercise) => !selectedDraftNames.includes(exercise.name)
      );
      const insertAt = exercises
        .slice(0, firstSelectedIndex)
        .filter((exercise) => !selectedDraftNames.includes(exercise.name)).length;
      const grouped = exercises
        .filter((exercise) => selectedDraftNames.includes(exercise.name))
        .map((exercise) => ({ ...exercise, supersetGroup: nextGroup }));

      return [...rest.slice(0, insertAt), ...grouped, ...rest.slice(insertAt)];
    });
    setSelectedDraftNames([]);
  }

  function ungroupExerciseDraft(name: string) {
    setNewWorkoutExercises((exercises) =>
      exercises.map((exercise) =>
        exercise.name === name ? { ...exercise, supersetGroup: null } : exercise
      )
    );
  }

  function buildExerciseNameDraft(): ExerciseDraft[] {
    return [
      ...newWorkoutExercises,
      ...newExerciseName
        .split(",")
        .map((exercise) => exercise.trim())
        .filter(Boolean)
        .map((name) => ({ name, supersetGroup: null }) as ExerciseDraft)
    ].filter(
      (exercise, index, exercises) =>
        exercises.findIndex(
          (candidate) => candidate.name.toLowerCase() === exercise.name.toLowerCase()
        ) === index
    );
  }

  function upsertWorkoutSet(workoutSet: WorkoutSet) {
    const nextSets = customWorkoutSets.some((set) => set.id === workoutSet.id)
      ? customWorkoutSets.map((set) =>
          set.id === workoutSet.id ? workoutSet : set
        )
      : [...customWorkoutSets, workoutSet];

    setCustomWorkoutSets(nextSets);
    saveCustomWorkoutSets(nextSets);
  }

  async function handleSaveWorkoutSet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGroup) return;

    const name = newWorkoutSetName.trim();
    if (!name) return;

    const existingSet = workoutSets.find(
      (set) =>
        set.id !== editingWorkoutSetId &&
        set.name.toLowerCase() === name.toLowerCase()
    );
    if (existingSet) {
      setSelectedWorkoutSetId(existingSet.id);
      setIsOptionDialogOpen(false);
      resetWorkoutOptionDraft();
      return;
    }

    const exerciseDrafts = buildExerciseNameDraft();
    if (exerciseDrafts.length === 0) return;

    if (apiStatus === "online") {
      const payload = {
        exercises: exerciseDrafts.map((exercise) => ({
          name: exercise.name,
          supersetGroup: exercise.supersetGroup
        })),
        muscleGroupId: selectedGroup.id,
        name
      };

      try {
        const savedOption = editingWorkoutSetId
          ? await apiRequest<ApiTrainingOption>(
              `/training-options/${editingWorkoutSetId}`,
              {
                body: JSON.stringify({
                  exercises: payload.exercises,
                  name: payload.name
                }),
                method: "PATCH"
              }
            )
          : await apiRequest<ApiTrainingOption>("/training-options", {
              body: JSON.stringify(payload),
              method: "POST"
            });
        const mappedOption = mapApiTrainingOption(savedOption);

        setApiWorkoutSetsByGroup((setsByGroup) => {
          const currentSets = setsByGroup[selectedGroup.id] ?? [];
          const nextSets = currentSets.some((set) => set.id === mappedOption.id)
            ? currentSets.map((set) =>
                set.id === mappedOption.id ? mappedOption : set
              )
            : [...currentSets, mappedOption];

          return {
            ...setsByGroup,
            [selectedGroup.id]: nextSets
          };
        });
        setSelectedWorkoutSetId(mappedOption.id);
        setIsOptionDialogOpen(false);
        resetWorkoutOptionDraft();
        setApiError("");
        return;
      } catch (error) {
        setApiError(
          error instanceof Error ? error.message : "Could not save training option"
        );
        return;
      }
    }

    const existingEditedSet = editingWorkoutSetId
      ? workoutSets.find((set) => set.id === editingWorkoutSetId)
      : null;
    const workoutSetId = editingWorkoutSetId ?? `workout-set-${Date.now()}`;
    const baseExercises = buildExercisesWithHistory(
      exerciseDrafts.map((exercise) => exercise.name),
      workoutSetId,
      existingEditedSet?.exercises
    );
    const workoutSet: WorkoutSet = {
      id: workoutSetId,
      muscleGroupId: selectedGroup.id,
      name,
      exercises: baseExercises.map((exercise, index) => ({
        ...exercise,
        supersetGroup: exerciseDrafts[index]?.supersetGroup ?? null
      })),
      history: existingEditedSet?.history ?? [],
      isDefault: existingEditedSet?.isDefault
    };

    upsertWorkoutSet(workoutSet);
    setSelectedWorkoutSetId(workoutSet.id);
    setIsOptionDialogOpen(false);
    resetWorkoutOptionDraft();
  }

  async function handleDeleteWorkoutSet(workoutSet: WorkoutSet) {
    if (apiStatus === "online") {
      try {
        await apiRequest<void>(`/training-options/${workoutSet.id}`, {
          method: "DELETE"
        });
        setApiWorkoutSetsByGroup((setsByGroup) => ({
          ...setsByGroup,
          [workoutSet.muscleGroupId]: (setsByGroup[workoutSet.muscleGroupId] ?? [])
            .filter((set) => set.id !== workoutSet.id)
        }));
        if (selectedWorkoutSetId === workoutSet.id) {
          setSelectedWorkoutSetId(null);
        }
        if (startedWorkoutSetId === workoutSet.id) {
          setStartedWorkoutSetId(null);
        }
        setApiError("");
        return;
      } catch (error) {
        setApiError(
          error instanceof Error ? error.message : "Could not delete training option"
        );
        return;
      }
    }

    if (workoutSet.isDefault || workoutSet.id.startsWith("default-")) {
      const nextArchivedIds = [...archivedWorkoutSetIds, workoutSet.id];
      setArchivedWorkoutSetIds(nextArchivedIds);
      saveArchivedWorkoutSetIds(nextArchivedIds);
    } else {
      const nextSets = customWorkoutSets.map((set) =>
        set.id === workoutSet.id ? { ...set, archived: true } : set
      );
      setCustomWorkoutSets(nextSets);
      saveCustomWorkoutSets(nextSets);
    }

    if (selectedWorkoutSetId === workoutSet.id) {
      setSelectedWorkoutSetId(null);
    }
    if (startedWorkoutSetId === workoutSet.id) {
      setStartedWorkoutSetId(null);
    }
  }

  function handleBackToGroups() {
    setSelectedGroupId(null);
    setSelectedWorkoutSetId(null);
    setStartedWorkoutSetId(null);
    setActiveExerciseId(null);
    setIsOptionDialogOpen(false);
    resetWorkoutOptionDraft();
  }

  const activeLoggedSetsTotal = Object.values(workoutLogs).reduce(
    (total, sets) => total + sets.length,
    0
  );
  const hasActiveWorkout = Boolean(activeWorkoutSet && workoutStartedAt);
  const lastLoggedExercise = activeWorkoutSet?.exercises.find(
    (exercise) => exercise.id === lastLoggedExerciseId
  );
  const bannerExercise =
    lastLoggedExercise ??
    activeExercise ??
    activeWorkoutSet?.exercises.find(
      (exercise) => !finishedExerciseIds.includes(exercise.id)
    ) ??
    activeWorkoutSet?.exercises[0];
  const isInsideActiveWorkout =
    Boolean(selectedGroup?.id === activeWorkoutGroupId && activeWorkoutSet);
  const shellClassName = `app-shell${
    hasActiveWorkout && !isInsideActiveWorkout ? " has-live-workout" : ""
  }`;
  const workoutShellClassName = "app-shell workout-shell";
  const liveWorkoutBanner =
    hasActiveWorkout && activeWorkoutSet && !isInsideActiveWorkout ? (
      <button
        className="live-workout-banner"
        type="button"
        aria-label={`Return to active workout ${activeWorkoutSet.name}`}
        onClick={returnToActiveWorkout}
      >
        <span className="live-workout-icon">
          <Timer size={20} strokeWidth={3} />
        </span>
        <span className="live-workout-copy">
          <strong>{activeWorkoutSet.name}</strong>
          <small>
            {bannerExercise ? `${bannerExercise.name} · ` : ""}
            Live · {formatWorkoutElapsed(workoutElapsedSeconds)} ·{" "}
            {activeLoggedSetsTotal} sets
          </small>
        </span>
        <ArrowRight size={21} strokeWidth={3} />
      </button>
    ) : null;
  const isRegisterMode = authMode === "register";

  if (!authUser) {
    return (
      <main className="app-shell auth-shell">
        <div className="auth-center">
          <section className="auth-brand" aria-label="App header">
            <h1 className="sr-only">{isRegisterMode ? "Register" : "Log in"}</h1>
            <p className="auth-wordmark" aria-hidden="true">
              PELSMASHER<span className="auth-wordmark-dot">.</span>
            </p>
            <p className="auth-tagline">STRENGTH LOG</p>
          </section>

          <section className="auth-panel auth-gate-panel" aria-label="Account">
            <form
              className="auth-form"
              onSubmit={(event) => {
                event.preventDefault();
                void (isRegisterMode ? handleRegister() : handleLogin());
              }}
            >
              {isRegisterMode ? (
                <label className="auth-field">
                  <span>Username</span>
                  <input
                    aria-label="Username"
                    autoComplete="username"
                    placeholder="ironmike"
                    value={authUsername}
                    onChange={(event) => setAuthUsername(event.target.value)}
                  />
                </label>
              ) : null}
              <label className="auth-field">
                <span>Email</span>
                <input
                  aria-label="Email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@gym.com"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                />
              </label>
              <label className="auth-field">
                <span>Password</span>
                <input
                  aria-label="Password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  type="password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                />
              </label>
              {isRegisterMode ? (
                <label className="auth-field">
                  <span>Repeat password</span>
                  <input
                    aria-label="Repeat password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    type="password"
                    value={authRepeatPassword}
                    onChange={(event) => setAuthRepeatPassword(event.target.value)}
                  />
                </label>
              ) : null}
              <div className="auth-actions">
                <button type="submit">{isRegisterMode ? "Register" : "Log in"}</button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(isRegisterMode ? "login" : "register");
                    setAuthError("");
                  }}
                >
                  {isRegisterMode ? "Log in" : "Create account"}
                </button>
              </div>
              {authError ? <p>{authError}</p> : null}
            </form>
          </section>
        </div>

        <p className="auth-footer-tagline">Log the truth. Come back stronger.</p>
      </main>
    );
  }

  if (workoutAnalytics) {
    const improvedExercises = workoutAnalytics.exercises.filter(
      (exercise) => exercise.diff > 0
    );
    const worsenedExercises = workoutAnalytics.exercises.filter(
      (exercise) => exercise.diff < 0
    );
    const unchangedExercises = workoutAnalytics.exercises.filter(
      (exercise) => exercise.diff === 0
    );

    return (
      <main className="app-shell workout-summary-shell">
        <section className="top-bar home-top-bar" aria-label="Workout summary header">
          <div>
            <p className="eyebrow">
              Workout complete · {formatHistoryDateTime(workoutAnalytics.completedAt)}
            </p>
            <h1>Results</h1>
          </div>
          <button
            className="logout-button"
            type="button"
            aria-label="Share workout"
            onClick={() => void handleShareWorkout(workoutAnalytics)}
          >
            <Share2 size={20} strokeWidth={2.5} />
          </button>
        </section>
        {shareStatus ? <p className="share-status">{shareStatus}</p> : null}

        <section className="workout-summary-panel">
          <div className="summary-title-row">
            <h2>{workoutAnalytics.workoutSetName}</h2>
            <strong>{formatWorkoutElapsed(workoutAnalytics.durationSeconds)}</strong>
          </div>

          <div className="summary-hero">
            <strong>
              {workoutAnalytics.diff > 0 ? "+" : ""}
              {formatVolume(workoutAnalytics.diff)}
            </strong>
            <span>Volume vs last session</span>
          </div>

          <div className="summary-metric-grid">
            <div>
              <span>Total volume</span>
              <strong>{formatVolume(workoutAnalytics.currentVolume)}</strong>
            </div>
            <div>
              <span>Previous</span>
              <strong>
                {workoutAnalytics.previousVolume > 0
                  ? formatVolume(workoutAnalytics.previousVolume)
                  : "-"}
              </strong>
            </div>
            <div className={workoutAnalytics.diff >= 0 ? "is-up" : "is-down"}>
              <span>Change</span>
              <strong>
                {workoutAnalytics.diff > 0 ? "+" : ""}
                {formatVolume(workoutAnalytics.diff)}
              </strong>
            </div>
            <div>
              <span>Sets</span>
              <strong>
                {workoutAnalytics.currentSets}
                {workoutAnalytics.previousSets > 0
                  ? ` / ${workoutAnalytics.previousSets}`
                  : ""}
              </strong>
            </div>
          </div>

          <div className="summary-verdict">
            <span>Verdict</span>
            <strong>{workoutAnalytics.verdict}</strong>
          </div>

          <div className="summary-status-grid">
            <div>
              <span>Improved</span>
              <strong>{improvedExercises.length}</strong>
            </div>
            <div>
              <span>Worse</span>
              <strong>{worsenedExercises.length}</strong>
            </div>
            <div>
              <span>Same</span>
              <strong>{unchangedExercises.length}</strong>
            </div>
          </div>

          <div className="exercise-analytics-list">
            {workoutAnalytics.exercises.map((exercise) => (
              <article
                className={`exercise-analytics-card${
                  exercise.diff > 0
                    ? " is-up"
                    : exercise.diff < 0
                      ? " is-down"
                      : ""
                }`}
                key={exercise.name}
              >
                <div>
                  <strong>{exercise.name}</strong>
                  <span>
                    {exercise.currentSets} sets
                    {exercise.previousSets > 0 ? ` · previous ${exercise.previousSets}` : ""}
                  </span>
                </div>
                <div>
                  <b>{formatVolume(exercise.currentVolume)}</b>
                  <small>
                    {exercise.diff > 0 ? "+" : ""}
                    {formatVolume(exercise.diff)}
                  </small>
                </div>
                <p>
                  Best weight:{" "}
                  {exercise.currentBestWeight > 0
                    ? `${formatMetricValue(exercise.currentBestWeight)} kg`
                    : "-"}
                  {exercise.previousBestWeight > 0
                    ? ` · previous ${formatMetricValue(exercise.previousBestWeight)} kg`
                    : ""}
                </p>
              </article>
            ))}
          </div>

          <button
            className="summary-continue-button"
            type="button"
            onClick={() => setWorkoutAnalytics(null)}
          >
            <Check size={23} strokeWidth={3} />
            Continue
          </button>
        </section>
      </main>
    );
  }

  if (selectedGroup) {
    const totalLoggedSets = Object.values(workoutLogs).reduce(
      (total, sets) => total + sets.length,
      0
    );
    const countdownOverlay = countdownStep ? (
      <div className="countdown-overlay" aria-live="assertive">
        <div className="countdown-core">
          <span>{countdownStep === "sauce" ? "ДАВИ СОУС!" : countdownStep}</span>
        </div>
      </div>
    ) : null;

    if (activeWorkoutSet && selectedGroup.id === activeWorkoutGroupId) {
      if (activeExercise) {
        const baselineSets = workoutBaselineSets[activeExercise.id] ?? [];
        const previousSet =
          baselineSets[activeExerciseLogs.length] ?? baselineSets[baselineSets.length - 1];
        const isResting = restRemainingSeconds > 0;
        const hasSupersetPartnerNext =
          activeExercise.supersetGroup != null &&
          nextExercise?.supersetGroup === activeExercise.supersetGroup;
        const firstGroupMember =
          activeExercise.supersetGroup != null && activeWorkoutSet
            ? activeWorkoutSet.exercises.find(
                (exercise) => exercise.supersetGroup === activeExercise.supersetGroup
              )
            : undefined;
        const isLastInSupersetRound =
          !hasSupersetPartnerNext &&
          Boolean(firstGroupMember) &&
          firstGroupMember!.id !== activeExercise.id;

        return (
          <main className={workoutShellClassName}>
            <section
              className="top-bar screen-two-header screen-two-header--recorder"
              aria-label="Workout header"
            >
              <button
                className="back-button"
                type="button"
                aria-label="Back to workout exercises"
                onClick={() => setActiveExerciseId(null)}
              >
                <ArrowLeft size={23} strokeWidth={3} />
              </button>
              <div>
                <p className="eyebrow">Record set</p>
                <h1>{activeExercise.name}</h1>
              </div>
            </section>

            <section className="workout-panel recorder-panel">
              <div className="record-summary">
                <div>
                  <span>Set</span>
                  <strong>{activeExerciseLogs.length + 1}</strong>
                </div>
                <div>
                  <span>Previous</span>
                  <strong>{previousSet ? formatSetResult(previousSet) : "No data"}</strong>
                </div>
              </div>

              {hasSupersetPartnerNext ? (
                <p className="superset-hint">
                  Superset · no rest · next {nextExercise!.name}
                </p>
              ) : isLastInSupersetRound ? (
                <p className="superset-hint">
                  Superset · rest, then back to {firstGroupMember!.name}
                </p>
              ) : null}

              <div className="recorded-set-strip">
                {activeExerciseLogs.length > 0 ? (
                  activeExerciseLogs.map((set, index) => (
                    <span key={set.id}>
                      {index + 1}: {formatMetricValue(set.weight)} x {set.reps}
                    </span>
                  ))
                ) : (
                  <small>No sets logged yet</small>
                )}
              </div>

              {isResting ? (
                <div className="rest-timer-card" aria-live="polite">
                  <div>
                    <span>Rest</span>
                    <strong>{formatRestTime(restRemainingSeconds)}</strong>
                  </div>
                  <div className="rest-timer-bar" aria-hidden="true">
                    <span
                      key={restEndsAt}
                      className="rest-timer-fill"
                      style={{ animationDuration: `${restDurationSeconds}s` }}
                    />
                  </div>
                </div>
              ) : smashCueActive ? (
                <div className="smash-cue" aria-live="assertive">
                  <span className="smash-cue-inner">
                    <Zap size={14} strokeWidth={3} aria-hidden="true" />
                    <span>Next set waiting</span>
                  </span>
                </div>
              ) : null}

              <div className="set-value-display" aria-label="Current set values">
                <div>
                  <span>Weight</span>
                  <strong>{formatMetricValue(weightValue)}</strong>
                  <small>kg</small>
                </div>
                <b>x</b>
                <div>
                  <span>Reps</span>
                  <strong>{repValue}</strong>
                  <small>reps</small>
                </div>
              </div>

              <div className="vertical-picker-grid">
                <VerticalMetricPicker
                  label="Weight"
                  majorEvery={10}
                  max={300}
                  min={0}
                  onChange={setWeightValue}
                  pixelsPerStep={18}
                  step={2.5}
                  value={weightValue}
                />
                <VerticalMetricPicker
                  label="Reps"
                  majorEvery={5}
                  max={30}
                  min={1}
                  onChange={setRepValue}
                  pixelsPerStep={34}
                  step={1}
                  value={repValue}
                />
              </div>

              <div className="recorder-actions">
                <button
                  className="log-set-button"
                  type="button"
                  onClick={logExerciseSet}
                >
                  <Check size={23} strokeWidth={3} />
                  Log set
                </button>
                <button
                  className="next-exercise-button"
                  type="button"
                  onClick={goToNextExercise}
                >
                  <ArrowRight size={23} strokeWidth={3} />
                  {nextExercise ? "Next exercise" : "Finish exercise"}
                </button>
              </div>
            </section>
            {countdownOverlay}
          </main>
        );
      }

      const exerciseDisplayLabels = buildExerciseDisplayLabels(
        activeWorkoutSet.exercises
      );
      const allExercisesFinished =
        activeWorkoutSet.exercises.length > 0 &&
        activeWorkoutSet.exercises.every((exercise) =>
          finishedExerciseIds.includes(exercise.id)
        );

      return (
        <main className={workoutShellClassName}>
          <section
            className="top-bar screen-two-header screen-two-header--workout"
            aria-label="Workout header"
          >
            <button
              className="back-button"
              type="button"
              aria-label="Back to training options"
              onClick={handleBackToGroups}
            >
              <ArrowLeft size={23} strokeWidth={3} />
            </button>
            <div>
              <p className="eyebrow is-accent is-live">Live workout</p>
              <h1>{activeWorkoutSet.name}</h1>
            </div>
          </section>

          <section className="workout-panel" aria-labelledby="workout-exercises-title">
            <div className="section-heading">
              <h2 id="workout-exercises-title">Exercises</h2>
              <span>{totalLoggedSets} sets</span>
            </div>

            <div className="workout-exercise-list">
              {activeWorkoutSet.exercises.map((exercise, index) => {
                const exerciseLogs = workoutLogs[exercise.id] ?? [];
                const isFinished = finishedExerciseIds.includes(exercise.id);
                const label = exerciseDisplayLabels[index] ?? String(index + 1);
                const isGroupContinuation =
                  exercise.supersetGroup != null &&
                  activeWorkoutSet.exercises[index - 1]?.supersetGroup ===
                    exercise.supersetGroup;

                return (
                  <button
                    className={`workout-exercise-button${
                      isFinished ? " is-finished" : ""
                    }${exercise.supersetGroup != null ? " is-linked" : ""}${
                      isGroupContinuation ? " is-linked-continuation" : ""
                    }`}
                    key={exercise.id}
                    type="button"
                    onClick={() => openExerciseRecorder(exercise)}
                  >
                    <span className="exercise-index">
                      {isFinished ? <Check size={21} strokeWidth={3} /> : label}
                    </span>
                    <span>
                      <strong>{exercise.name}</strong>
                      <small>
                        {isFinished
                          ? `Finished · ${exerciseLogs.length} sets logged`
                          : exerciseLogs.length > 0
                          ? `${exerciseLogs.length} sets logged`
                          : "Tap to record indicators"}
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              className={`finish-workout-button workout-finish-main${
                allExercisesFinished ? " is-ready" : ""
              }`}
              type="button"
              onClick={finishWorkout}
            >
              <Check size={23} strokeWidth={3} />
              Finish workout
            </button>
          </section>
          {countdownOverlay}
        </main>
      );
    }

    return (
      <main className={shellClassName}>
        <section
          className="top-bar screen-two-header screen-two-header--options"
          aria-label="App header"
        >
          <button
            className="back-button"
            type="button"
            aria-label="Back to muscle groups"
            onClick={handleBackToGroups}
          >
            <ArrowLeft size={23} strokeWidth={3} />
          </button>
          <div>
            <p className="eyebrow">Training options</p>
            <h1>{selectedGroup.name}</h1>
          </div>
        </section>
        {liveWorkoutBanner}

        <section className="choice-panel" aria-labelledby="workout-options-title">
            <div className="section-heading">
              <h2 id="workout-options-title">Training options</h2>
              <span>{workoutSets.length}</span>
            </div>
            <p className="api-status-line">
              {apiStatus === "online"
                ? `Backend online · ${apiBaseUrl}`
                : apiStatus === "loading"
                ? "Connecting backend..."
                : "Backend offline · local fallback"}
            </p>

          <div className="routine-grid">
            {workoutSets.map((workoutSet) => {
              const isSelected = selectedWorkoutSetId === workoutSet.id;

              return (
                <div
                  className={`routine-card${isSelected ? " is-selected" : ""}`}
                  key={workoutSet.id}
                >
                  <button
                    className="routine-select"
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedWorkoutSetId(workoutSet.id);
                      setStartedWorkoutSetId(null);
                    }}
                  >
                    <span className="routine-copy">
                      <strong>{workoutSet.name}</strong>
                      <span className="routine-meta">
                        <span>{workoutSet.isDefault ? "Default" : "Custom"}</span>
                        <span>{workoutSet.exercises.length} exercises</span>
                        <span>
                          {workoutSet.completedSessions ?? workoutSet.history.length} sessions
                        </span>
                      </span>
                    </span>
                  </button>
                  <div className="routine-actions" aria-label={`${workoutSet.name} actions`}>
                    <button
                      className="edit-option-button"
                      type="button"
                      aria-label={`Edit ${workoutSet.name}`}
                      onClick={() => openEditOptionDialog(workoutSet)}
                    >
                      <Pencil size={20} strokeWidth={2.8} />
                    </button>
                    <button
                      className="delete-option-button"
                      type="button"
                      aria-label={`Delete ${workoutSet.name}`}
                      onClick={() => handleDeleteWorkoutSet(workoutSet)}
                    >
                      <Trash2 size={20} strokeWidth={2.8} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            className="open-option-dialog-button"
            type="button"
            onClick={openCreateOptionDialog}
          >
            <Plus size={22} strokeWidth={3} />
            Create option
          </button>

          {selectedWorkoutSet ? (
            <div
              className="selected-option-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  closeSelectedOptionDialog();
                }
              }}
            >
              <section
                className="selected-option-dialog routine-detail"
                aria-label="Selected training option"
                aria-live="polite"
              >
                <div className="routine-detail-heading">
                  <div>
                    <p className="detail-kicker">Selected option</p>
                    <h2>{selectedWorkoutSet.name}</h2>
                  </div>
                  <button
                    className="dialog-close-button"
                    type="button"
                    aria-label="Close selected option"
                    onClick={closeSelectedOptionDialog}
                  >
                    <X size={20} strokeWidth={3} />
                  </button>
                </div>

                <button
                  className="start-button selected-start-button"
                  type="button"
                  onClick={() => beginWorkout(selectedWorkoutSet.id)}
                >
                  <Play size={20} fill="currentColor" strokeWidth={3} />
                  Start
                </button>

                <div className="history-panel">
                  <div className="history-panel-heading">
                    <div>
                      <h3>History</h3>
                      <p>
                        {selectedBaseSession
                          ? `Latest: ${formatHistoryDateTime(
                              selectedBaseSession.completedAt
                            )}`
                          : "No sessions yet"}
                      </p>
                    </div>
                    <div className="history-actions">
                      <div className="history-mode-tabs" role="tablist">
                        <button
                          className={historyView === "compare" ? "is-active" : ""}
                          type="button"
                          onClick={() => setHistoryView("compare")}
                        >
                          Compare
                        </button>
                        <button
                          className={historyView === "sessions" ? "is-active" : ""}
                          type="button"
                          onClick={() => setHistoryView("sessions")}
                        >
                          Sessions
                        </button>
                      </div>
                      <button
                        className="download-history-button"
                        type="button"
                        disabled={selectedWorkoutHistory.length === 0}
                        onClick={() =>
                          downloadTrainingOptionHistory(
                            selectedWorkoutSet,
                            selectedWorkoutHistory
                          )
                        }
                      >
                        Excel
                      </button>
                    </div>
                  </div>

                  {historyView === "compare" ? (
                    selectedWorkoutHistory.length > 0 || isSelectedWorkoutLive ? (
                      <div className="compare-history-list">
                        {selectedWorkoutSet.exercises.map((exercise) => {
                          const previousSets = getSessionExerciseSets(
                            comparePreviousSession,
                            exercise
                          );
                          const lastSets =
                            isSelectedWorkoutLive
                              ? workoutLogs[exercise.id] ?? []
                              : getSessionExerciseSets(compareLastSession, exercise);
                          const rows = Math.max(
                            previousSets.length,
                            lastSets.length,
                            1
                          );

                          return (
                            <article className="compare-exercise-card" key={exercise.id}>
                              <strong>{exercise.name}</strong>
                              <div className="compare-row compare-row-head">
                                <span>Set</span>
                                <span>Previous</span>
                                <span>Last</span>
                              </div>
                              {Array.from({ length: rows }, (_, index) => {
                                const previousSet = previousSets[index];
                                const lastSet = lastSets[index];

                                return (
                                  <div className="compare-row" key={`${exercise.id}-${index}`}>
                                    <span>{index + 1}</span>
                                    <span>
                                      {previousSet ? formatSetResult(previousSet) : "-"}
                                    </span>
                                    <span>
                                      {lastSet ? formatSetResult(lastSet) : "-"}
                                    </span>
                                  </div>
                                );
                              })}
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <p>
                        Finish this option once and the next workout will show
                        set-by-set targets here.
                      </p>
                    )
                  ) : (
                    <div className="session-history-list">
                      {selectedWorkoutHistory.length > 0 ? (
                        selectedWorkoutHistory.map((session) => (
                          <button
                            className="session-history-card"
                            key={session.id}
                            type="button"
                            onClick={() =>
                              viewPastSessionStats(
                                session,
                                selectedWorkoutSet,
                                selectedWorkoutHistory
                              )
                            }
                          >
                            <div className="session-history-topline">
                              <div>
                                <strong>{formatHistoryDateTime(session.completedAt)}</strong>
                                <span>
                                  {session.totalSets} sets ·{" "}
                                  {formatWorkoutElapsed(session.durationSeconds)}
                                </span>
                              </div>
                              <History
                                className="session-history-icon"
                                size={16}
                                strokeWidth={2.5}
                                aria-hidden="true"
                              />
                            </div>
                            <div className="session-exercise-results">
                              {selectedWorkoutSet.exercises.map((exercise) => {
                                const sets = getSessionExerciseSets(session, exercise);
                                if (sets.length === 0) return null;

                                return (
                                  <div key={`${session.id}-${exercise.id}`}>
                                    <span>{exercise.name}</span>
                                    <div>
                                      {sets.map((set) => (
                                        <b key={set.id}>
                                          {set.setNumber}: {formatSetResult(set)}
                                        </b>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </button>
                        ))
                      ) : (
                        <p>No finished sessions for this option yet.</p>
                      )}
                    </div>
                  )}
                </div>

                {startedWorkoutSetId === selectedWorkoutSet.id ? (
                  <p className="start-status">Workout started. Exercise logging is next.</p>
                ) : null}
              </section>
            </div>
          ) : null}

          {isOptionDialogOpen ? (
            <div
              className="option-dialog-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  closeOptionDialog();
                }
              }}
            >
              <form
                className="option-dialog"
                aria-label={
                  editingWorkoutSetId
                    ? "Edit training option"
                    : "Create training option"
                }
                onSubmit={handleSaveWorkoutSet}
              >
                <div className="option-dialog-heading">
                  <div>
                    <p className="detail-kicker">
                      {editingWorkoutSetId ? "Edit option" : "New option"}
                    </p>
                    <h2>
                      {editingWorkoutSetId
                        ? "Configure exercises"
                        : "Create training option"}
                    </h2>
                  </div>
                  <button
                    className="dialog-close-button"
                    type="button"
                    aria-label="Close training option dialog"
                    onClick={closeOptionDialog}
                  >
                    <X size={20} strokeWidth={3} />
                  </button>
                </div>

                <input
                  aria-label="Training option name"
                  placeholder="Training option name"
                  value={newWorkoutSetName}
                  onChange={(event) => setNewWorkoutSetName(event.target.value)}
                />
                <div className="exercise-builder">
                  <input
                    aria-label="Exercise name"
                    placeholder="Exercise name"
                    value={newExerciseName}
                    onChange={(event) => setNewExerciseName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleAddExerciseDraft();
                      }
                    }}
                  />
                  <button
                    type="button"
                    aria-label="Add exercise to training option"
                    disabled={!newExerciseName.trim()}
                    onClick={handleAddExerciseDraft}
                  >
                    <Plus size={22} strokeWidth={3} />
                  </button>
                </div>
                <div className="exercise-draft-list">
                  {newWorkoutExercises.length > 0 ? (
                    newWorkoutExercises.map((exercise) => {
                      const isSelected = selectedDraftNames.includes(exercise.name);
                      const groupLetter = exercise.supersetGroup
                        ? String.fromCharCode(
                            65 +
                              newWorkoutExercises
                                .filter(
                                  (candidate) =>
                                    candidate.supersetGroup === exercise.supersetGroup
                                )
                                .findIndex((candidate) => candidate.name === exercise.name)
                          )
                        : null;

                      return (
                        <span
                          key={exercise.name}
                          className={`exercise-draft-chip${
                            exercise.supersetGroup ? " is-grouped" : ""
                          }${isSelected ? " is-selected" : ""}`}
                        >
                          <button
                            type="button"
                            className="exercise-draft-select"
                            aria-pressed={isSelected}
                            aria-label={`Select ${exercise.name} for superset`}
                            onClick={() => toggleDraftSelection(exercise.name)}
                          >
                            {groupLetter ? <b>{groupLetter}</b> : null}
                            {exercise.name}
                          </button>
                          {exercise.supersetGroup ? (
                            <button
                              type="button"
                              className="exercise-draft-unlink"
                              aria-label={`Unlink ${exercise.name} from superset`}
                              onClick={() => ungroupExerciseDraft(exercise.name)}
                            >
                              <Unlink2 size={14} strokeWidth={3} />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="exercise-draft-remove"
                            aria-label={`Remove ${exercise.name}`}
                            onClick={() => handleRemoveExerciseDraft(exercise.name)}
                          >
                            <X size={16} strokeWidth={3} />
                          </button>
                        </span>
                      );
                    })
                  ) : (
                    <small>Add as many exercises as you need</small>
                  )}
                </div>
                {selectedDraftNames.length >= 2 ? (
                  <button
                    type="button"
                    className="group-superset-button"
                    onClick={groupSelectedAsSuperset}
                  >
                    <Link2 size={16} strokeWidth={3} />
                    Link {selectedDraftNames.length} as superset
                  </button>
                ) : null}
                <button
                  className="create-option-button"
                  type="submit"
                  aria-label="Save training option"
                  disabled={!canCreateWorkoutOption}
                >
                  <Plus size={22} strokeWidth={3} />
                  {editingWorkoutSetId ? "Save option" : "Create option"}
                </button>
              </form>
            </div>
          ) : null}
        </section>
        {countdownOverlay}
      </main>
    );
  }

  if (isSettingsOpen) {
    return (
      <main className={shellClassName}>
        <section
          className="top-bar screen-two-header screen-two-header--options"
          aria-label="Settings header"
        >
          <button
            className="back-button"
            type="button"
            aria-label="Back to home"
            onClick={() => setIsSettingsOpen(false)}
          >
            <ArrowLeft size={23} strokeWidth={3} />
          </button>
          <div>
            <p className="eyebrow">Configs</p>
            <h1>Settings</h1>
          </div>
        </section>

        <section className="workout-panel settings-panel">
          <div className="settings-row">
            <div>
              <strong>Rest timer</strong>
              <small>Countdown between sets</small>
            </div>
            <button
              className="settings-toggle"
              type="button"
              role="switch"
              aria-checked={restTimerEnabled}
              aria-label="Rest timer"
              onClick={toggleRestTimerEnabled}
            />
          </div>

          <div className="settings-row">
            <div>
              <strong>Rest duration</strong>
              <small>Time between sets</small>
            </div>
            <div
              className={`settings-stepper${
                restTimerEnabled ? "" : " is-disabled"
              }`}
            >
              <button
                type="button"
                aria-label="Decrease rest duration"
                disabled={
                  !restTimerEnabled ||
                  restDurationSeconds <= minRestDurationSeconds
                }
                onClick={() =>
                  adjustRestDurationSeconds(-restDurationStepSeconds)
                }
              >
                <Minus size={16} strokeWidth={3} />
              </button>
              <span>{formatRestTime(restDurationSeconds)}</span>
              <button
                type="button"
                aria-label="Increase rest duration"
                disabled={
                  !restTimerEnabled ||
                  restDurationSeconds >= maxRestDurationSeconds
                }
                onClick={() =>
                  adjustRestDurationSeconds(restDurationStepSeconds)
                }
              >
                <Plus size={16} strokeWidth={3} />
              </button>
            </div>
          </div>

          <button
            className="settings-logout-button"
            type="button"
            onClick={handleLogout}
          >
            <LogOut size={18} strokeWidth={3} />
            Log out
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={shellClassName}>
      <section className="top-bar home-top-bar" aria-label="App header">
        <div>
          <p className="eyebrow is-accent">
            Pelsmasher · <span className="home-identity">{authUser.username || authUser.email}</span>
          </p>
          <h1>Choose workout</h1>
        </div>
        <button
          className="settings-button"
          type="button"
          aria-label="Open settings"
          onClick={() => setIsSettingsOpen(true)}
        >
          <Settings size={22} strokeWidth={3} />
        </button>
      </section>

      {liveWorkoutBanner}

      <section className="choice-panel" aria-labelledby="muscle-groups-title">
        <div className="section-heading">
          <h2 id="muscle-groups-title">Muscle groups</h2>
          <span>{muscleGroups.length}</span>
        </div>
        <p className="api-status-line">
          {apiStatus === "online"
            ? `Backend online · ${apiBaseUrl}`
            : apiStatus === "loading"
            ? "Connecting backend..."
            : "Backend offline · local fallback"}
          {apiError && apiStatus !== "online" ? ` · ${apiError}` : ""}
        </p>

        <div className="muscle-grid">
          {muscleGroups.map((group) => {
            const { id, name, imageSrc } = group;

            return (
              <div className="muscle-card-shell" key={id}>
                <button
                  className="muscle-card"
                  type="button"
                  aria-label={`Choose ${name}`}
                  onClick={() => {
                    setSelectedGroupId(id);
                    setSelectedWorkoutSetId(null);
                  }}
                >
                  {imageSrc ? (
                    <img alt="" className="muscle-art custom-photo" src={imageSrc} />
                  ) : (
                    <div className="muscle-art-placeholder" aria-hidden="true" />
                  )}
                  <strong>{name}</strong>
                </button>
                <button
                  className="muscle-menu-button"
                  type="button"
                  aria-label={`${name} options`}
                  aria-expanded={openMuscleMenuId === id}
                  onClick={() =>
                    setOpenMuscleMenuId((openId) => (openId === id ? null : id))
                  }
                >
                  <MoreVertical size={19} strokeWidth={3} />
                </button>
                {openMuscleMenuId === id ? (
                  <div className="muscle-card-menu">
                    <button type="button" onClick={() => openEditMuscleGroupDialog(group)}>
                      <Pencil size={16} strokeWidth={3} />
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDeleteMuscleGroup(group)}>
                      <Trash2 size={16} strokeWidth={3} />
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <form className="add-group-form" onSubmit={handleAddGroup}>
          <input
            aria-label="Add muscle group"
            placeholder="Add muscle group"
            value={newGroupName}
            onChange={(event) => setNewGroupName(event.target.value)}
          />
          <label className="photo-picker" aria-label="Add muscle group photo">
            <ImagePlus size={22} strokeWidth={3} />
            <input
              accept="image/*"
              key={photoInputKey}
              onChange={handleImageChange}
              type="file"
            />
          </label>
          <button
            type="submit"
            aria-label="Add muscle group"
            disabled={!newGroupName.trim()}
          >
            <Plus size={22} strokeWidth={3} />
          </button>
          <div className="add-group-meta">
            {newGroupImageSrc ? (
              <img alt="" className="photo-preview" src={newGroupImageSrc} />
            ) : (
              <span className="photo-placeholder">Photo optional</span>
            )}
            <span>{photoError || newGroupImageName || "Auto style fallback"}</span>
          </div>
        </form>

        {editingMuscleGroup ? (
          <div
            className="option-dialog-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeEditMuscleGroupDialog();
              }
            }}
          >
            <form
              className="option-dialog muscle-edit-dialog"
              aria-label="Edit muscle group"
              onSubmit={handleSaveMuscleGroup}
            >
              <div className="option-dialog-heading">
                <div>
                  <p className="detail-kicker">Muscle card</p>
                  <h2>Edit muscle group</h2>
                </div>
                <button
                  className="dialog-close-button"
                  type="button"
                  aria-label="Close muscle group editor"
                  onClick={closeEditMuscleGroupDialog}
                >
                  <X size={20} strokeWidth={3} />
                </button>
              </div>

              <input
                aria-label="Muscle group name"
                placeholder="Muscle group name"
                value={editGroupName}
                onChange={(event) => setEditGroupName(event.target.value)}
              />

              <div className="muscle-edit-preview">
                {editGroupImageSrc ? (
                  <img alt="" src={editGroupImageSrc} />
                ) : (
                  <div className="routine-art-placeholder" aria-hidden="true" />
                )}
                <label className="photo-picker" aria-label="Change muscle group photo">
                  <ImagePlus size={22} strokeWidth={3} />
                  <input
                    accept="image/*"
                    key={editPhotoInputKey}
                    onChange={handleEditImageChange}
                    type="file"
                  />
                </label>
              </div>
              <div className="add-group-meta">
                <span className="photo-placeholder">Photo</span>
                <span>{editPhotoError || editGroupImageName || "Current style"}</span>
              </div>

              <button
                className="create-option-button"
                type="submit"
                aria-label="Save muscle group"
                disabled={!editGroupName.trim()}
              >
                <Check size={22} strokeWidth={3} />
                Save muscle group
              </button>
            </form>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default App;
