export const mockProfile = {
  name: "Anthony",
  age: 27,
  gender: "male",
  weight_kg: 85,
  height_cm: 178,
  activity: "moderate",
  goal: "lose_fat",
  target_weight: 78,
  trainer: "bro",
  units: "metric",
  startWeight: 88,
};

export const mockWeightLogs = [
  { date: "Feb 1", weight: 88 },
  { date: "Feb 8", weight: 87.2 },
  { date: "Feb 15", weight: 86.5 },
  { date: "Feb 22", weight: 86.1 },
  { date: "Mar 1", weight: 85.3 },
  { date: "Mar 8", weight: 85 },
];

export const mockTrainers = [
  { id: "scientist", name: "The Science Squad", emoji: "🧬", style: "Evidence-based. Data > Feelings.", color: "#6EE7B7" },
  { id: "sergeant", name: "The Intensity Crew", emoji: "🔥", style: "Discipline = Freedom. No excuses.", color: "#FB7185" },
  { id: "bro", name: "The Gym Legends", emoji: "💪", style: "Classic wisdom meets modern science.", color: "#FBBF24" },
  { id: "holistic", name: "The Wellness Circle", emoji: "🧘", style: "Recovery is the real workout.", color: "#93C5FD" },
  { id: "athlete", name: "The Athlete Lab", emoji: "⚡", style: "Train for your sport.", color: "#C084FC" },
];

export const mockWorkout = {
  todayName: "Monday — Upper Push",
  split: ["Mon: Upper Push", "Tue: Back/Biceps", "Wed: Lower Strength", "Thu: Recovery", "Fri: Chest/Delts", "Sat: Lower Hypertrophy"],
  exercises: [
    { name: "Incline DB Bench Press", sets: "4x8-10", rest: "90s" },
    { name: "Cable Crossovers", sets: "3x12-15", rest: "60s" },
    { name: "Seated DB Shoulder Press", sets: "3x10-12", rest: "90s" },
    { name: "Cable Lateral Raises", sets: "3x15-20", rest: "45s" },
    { name: "Overhead Tricep Extension", sets: "3x12-15", rest: "60s" },
    { name: "Face Pulls", sets: "2x15-20", rest: "45s" },
  ],
  days: [
    {
      name: "Monday — Upper Push",
      exercises: [
        { name: "Incline DB Bench Press", sets: "4x8-10", rest: "90s" },
        { name: "Cable Crossovers", sets: "3x12-15", rest: "60s" },
        { name: "Seated DB Shoulder Press", sets: "3x10-12", rest: "90s" },
        { name: "Cable Lateral Raises", sets: "3x15-20", rest: "45s" },
        { name: "Overhead Tricep Extension", sets: "3x12-15", rest: "60s" },
        { name: "Face Pulls", sets: "2x15-20", rest: "45s" },
      ]
    },
    {
      name: "Tuesday — Back & Biceps",
      exercises: [
        { name: "Chest-Supported Rows", sets: "4x8-10", rest: "90s" },
        { name: "Lat Pulldowns", sets: "3x10-12", rest: "75s" },
        { name: "Meadows Rows", sets: "3x10-12", rest: "60s" },
        { name: "Incline DB Curls", sets: "3x12-15", rest: "60s" },
        { name: "Bayesian Cable Curls", sets: "2x15-20", rest: "45s" },
      ]
    },
    {
      name: "Wednesday — Lower Strength",
      exercises: [
        { name: "Deep Barbell Squats", sets: "4x6-8", rest: "180s" },
        { name: "Romanian Deadlifts", sets: "3x8-10", rest: "120s" },
        { name: "Bulgarian Split Squats", sets: "3x10-12", rest: "90s" },
        { name: "Nordic Hamstring Curls", sets: "3x6-8", rest: "90s" },
        { name: "Tibialis Raises", sets: "2x15-20", rest: "45s" },
      ]
    },
    {
      name: "Thursday — Active Recovery",
      exercises: [
        { name: "Starrett Mobility Flow", sets: "10 min", rest: "-" },
        { name: "Wim Hof Breathing", sets: "3 rounds", rest: "-" },
        { name: "Zone 2 Walk/Cycle", sets: "30 min", rest: "-" },
        { name: "Foam Rolling", sets: "10 min", rest: "-" },
      ]
    },
    {
      name: "Friday — Chest & Delts (Stretch Focus)",
      exercises: [
        { name: "Deficit 1.5 Rep Pushups", sets: "3x8-10", rest: "90s" },
        { name: "Floor Flyes", sets: "3x10-12", rest: "75s" },
        { name: "Dips (Stretch Emphasis)", sets: "3x8-12", rest: "90s" },
        { name: "Cable Lateral Raises", sets: "4x15-20", rest: "45s" },
        { name: "Rear Delt Flyes", sets: "3x15-20", rest: "45s" },
      ]
    },
    {
      name: "Saturday — Lower Hypertrophy",
      exercises: [
        { name: "Leg Press (Deep ROM)", sets: "4x12-15", rest: "90s" },
        { name: "Walking Lunges", sets: "3x12 each", rest: "75s" },
        { name: "Leg Curls", sets: "3x12-15", rest: "60s" },
        { name: "Leg Extensions", sets: "3x15-20", rest: "60s" },
        { name: "Calf Raises", sets: "4x12-15", rest: "60s" },
      ]
    },
  ]
};

export const mockMealPlan = {
  dailyCalories: "2,100",
  protein: "168g",
  carbs: "210g",
  fats: "63g",
  meals: [
    { name: "Breakfast", emoji: "🍳", description: "4 eggs + 2 toast + avocado", calories: 520, protein: 34 },
    { name: "Lunch", emoji: "🥗", description: "Chicken breast + rice + mixed greens", calories: 620, protein: 48 },
    { name: "Snack", emoji: "🍌", description: "Greek yogurt + banana + honey", calories: 280, protein: 22 },
    { name: "Dinner", emoji: "🥩", description: "Salmon + sweet potato + broccoli", calories: 580, protein: 42 },
    { name: "Pre-sleep", emoji: "🥛", description: "Casein shake + peanut butter", calories: 100, protein: 22 },
  ],
};

export const mockChatMessages = [
  { role: "assistant", content: "What's up Anthony! Ready to crush it today? You've got Upper Push on the schedule. That Incline DB Press is gonna hit different — remember, thumbs forward, squeeze at the top for that extra adduction. Let's get after it! 💪", timestamp: "10:30 AM" },
  { role: "user", content: "Should I go heavier on bench today? I felt strong last session", timestamp: "10:32 AM" },
  { role: "assistant", content: "Hell yes! If your last set felt like RIR 3+, you've got room to move up. Add 2.5kg per side — that's the progressive overload doing its thing. Keep form tight though: controlled eccentric, full stretch at the bottom. If you get 4x8 clean, we bump again next week. The SFR on Incline DB is elite so we want to milk every kg out of this movement. Go get it! 🔥", timestamp: "10:33 AM" },
];

export const quickReplies = [
  "What should I train today?",
  "Assess my progress photo",
  "How are my macros looking?",
  "I'm feeling tired today",
  "Update my workout plan",
];
