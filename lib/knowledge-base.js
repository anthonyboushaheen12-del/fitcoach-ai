// FitCoach AI — Integrated Expert Knowledge Library
// This file contains the core knowledge base that powers all trainer personas.
// Each persona draws from this shared foundation but applies it through their unique lens.

export const knowledgeBase = {

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: CORE TRAINING PRINCIPLES (Non-Negotiable Consensus)
  // ═══════════════════════════════════════════════════════════════

  trainingFoundation: {
    progressiveOverload: `
      Progressive overload is the singular non-negotiable driver of all physical adaptation.
      It means systematically increasing demands over time through added weight, reps, 
      technical quality, range of motion, or reduced rest. As Bumstead states: success is 
      doing "the same basic things over and over" while incrementally raising the bar.
      Without progressive overload, no program — regardless of sophistication — produces results.
    `,

    stimulusToFatigueRatio: `
      The Stimulus-to-Fatigue Ratio (SFR) is the governing principle for exercise selection 
      and programming. Coined by Dr. Mike Israetel, SFR means choosing movements that deliver 
      the maximum hypertrophic signal for the minimum systemic and joint fatigue. This is why 
      an Incline DB Press may be superior to a Barbell Bench for upper chest: it maximizes 
      stretch-mediated tension on the target muscle while reducing axial loading and shoulder 
      stress. We seek the most "expensive" reps, not the most reps. Every exercise must earn 
      its place in the program by its SFR score.
    `,

    stretchMediatedHypertrophy: `
      The greatest anabolic signal is generated when a muscle is under high mechanical tension 
      in its most lengthened (stretched) position. This is the principle of stretch-mediated 
      hypertrophy. Exercises that load the stretched position produce superior muscle growth:
      - Incline DB Curls (biceps at full stretch)
      - Overhead Tricep Extensions (long head fully lengthened)
      - Romanian Deadlifts (hamstrings loaded at long length)
      - Deep Squats (quads under tension at depth)
      - Cable Flyes at full stretch (chest fully lengthened)
      The structural chassis (mobility, joint health) MUST be capable of maintaining these 
      lengthened positions under load. If you cannot reach a position without weight, loading 
      that position is an exercise in structural debt.
    `,

    effectiveRepsVsJunkVolume: `
      Not all reps are created equal. "Effective reps" are those performed close to muscular 
      failure (within 0-3 RIR) where motor unit recruitment is maximized. Reps performed far 
      from failure (>5 RIR) contribute minimal hypertrophic stimulus but still accumulate 
      systemic fatigue. This is "junk volume" — work that triggers cellular stress without 
      providing the necessary signal for muscle protein synthesis. Training beyond the body's 
      recovery budget produces junk volume regardless of effort or intention.
    `,
  },

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: VOLUME & INTENSITY FRAMEWORK (Israetel/Nippard)
  // ═══════════════════════════════════════════════════════════════

  volumeAndIntensity: {
    volumeLandmarks: `
      Dr. Mike Israetel's Volume Landmarks system:
      - MV (Maintenance Volume): ~4-8 sets/muscle/week. Minimum to not lose size.
      - MEV (Minimum Effective Volume): ~8-12 sets/muscle/week. Lowest volume that produces growth.
      - MAV (Maximum Adaptive Volume): ~12-20 sets/muscle/week. The sweet spot where most growth occurs.
      - MRV (Maximum Recoverable Volume): ~20-25+ sets/muscle/week. The ceiling. Beyond this, 
        recovery fails and gains reverse.
      
      Practical application: Start a mesocycle at MEV, progress toward MAV over 4-6 weeks, 
      then deload before reaching MRV. The individual's recovery markers (HRV, RHR, sleep quality) 
      determine where they fall on this spectrum — not their ego or mental toughness.
    `,

    weeklyVolumeTargets: `
      Target: 12-24 hard sets per muscle group per week.
      - Beginners: 10-14 sets (closer to MEV, high response to any stimulus)
      - Intermediates: 14-18 sets (need more volume for continued adaptation)
      - Advanced: 18-24 sets (approaching MAV, diminishing returns beyond this)
      
      Split this volume across 2-3 sessions per muscle group per week. Hitting chest 2x/week 
      with 8-10 sets each session is superior to 1x/week with 16-20 sets, because average 
      per-set quality remains higher and protein synthesis is re-elevated more frequently.
    `,

    intensityProtocol: `
      Two complementary intensity methodologies:
      
      1. Reps in Reserve (RIR) — Primary method for heavy compound lifts:
         - RIR 2-3: Warm-up and early working sets
         - RIR 1-2: Primary working sets (the growth driver)
         - RIR 0-1: Final sets only, when form is still clean
         Used for: Squats, Deadlifts, Bench Press, Rows, Overhead Press
         Why: Preserves CNS, manages joint fatigue, allows sustained volume across the week
      
      2. Training to Failure (FF) — Used for isolation and safe implements:
         - Take the set to true concentric failure
         - Can extend with: partial reps, eccentric-only reps, drop sets
         Used for: DB Curls, Lateral Raises, Cable work, Bodyweight movements, Machine exercises
         Why: Maximizes motor unit recruitment on movements with low injury risk
      
      Resolution: Use FF for isolation/safe implements (Cavaliere), use RIR for heavy compounds 
      (Nippard/Israetel). This preserves joint longevity while maximizing growth stimulus.
    `,

    repRanges: `
      Hypertrophy: 6-30 reps (effective range), sweet spot 8-15 for most exercises
      - Compounds (squat, bench, row): 6-12 reps
      - Isolations (curls, raises, flyes): 12-20 reps
      - Can push 20-30 reps for certain movements (leg press, machine work)
      
      Strength: 1-6 reps at 80-95% 1RM, rest 3-5 minutes between sets
      Power: 1-5 reps with explosive intent, 60-80% 1RM, full rest
      Endurance: 15-30+ reps or timed sets
    `,

    mesocycleDesign: `
      A mesocycle runs 4-6 weeks with volume escalation:
      - Week 1: Start at MEV (~10-12 sets/muscle). Establish baselines.
      - Week 2: Add 1-2 sets per muscle group. Push RIR slightly closer.
      - Week 3: Peak volume approaching MAV. Most sets at RIR 1-2.
      - Week 4: Highest volume week OR begin feeling accumulated fatigue.
      - Week 5 (Deload): Cut volume by 40-50%. Reduce intensity to RIR 3-4.
        Increase mobility work and recovery protocols. This is NOT time off — 
        it is a strategic shift where structural and neural systems reset.
      
      The next mesocycle begins from a higher structural readiness baseline.
    `,
  },

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: EXERCISE LIBRARY — S-TIER MOVEMENTS
  // ═══════════════════════════════════════════════════════════════

  exerciseLibrary: {
    sTierMovements: `
      These movements are categorized as "S-Tier" due to alignment with functional anatomy 
      and ability to maximize tension in the stretched position:

      CHEST:
      - Incline DB Bench Press: Thumbs forward, extra adduction at top. Take to FF safely with DBs.
      - Cable Crossovers: Lean back to make chest the primary mover. Partials after failure.
      - Floor Flyes: Reach concentric failure, then floor press up for eccentric-only reps.
      - Deficit 1.5 Rep Pushups: Ascending hold ladder in stretch position (rep 1 = 1s, rep 2 = 2s).
      - Dips: High stretch tension on lower chest/triceps. Partials beyond initial failure.

      BACK:
      - Chest-Supported Rows: Removes lumbar fatigue, isolates lats/rhomboids
      - Lat Pulldowns (stretch emphasis): Full stretch at top, controlled eccentric
      - Meadows Rows: Unilateral, high SFR for lats
      - Pull-ups/Chin-ups: Bodyweight compound, scalable with bands or weight

      SHOULDERS:
      - Cable Lateral Raises: Constant tension curve, superior SFR to dumbbell version
      - Face Pulls: Non-negotiable for rear delt and rotator cuff health (Cavaliere)
      - DB Overhead Press: Seated for strict stimulus, standing for functional integration

      LEGS:
      - Deep Squats (full ROM): Quad emphasis, requires ankle/hip mobility
      - Romanian Deadlifts: Hamstring stretch-mediated hypertrophy, hip hinge pattern
      - Bulgarian Split Squats: Unilateral, exposes/corrects imbalances
      - Leg Curls (Nordic or machine): Hamstring at long length, injury prevention
      - Tibialis Raises: Ankle/knee bulletproofing (Ben Patrick ATG protocol)

      ARMS:
      - Incline DB Curls: Bicep fully stretched, superior long head stimulus
      - Overhead Tricep Extensions: Long head at maximum stretch
      - Bayesian Cable Curls: Constant tension, peak stretch position
    `,

    primerProtocol: `
      Before heavy pressing: Banded External Rotation (ER)
      1-2 sets x 10-15 reps at sub-max effort.
      Purpose: Ensures rotator cuff stabilization for the shoulder joint without 
      fatiguing primary movers. Non-negotiable before bench, incline, or overhead work.
    `,
  },

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: NUTRITION FRAMEWORK
  // ═══════════════════════════════════════════════════════════════

  nutrition: {
    energyBalance: `
      Caloric balance is the ONLY mechanism that determines weight change. This is 
      thermodynamic law — CICO (Calories In, Calories Out). Following Layne Norton's 
      "Data > Feelings" principle, all nutrition coaching must be grounded in measurable 
      energy balance, not speculative trends or fad diets.

      Maintenance: Bodyweight (kg) x 30-33 for moderately active individuals.
      Fat Loss Deficit: Subtract 300-500 cal/day → ~0.5kg loss/week. 
        Rate should be 0.5-1% of bodyweight per week maximum.
        The leaner someone gets, the slower they should cut.
      Muscle Gain Surplus: Add 200-300 cal/day above maintenance.
        Realistic gains: 1-2kg/month (beginner), 0.5-1kg/month (intermediate), 
        0.25-0.5kg/month (advanced).
    `,

    macronutrientArchitecture: `
      PROTEIN (The Non-Negotiable):
      - Target: 1.6-2.2g per kg bodyweight per day
      - Distribution: 25-40g per meal across 3-5 meals
      - Leucine threshold: 2-3g per feeding to trigger MPS
      - Protein needs INCREASE with age to preserve lean mass (Norton)
      - Best sources: Chicken, beef, fish, eggs, Greek yogurt, whey

      CARBOHYDRATES (Performance Fuel):
      - Target: 2-5g per kg bodyweight depending on activity
      - Scaled to training volume: more on heavy training days, less on rest days
      - Primary fuel for high-intensity output — do not fear carbs
      - Prioritize around training sessions (pre/intra/post workout)

      FATS (Hormonal Substrate):
      - Minimum: 0.7-1g per kg bodyweight
      - Essential for testosterone production, brain function, vitamin absorption
      - Going below minimum compromises hormonal health
      - Start the day with a "meat and fat" morning meal for stable energy (Filly)
    `,

    nutritionPhilosophy: `
      ANTI-FAD STANCE (Norton/Filly):
      - Reject "gimmicky diets" and "internet lies" (seed oil panic, demonizing food groups)
      - Flexible dieting / IIFYM produces better long-term adherence than rigid meal plans
      - No individual food makes or breaks your results — overall patterns matter
      - Artificial sweeteners are safe at normal consumption levels (Norton)
      
      REVERSE DIETING (Norton):
      After a prolonged cut, gradually increase calories by 50-100 cal/week to restore 
      metabolic rate and prevent rapid fat regain. Diet breaks of 1-2 weeks at maintenance 
      every 8-12 weeks help manage metabolic adaptation and psychological fatigue.

      METABOLIC FLEXIBILITY (Filly):
      Consistent meal rhythm and nutrient density allow the body to efficiently switch 
      between fuel sources. Avoid extreme restriction approaches that compromise this flexibility.
    `,

    supplements: `
      EVIDENCE-BASED (Worth taking):
      - Creatine Monohydrate: 3-5g daily. Improves strength, hypertrophy, and cognition.
      - Protein Powder: Convenience tool to hit daily protein targets.
      - Vitamin D: If blood levels are suboptimal, especially with limited sun exposure.
      - Omega-3 Fish Oil: Inflammatory regulation and cardiovascular health.
      - Caffeine: 2-3mg/kg bodyweight for performance. Respect half-life for sleep.

      SPECULATIVE/DEBUNKED (Not worth it):
      - Mass Gainers: Junk calories, poor substrate quality.
      - "Testosterone Boosters": Speculative, no meaningful evidence.
      - Extreme Fat Burners: Ineffective compared to simple CICO deficit.
      - Anything based on fear-mongering trends.
    `,
  },

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: STRUCTURAL READINESS & MOBILITY (Starrett/Patrick)
  // ═══════════════════════════════════════════════════════════════

  mobilityAndStructure: {
    corePhilosophy: `
      Mobility is defined as POSITIONAL POWER — the ability to access and generate force 
      from biomechanically advantageous ranges. This is NOT passive stretching. Following 
      Kelly Starrett's methodology:
      
      "Positional Power precedes Load. If you cannot satisfy the foundational mobility 
      assessments, you have no business adding external weight to those ranges."
      
      Restricted joints act as ENERGY LEAKS that diminish the hypertrophic stimulus and 
      increase systemic fatigue. When contractile tissue growth outpaces connective tissue 
      and joint capsule capacity, you create "structural debt" — a performance ceiling where 
      the nervous system down-regulates force production to prevent injury.
      
      We must differentiate between Passive Range (flexibility) and Active Control (mobility).
    `,

    fiveFoundationalAssessments: `
      Non-negotiable prerequisites for heavy loading (Starrett "Built to Move"):
      
      1. ANKLE RANGE OF MOTION
         Why: Essential for squat depth and force dissipation during lower-body work.
         Test: Knee-to-wall test. Knee should pass 4-5 inches past toes.
         Fix: Banded ankle distractions, calf/soleus mobilization.
      
      2. SHOULDER INTERNAL ROTATION
         Why: Prerequisite for overhead stability and bench press mechanics.
         Test: Hand behind back reach test.
         Fix: Sleeper stretches, banded shoulder distractions, soft tissue work.
      
      3. HIP EXTENSION
         Why: Vital for posterior chain engagement and lumbar protection.
         Test: Thomas test for hip flexor length.
         Fix: Couch stretch (Starrett signature drill), hip flexor mobilization.
      
      4. THORACIC SPINE EXTENSION
         Why: Necessary for scapular health and breathing efficiency.
         Test: Seated rotation test, wall angel test.
         Fix: Foam roller extensions, open book rotations, cat-cow.
      
      5. CERVICAL ROTATION
         Why: Critical for neural drive and upper-extremity health.
         Test: Chin-to-shoulder rotation (both sides).
         Fix: Gentle neck CARs, sub-occipital release.
      
      RED FLAGS & INTERVENTIONS:
      - Capsular Impingement (pinching at end-range): Band Distractions to create joint space
      - Tissue Restriction (limited sliding surfaces): Voodoo Flossing (compression tack and floss)
      - Asymmetry (>10% variance between limbs): Targeted soft tissue work before compound movements
    `,

    jointBulletproofing: `
      Ben Patrick (KneesOverToesGuy) ATG Protocol:
      - Tibialis Raises: Protect knees and ankles from below. Non-negotiable.
      - Nordic Hamstring Curls: Progressive — start assisted, build to full. 
        Dramatically reduces hamstring strain risk.
      - ATG Split Squats: Full ROM, knees past toes under control. 
        Strengthens knee tendons and ligaments.
      - Reverse Step-Ups: Low-impact knee strengthening.
      - Jefferson Curls: Loaded spinal flexion for posterior chain flexibility.
      - Sled Work: Low-impact, high-benefit conditioning and joint recovery.
      
      The myth that knees should never travel past toes is FALSE. Controlled forward 
      knee travel strengthens the joint. Restricting it shifts stress to lumbar spine.
    `,
  },

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: RECOVERY & NERVOUS SYSTEM REGULATION
  // ═══════════════════════════════════════════════════════════════

  recovery: {
    sleepProtocol: `
      Sleep is the most potent biological optimizer. 7-9 hours per night.
      
      CIRCADIAN REGULATION (Huberman/Galpin):
      - Morning sunlight: 10+ minutes within 30-60 min of waking. Sets circadian clock.
      - Evening blue light restriction: Dim lights, no screens 60-90 min before bed.
      - Cool bedroom: 18-19°C for optimal deep sleep architecture.
      - Consistent timing: Same sleep/wake time ±30 min, even weekends.
      - Caffeine cutoff: No caffeine within 8-10 hours of bedtime. Respect the half-life.
      - No large meals within 2-3 hours of sleep.
      
      Non-Sleep Deep Rest (NSDR) / Yoga Nidra (Huberman):
      10-20 minute body scan protocol for recovery when sleep is suboptimal.
      Measurably restores dopamine levels and cognitive function.
    `,

    breathworkProtocols: `
      1. PHYSIOLOGICAL SIGH — Neural Off-Switch (Huberman):
         Two quick inhales through the nose + one long slow exhale through the mouth.
         Targets the phrenic nerve, expands collapsed alveoli, offloads CO2.
         Shifts from sympathetic → parasympathetic in under 60 seconds.
         USE: Immediately post-training, during stress, before sleep.
      
      2. WIM HOF POWER BREATHING — Metabolic Priming:
         3 rounds of 30-40 controlled breaths + retention phase (breath hold).
         Resets the nervous system's "stress floor."
         Increases CO2 tolerance → enhances work capacity during high-volume sets.
         By increasing respiratory threshold, you can push closer to true muscular failure 
         with less perceived distress, ensuring every set meets the "effective rep" criteria.
         USE: Morning protocol, pre-training on high-volume days.
         CAUTION: Never in water, never while driving. Start with 20 breaths.
      
      3. CO2 TOLERANCE TRAINING:
         Breath-holds after normal exhale. Build duration progressively.
         Improves the body's ability to handle metabolic acidity during hard sets.
    `,

    stressManagement: `
      Chronic stress elevates cortisol → impairs muscle recovery, increases abdominal fat 
      storage, disrupts sleep, weakens immune function. Recovery is an ACTIVE discipline, 
      not passive rest.
      
      DAILY PRACTICES:
      - Physiological sighs throughout the day (not just post-training)
      - Walking outdoors: 8,000-10,000 steps. Most underrated recovery tool.
      - Cold exposure (rest days): 10-15°C for 1-5 min. Elevates norepinephrine and dopamine.
        AVOID immediately post-training (blunts hypertrophy signal). Separate by 4-6 hours.
      - Heat exposure (sauna): 80-100°C for 15-20 min. Cardiovascular benefits, recovery.
      - Social connection and time in nature.
      
      ORDERED TRAINING (Phil Daru / Fasting Protocol):
      On low-energy days, fasting days, or when biometrics indicate suppressed recovery:
      Limit training to low-intensity aerobic work, mobility, and end-range isometrics.
      This "reorders" the nervous system without breaking it further.
    `,

    biometricMonitoring: `
      Galpin's "3 I's" Framework: Investigate → Interpret → Intervene
      
      DAILY BIOMETRICS TO TRACK:
      - HRV (Heart Rate Variability): Primary recovery indicator.
        Average: Moderate variability, slow recovery post-stress.
        Elite: High variability, rapid rebound within 24h.
        If HRV is suppressed → the intervention is RECOVERY, not more volume.
      
      - Resting Heart Rate: Morning measurement.
        Average: 60-70 bpm. Elite: 40-50 bpm (superior stroke volume).
        Elevated RHR signals accumulated fatigue.
      
      - Respiratory Rate: Nightly tracking.
        Average: 14-18 breaths/min. Elite: 12-14 bpm (metabolic efficiency).
      
      These markers dictate the actual volume of training a system can ADAPT to,
      not just what the user can mentally endure. "Assessment is continuous."
    `,
  },

  // ═══════════════════════════════════════════════════════════════
  // SECTION 7: SPORT & ATHLETIC PERFORMANCE
  // ═══════════════════════════════════════════════════════════════

  athleticPerformance: {
    galpinNineAdaptations: `
      Dr. Andy Galpin's 9 Physiological Adaptations:
      1. Strength (1-5 reps, 85-95% 1RM, 3-5 min rest)
      2. Hypertrophy (6-15 reps, 65-85% 1RM, 1-2 min rest)
      3. Muscular Endurance (15-30+ reps, <65% 1RM, 30-60s rest)
      4. Power (1-5 reps, explosive, 60-80% 1RM, 2-5 min rest)
      5. Speed (max velocity efforts, full rest)
      6. Cardiovascular Endurance (Zone 2, 30-60+ min sustained)
      7. Anaerobic Capacity (high-intensity intervals, near-max HR)
      8. Flexibility/Mobility (end-range loading, progressive ROM)
      9. Body Composition (byproduct of optimizing above + nutrition)
      
      A complete athlete trains across multiple adaptations. The art is in 
      periodizing emphasis without creating excessive interference between modalities.
    `,

    seasonalPeriodization: `
      OFF-SEASON: Build general strength, muscle mass, address weaknesses.
        High volume, progressive overload focus, mobility restoration.
      PRE-SEASON: Convert strength to sport-specific power and speed.
        Reduce volume, increase intensity and sport-specific conditioning.
      IN-SEASON: Maintain with 1-2 gym sessions/week. Primary stimulus from sport.
        Preserve strength/power, manage fatigue, prioritize recovery.
      POST-SEASON: Active recovery, address accumulated wear, mobility focus.
    `,

    hybridAthlete: `
      Concurrent strength + endurance training (Alex Viada model):
      - Separate sessions by 6+ hours when possible
      - Prioritize whichever quality matters more in current phase
      - Don't maximize both simultaneously — manage total stress load
      - Ensure nutrition supports both modalities (higher caloric needs)
      - Key: Conditioning protocols that improve cardiovascular fitness 
        without compromising strength gains (sled work, Zone 2 cardio, rowing)
    `,
  },

  // ═══════════════════════════════════════════════════════════════
  // SECTION 8: PROGRAMMING MODEL
  // ═══════════════════════════════════════════════════════════════

  programmingModel: {
    sampleWeek: `
      INTEGRATED PERFORMANCE WEEK:
      
      Monday — Peak 1: Chest/Shoulders (High Volume Hypertrophy)
        Secondary: Anaerobic power work
        Recovery: Shoulder IR mobility, Physiological Sighs
      
      Tuesday — Peak 2: Back/Biceps (High RPE)
        Secondary: Zone 2 cardio (30 min)
        Recovery: Thoracic extension, Voodoo Flossing
      
      Wednesday — Lower Body (Strength/Stability)
        Secondary: Strength focus (compounds)
        Recovery: Ankle ROM drills, WHM Breathing
      
      Thursday — Active Recovery
        Mobility maintenance: Starrett Daily 10
        Meditation, walking, soft tissue work
      
      Friday — Peak 3: Chest/Delts (Length/Stretch Focus)
        Secondary: Metabolic flexibility drill
        Recovery: Band Distractions, Physiological Sighs
      
      Saturday — Peak 4: Lower Body (Hypertrophy Volume)
        Secondary: Endurance conditioning
        Recovery: Hip extension work, Post-training down-regulation
      
      Sunday — Full Rest & Stewardship
        Parasympathetic focus: Full body scan, soft tissue, stretching
    `,

    deloadProtocol: `
      Deload is NOT time off. It is a strategic recalibration:
      - Hypertrophy volume: Cut by 40-50%
      - Intensity: Reduce to RIR 3-4 (nothing close to failure)
      - Mobility work: DOUBLE the normal amount (Starrett protocols)
      - Breathwork: DOUBLE (Hof breathing + Physiological Sighs)
      - Sleep: Prioritize 8-9 hours
      - Nutrition: Eat at maintenance (do NOT cut during deload)
      
      Purpose: Dissipate systemic fatigue while resetting structural and neural 
      systems so the next hypertrophy block begins from higher structural readiness.
      Frequency: Every 4-6 weeks, or when biometrics signal suppressed recovery.
    `,
  },

  // ═══════════════════════════════════════════════════════════════
  // SECTION 9: GOLDEN RULES
  // ═══════════════════════════════════════════════════════════════

  goldenRules: `
    THE 5 GOLDEN RULES FOR THE INTEGRATED PRACTITIONER:
    
    1. ASSESSMENT IS CONTINUOUS
       Use biometrics daily. If HRV is suppressed and RHR is elevated, 
       the intervention is recovery — not more volume. Data > Feelings.
    
    2. POSITIONAL POWER PRECEDES LOAD
       If you cannot satisfy the foundational mobility assessments, you have 
       no business adding external weight to those ranges. Mobility is insurance.
    
    3. SFR IS KING
       Maximize growth while minimizing systemic debt. Seek the most expensive 
       reps, not the most reps. Every exercise must earn its place.
    
    4. MASTER THE NEURAL OFF-SWITCH
       Recovery begins the moment the last set ends. Use the physiological sigh 
       to offload CO2 and enter the anabolic window immediately.
    
    5. STEWARDSHIP OF THE BORING
       Success is found in the quiet, repetitive stewardship of basic movement 
       patterns and recovery protocols when no one is watching.
       Formation precedes performance.
  `,

  // ═══════════════════════════════════════════════════════════════
  // SECTION 10: BODYWEIGHT MASTERY & CALISTHENICS
  // ═══════════════════════════════════════════════════════════════

  calisthenicsAndBodyweight: {
    structuralFoundation: `
      POSTURAL CORRECTION IS THE PREREQUISITE — NOT OPTIONAL

      Before any advanced bodyweight skill, the athlete must fix their structural framework.
      This is an "inside-out" approach:

      1. CERVICAL SPINE (Fix the Neck):
         - Eliminate forward head posture
         - Creates neutral axis for handstands and inverted holds
         - Without this: compensation patterns in every overhead movement

      2. SCAPULAR REGION (Fix the Shoulders):
         - Activate Scapular Depression (pull shoulder blades down)
         - Creates the stable platform required for Planche and Lever variants
         - Without this: shoulder impingement, force leaks, injury risk

      3. THORACIC CAGE (Lift the Collarbones):
         - Induce Thoracic Extension (chest opens, upper back straightens)
         - Maximizes mechanical leverage and breathing efficiency under tension
         - Without this: rounded upper back kills leverage on every push/pull

      Assessment: If someone has forward head, rounded shoulders, or kyphotic upper back,
      CORRECT THESE FIRST before loading any advanced bodyweight position.
      Prescribe: Wall slides, band pull-aparts, thoracic spine foam rolling,
      chin tucks, scapular push-ups as daily correctives (5-10 min).
    `,

    innerUnitMethodology: `
      THE INNER UNIT — CORE AS STABILIZER, NOT JUST AESTHETICS

      The core must be trained as the PRIMARY STABILIZER and central hub of all force
      transfer — not just for a visible six-pack. The "Inner Unit" methodology prioritizes
      the deep musculature that secures the spine and pelvis during high-intensity maneuvers.

      KEY PRINCIPLES:
      - Transverse Abdominis and deep stabilizers > rectus abdominis for function
      - "Shrink your waist" through improved functional tension, not just caloric deficit
      - Core is a skeletal muscle — subject to same recovery laws as any muscle group
      - DO NOT train abs every day. 24-48 hour recovery window required.
      - Overtraining core = "stability burnout" = compromised skill sessions

      PROGRAMMING:
      - Isometric stability work (7 min sessions): Builds calisthenics-specific endurance
        for static holds (back lever, front lever, planche)
      - Hypertrophy work (10 min sessions): Builds muscular density for midsection control
      - Frequency: 3-4x per week maximum, NOT daily
      - Hollow body holds, L-sits, and dragon flags as primary progressions

      The hollow body position is THE foundational core shape. It appears in:
      handstands, levers, planche, muscle-ups — everything. Master it first.
    `,

    skillHierarchy: `
      CALISTHENICS SKILL PROGRESSION — RESPECT THE ORDER

      Complex gravity-defying movements are the result of systematic milestones.
      Skipping levels = connective tissue injuries and stalled progress.

      BEGINNER (Month 1-6):
      - Push-ups (standard → diamond → decline)
      - Pull-ups (dead hang → negatives → full pull-up → chin-up)
      - Dips (bench → parallel bars)
      - Handstand against wall (build to 60 second holds)
      - L-sit on floor (build to 15 second holds)
      - Hollow body hold (build to 60 seconds)
      - Skin the cats (shoulder mobility + strength)

      INTERMEDIATE (Month 6-18):
      - Freestanding Handstand (foundation for ALL inverted balance)
      - V-sit (standard on floor)
      - Back Lever (tuck → advanced tuck → straddle → full)
      - Front Lever (tuck → advanced tuck → straddle → full)
      - Elbow Lever (balance + wrist conditioning)
      - Muscle-up (kipping → strict → slow)
      - Pistol squats (bodyweight single-leg strength)

      ADVANCED (Month 18+):
      - Planche (tuck → advanced tuck → straddle → full)
      - Planche Push-ups (THE primary strength builder for full planche)
      - Slow Muscle-ups (requires significantly higher torque than dynamic)
      - Handstand Push-ups (HSPU — full ROM, freestanding)
      - V-sit on Fingers (extreme tendon conditioning)
      - Iguana Press
      - Iron Cross (rings only)

      ELITE COMBINATIONS (test of Inner Unit tension during dynamic transitions):
      - Muscle-up → V-sit → Back Lever
      - Slow Muscle-up → V-sit
      - Muscle-up → Elbow Lever → V-sit
      - Front Lever → Pull to Inverted Hang → Back Lever

      KEY PRINCIPLE: Each skill builds connective tissue strength and neurological
      adaptation. Tendons adapt 3-5x slower than muscles. Respect progression timelines.
      V-sit on Fingers forces higher hip lift with reduced surface area — critical for
      conditioning hand and wrist tendons before planche work.
    `,

    programmingForBodyweight: `
      BODYWEIGHT TRAINING PROGRAMMING

      TRAINING SPLIT OPTIONS:

      Option A — Push/Pull/Legs + Skills (4-5 days):
      - Day 1: Push (planche progressions, dips, push-up variations, HSPU work)
      - Day 2: Pull (front lever progressions, pull-up variations, rows, muscle-up work)
      - Day 3: Legs + Core (pistols, nordic curls, jump training, inner unit work)
      - Day 4: Skills (handstand practice, balance work, combination drills)
      - Day 5: Full body or repeat

      Option B — Upper/Lower + Skills (3-4 days):
      - Day 1: Upper Push + Pull (compound bodyweight)
      - Day 2: Lower + Core
      - Day 3: Skill-focused (handstands, levers, planche)
      - Day 4: Repeat or active recovery

      VOLUME GUIDELINES FOR BODYWEIGHT:
      - Static holds: Accumulate 30-60 seconds total volume per skill (e.g., 6x10s holds)
      - Dynamic movements: 3-5 sets of 3-8 reps for strength skills
      - Endurance work: 2-3 sets of 10-20 reps for push-ups, pull-ups, dips
      - Skill practice: 15-20 minutes of deliberate practice (handstands, balance)

      PROGRESSIVE OVERLOAD IN BODYWEIGHT:
      Since you can't just "add weight," progression happens through:
      1. Leverage disadvantage (tuck → straddle → full = harder lever arm)
      2. Reduced base of support (two hands → one hand, two legs → one leg)
      3. Increased range of motion (deficit push-ups, full ROM dips)
      4. Tempo manipulation (slow eccentrics, pauses at hardest position)
      5. Reduced stability (floor → parallettes → rings)
      6. Adding external load (weighted vest, ankle weights, dip belt)

      RINGS — THE ULTIMATE BODYWEIGHT TOOL:
      Rings introduce instability that forces stabilizers to work at 100% capacity.
      They are the bridge between floor-based training and elite-level bodyweight work.
      For home-based athletes, rings replicate gym-level intensity.
      Progression: Floor exercises → Parallettes → Low rings → High rings
      Key ring exercises: Ring dips, ring push-ups, ring rows, ring muscle-ups,
      ring support hold, ring L-sit, ring front/back lever
    `,

    noEquipmentPhilosophy: `
      THE MINIMALIST APPROACH — YOU DON'T NEED A GYM

      "You don't need a gym to start" — the minimalist philosophy relies on
      environmental geometry: parks, home floors, playgrounds, and street furniture.

      MINIMUM EQUIPMENT FOR COMPLETE TRAINING:
      - A floor (push-ups, L-sits, handstands, core work)
      - A pull-up bar or tree branch (all pulling movements)
      - A pair of rings or TRX (optional but massive upgrade)
      - A wall (handstand practice, wall walks)

      DIY RING STRATEGY:
      Wooden gymnastic rings ($20-30) hung from a pull-up bar, tree branch,
      or park structure provide the BEST return on investment in fitness equipment.
      They enable: dips, push-ups, rows, muscle-ups, levers, L-sits, skin the cats,
      and every pulling variation — all with added instability training.

      PARK/STREET WORKOUT STRUCTURE:
      Warm-up: 5 min joint circles + dynamic stretches
      Skill work: 15 min handstand or lever practice
      Strength: 20-30 min push/pull supersets
      Core: 7-10 min inner unit conditioning
      Cool-down: 5 min stretching + wrist care

      This philosophy proves that elite results don't require facility access.
      Environmental flexibility ensures the training stimulus is never interrupted.
    `,
  },
};

/**
 * Full calisthenics / bodyweight reference for system prompts (all trainers).
 */
export function getCalisthenicsKnowledgeText() {
  const c = knowledgeBase.calisthenicsAndBodyweight
  if (!c) return ''
  return [
    c.structuralFoundation,
    c.innerUnitMethodology,
    c.skillHierarchy,
    c.programmingForBodyweight,
    c.noEquipmentPhilosophy,
  ]
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
    .join('\n\n')
}
