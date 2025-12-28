// Event Types
export const EVENT_TYPES = [
  { value: "Team lunch", label: "Team Lunch 🍱" },
  { value: "Team dinner", label: "Team Dinner 🍽️" },
  { value: "After-work drinks", label: "After-work Drinks 🍺" },
  { value: "Celebration party", label: "Celebration Party 🎉" },
  { value: "Team building", label: "Team Building 🤝" },
];

// Event States
export const EVENT_STATES = {
  DRAFT: "draft",
  PLANNING: "planning",
  INVITING: "inviting",
  GATHERING_PREFERENCES: "gathering_preferences",
  AI_RECOMMENDING: "ai_recommending",
  VOTING: "voting",
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

// Event State Labels
export const EVENT_STATE_LABELS: Record<string, string> = {
  draft: "Draft",
  planning: "Planning",
  inviting: "Inviting",
  gathering_preferences: "Gathering Preferences",
  ai_recommending: "AI Analyzing",
  voting: "Voting",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

// Event State Icons
export const EVENT_STATE_ICONS: Record<string, string> = {
  draft: "📝",
  planning: "📋",
  inviting: "✉️",
  gathering_preferences: "🎯",
  ai_recommending: "🤖",
  voting: "🗳️",
  confirmed: "✅",
  completed: "🎊",
  cancelled: "❌",
};

// Event Progress Steps
export const EVENT_PROGRESS_STEPS = [
  { state: "planning", label: "Planning", icon: "📝" },
  { state: "inviting", label: "Inviting", icon: "✉️" },
  { state: "gathering_preferences", label: "Gathering Info", icon: "🎯" },
  { state: "ai_recommending", label: "AI Analysis", icon: "🤖" },
  { state: "voting", label: "Voting", icon: "🗳️" },
  { state: "confirmed", label: "Confirmed", icon: "✅" },
];

// Vote Values
export const VOTE_VALUES = [
  { value: 5, label: "Love it! ❤️", color: "text-green-600" },
  { value: 4, label: "Great! 😊", color: "text-green-500" },
  { value: 3, label: "Good 👍", color: "text-blue-500" },
  { value: 2, label: "OK 😐", color: "text-gray-500" },
  { value: 1, label: "Not great 😕", color: "text-orange-500" },
  { value: -1, label: "No ❌", color: "text-red-500" },
];

// Minimum values
export const MIN_EXPECTED_ATTENDEES = 2;
export const MAX_EXPECTED_ATTENDEES = 100;
export const MIN_BUDGET_PER_PERSON = 5; // $5 USD
export const MIN_ADVANCE_DAYS = 3;


