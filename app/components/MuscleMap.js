'use client'

const MUSCLE_ALIAS = {
  chest: ['chest', 'pectorals'],
  shoulders: ['shoulders', 'deltoids', 'anterior deltoid', 'posterior deltoid'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  forearms: ['forearms'],
  abdominals: ['abdominals', 'abs', 'core'],
  quadriceps: ['quadriceps', 'quads'],
  hamstrings: ['hamstrings'],
  glutes: ['glutes', 'gluteus maximus'],
  calves: ['calves'],
  lats: ['lats', 'latissimus dorsi'],
  traps: ['traps', 'trapezius'],
  middleback: ['middle back', 'rhomboids'],
  lowerback: ['lower back'],
  adductors: ['adductors', 'inner thigh'],
}

function normalizeMuscle(name) {
  const n = (name || '').toLowerCase().trim()
  for (const [key, aliases] of Object.entries(MUSCLE_ALIAS)) {
    if (key === n || aliases.includes(n)) return key
  }
  return n
}

const SIZES = { small: 150, medium: 250, large: 350 }
const VIEW_HEIGHT = { front: 1, back: 1, both: 0.5 }

export default function MuscleMap({
  highlightedMuscles = [],
  secondaryMuscles = [],
  view = 'both',
  size = 'small',
}) {
  const w = SIZES[size] || 150
  const h = Math.round(w * 1.4)
  const halfH = view === 'both' ? h / 2 : h
  const primary = (highlightedMuscles || []).map(normalizeMuscle).filter(Boolean)
  const secondary = (secondaryMuscles || []).map(normalizeMuscle).filter(Boolean)

  const isHighlighted = (id) => primary.includes(id)
  const isSecondary = (id) => secondary.includes(id) && !primary.includes(id)
  const getFill = (id) => {
    if (isHighlighted(id)) return 'rgba(16,185,129,0.6)'
    if (isSecondary(id)) return 'rgba(16,185,129,0.25)'
    return '#0E140E'
  }

  const renderBody = (isBack) => {
    const scale = w / 120
    const cx = 60
    return (
      <svg viewBox="0 0 120 168" width={w} height={halfH} style={{ display: 'block' }}>
        {/* Outline */}
        <path
          d="M60 8 Q70 8 75 20 L80 35 Q82 50 78 65 L75 95 Q72 115 70 135 L68 155 Q65 165 55 165 Q45 165 42 155 L40 135 Q38 115 35 95 L32 65 Q28 50 30 35 L35 20 Q40 8 50 8 Q55 8 60 8"
          fill="none"
          stroke="#1F4030"
          strokeWidth={1.5}
          opacity={0.6}
        />
        {/* Front muscle regions - simplified shapes */}
        {!isBack && (
          <>
            <path id="chest" d="M42 30 Q60 28 78 30 Q75 45 70 55 L50 55 Q45 45 42 30Z" fill={getFill('chest')} stroke="#1F4030" strokeWidth={0.5} opacity={0.8} />
            <path id="shoulders" d="M30 25 L45 22 L60 20 L75 22 L90 25 L85 35 L60 32 L35 35 Z" fill={getFill('shoulders')} stroke="#1F4030" strokeWidth={0.5} opacity={0.8} />
            <path id="biceps" d="M38 55 L48 75 L52 85 L48 55 Z M82 55 L72 75 L68 85 L72 55 Z" fill={getFill('biceps')} stroke="#1F4030" strokeWidth={0.5} opacity={0.8} />
            <path id="forearms" d="M45 88 L50 110 L48 120 L46 88 Z M75 88 L70 110 L72 120 L74 88 Z" fill={getFill('forearms')} stroke="#1F4030" strokeWidth={0.5} opacity={0.8} />
            <path id="abdominals" d="M48 60 L72 60 L70 95 L50 95 Z" fill={getFill('abdominals')} stroke="#1F4030" strokeWidth={0.5} opacity={0.8} />
            <path id="quadriceps" d="M48 100 L72 100 L68 145 L52 145 Z" fill={getFill('quadriceps')} stroke="#1F4030" strokeWidth={0.5} opacity={0.8} />
            <path id="adductors" d="M50 130 L55 155 L52 160 L48 155 Z M70 130 L65 155 L68 160 L72 155 Z" fill={getFill('adductors')} stroke="#1F4030" strokeWidth={0.5} opacity={0.8} />
          </>
        )}
        {isBack && (
          <>
            <path id="traps" d="M35 22 L55 25 L60 35 L40 35 Z M65 35 L80 25 L85 22 L85 35 L65 35 Z" fill={getFill('traps')} stroke="#1F4030" strokeWidth={0.5} opacity={0.8} />
            <path id="lats" d="M38 40 L45 85 L42 95 L35 50 Z M82 40 L75 85 L78 95 L85 50 Z" fill={getFill('lats')} stroke="#1F4030" strokeWidth={0.5} opacity={0.8} />
            <path id="middleback" d="M48 45 L72 45 L70 70 L50 70 Z" fill={getFill('middleback')} stroke="#1F4030" strokeWidth={0.5} opacity={0.8} />
            <path id="lowerback" d="M48 72 L72 72 L70 95 L50 95 Z" fill={getFill('lowerback')} stroke="#1F4030" strokeWidth={0.5} opacity={0.8} />
            <path id="triceps" d="M38 55 L42 85 L40 90 L36 55 Z M82 55 L78 85 L80 90 L84 55 Z" fill={getFill('triceps')} stroke="#1F4030" strokeWidth={0.5} opacity={0.8} />
            <path id="glutes" d="M45 98 L75 98 L72 118 L48 118 Z" fill={getFill('glutes')} stroke="#1F4030" strokeWidth={0.5} opacity={0.8} />
            <path id="hamstrings" d="M48 118 L72 118 L68 155 L52 155 Z" fill={getFill('hamstrings')} stroke="#1F4030" strokeWidth={0.5} opacity={0.8} />
            <path id="calves" d="M50 155 L55 165 L52 168 L48 165 Z M70 155 L65 165 L68 168 L72 165 Z" fill={getFill('calves')} stroke="#1F4030" strokeWidth={0.5} opacity={0.8} />
          </>
        )}
      </svg>
    )
  }

  const showFront = view === 'front' || view === 'both'
  const showBack = view === 'back' || view === 'both'

  return (
    <div style={{ display: 'flex', flexDirection: view === 'both' ? 'row' : 'column', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
      {showFront && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#1F4030', marginBottom: 4 }}>Front</div>
          {renderBody(false)}
        </div>
      )}
      {showBack && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#1F4030', marginBottom: 4 }}>Back</div>
          {renderBody(true)}
        </div>
      )}
    </div>
  )
}
