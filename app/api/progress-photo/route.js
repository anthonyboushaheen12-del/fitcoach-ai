import {
  createSupabaseRouteClient,
  createSupabaseServiceRoleClient,
  createSupabaseUserJwtClient,
  getBearerToken,
} from '../../../lib/supabase-api-route'

const BUCKET = 'progress-photos'
const SIGNED_URL_SEC = 3600

function isRlsPolicyError(err) {
  const m = (err?.message || '').toLowerCase()
  return m.includes('row-level security') || m.includes('rls')
}

/** User-facing hint when Supabase schema is missing progress_sessions / session_id or cache is stale. */
function hintProgressSessionsSetup(rawMessage) {
  const m = (rawMessage || '').toLowerCase()
  const steps =
    'Use the Supabase project whose URL matches Vercel env NEXT_PUBLIC_SUPABASE_URL. In SQL Editor run ' +
    '(1) supabase-progress-sessions-migration.sql (2) supabase-progress-photo-rpc.sql. ' +
    'Then Project Settings → API → reload schema (or wait one minute).'
  const schemaMiss =
    m.includes('schema cache') ||
    m.includes('could not find') ||
    m.includes('does not exist') ||
    (m.includes('relation') && m.includes('does not exist'))
  if (m.includes('progress_sessions') && schemaMiss) {
    return `Database setup: ${steps}`
  }
  if ((m.includes('session_id') || m.includes('progress_sessions')) && (m.includes('column') || m.includes('null value'))) {
    return `Database setup: ${steps}`
  }
  return null
}

function normalizeRpcProgressPhotoRow(data) {
  if (data == null) return null
  if (Array.isArray(data)) return data[0] ?? null
  return data
}

async function rpcInsertProgressPhoto(userSb, row) {
  const rpc = await userSb.rpc('insert_owned_progress_photo', {
    p_profile_id: row.profile_id,
    p_session_id: row.session_id,
    p_storage_path: row.storage_path,
    p_image_url: row.image_url,
    p_analysis: row.analysis,
    p_body_fat_estimate: row.body_fat_estimate,
    p_weight_at_time: row.weight_at_time,
    p_notes: row.notes,
    p_photo_type: row.photo_type,
  })
  if (rpc.error) return { data: null, error: rpc.error }
  return { data: normalizeRpcProgressPhotoRow(rpc.data), error: null }
}

async function insertProgressPhotoRow(userSb, serviceSb, row) {
  if (serviceSb) {
    const ins = await serviceSb.from('progress_photos').insert(row).select().single()
    if (!ins.error) {
      return { data: ins.data, error: null, path: 'service_insert' }
    }
    if (isRlsPolicyError(ins.error)) {
      console.warn('progress-photo: service-role insert hit RLS, falling back to RPC')
      const rpc = await rpcInsertProgressPhoto(userSb, row)
      return { data: rpc.data, error: rpc.error, path: 'rpc_after_service_rls' }
    }
    return { data: ins.data, error: ins.error, path: 'service_insert' }
  }

  const direct = await userSb.from('progress_photos').insert(row).select().single()
  if (!direct.error) {
    return { data: direct.data, error: null, path: 'user_direct' }
  }
  if (!isRlsPolicyError(direct.error)) {
    return { data: direct.data, error: direct.error, path: 'user_direct' }
  }

  console.warn('progress-photo: user JWT insert hit RLS, falling back to RPC')

  const rpc = await rpcInsertProgressPhoto(userSb, row)
  return { data: rpc.data, error: rpc.error, path: 'rpc_after_user_rls' }
}

function attachSessionsToPhotos(rows, sessions) {
  const map = Object.fromEntries((sessions || []).map((s) => [s.id, s]))
  return (rows || []).map((row) => ({
    ...row,
    session: row.session_id ? map[row.session_id] ?? null : null,
  }))
}

async function ensureSessionForUpload(userSb, serviceSb, profileId, body) {
  const db = serviceSb || userSb
  const incoming = body.sessionId
  if (incoming) {
    const q = await db
      .from('progress_sessions')
      .select('id, profile_id, session_date, label, notes')
      .eq('id', incoming)
      .maybeSingle()
    if (q.error) {
      const hint = hintProgressSessionsSetup(q.error.message)
      return { error: hint || q.error.message || 'Could not load check-in.', session: null }
    }
    if (!q.data || q.data.profile_id !== profileId) {
      return { error: 'Invalid check-in. Start a new check-in or pick the latest visit.', session: null }
    }
    return { error: null, session: q.data }
  }
  const rawDate = body.sessionDate
  const date =
    typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())
      ? rawDate.trim()
      : new Date().toISOString().split('T')[0]
  const label = typeof body.sessionLabel === 'string' && body.sessionLabel.trim() ? body.sessionLabel.trim() : null
  const ins = await db
    .from('progress_sessions')
    .insert({
      profile_id: profileId,
      session_date: date,
      label,
    })
    .select()
    .single()
  if (ins.error) {
    const hint = hintProgressSessionsSetup(ins.error.message)
    return { error: hint || ins.error.message || 'Could not create check-in', session: null }
  }
  return { error: null, session: ins.data }
}

export async function GET(request) {
  let supabase
  try {
    supabase = createSupabaseRouteClient(request)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const profileId = searchParams.get('profileId')
  if (!profileId) {
    return Response.json({ error: 'profileId required' }, { status: 400 })
  }

  const { data: sessions, error: sessErr } = await supabase
    .from('progress_sessions')
    .select('id, profile_id, session_date, label, notes, merged_analysis, created_at')
    .eq('profile_id', profileId)
    .order('session_date', { ascending: false })

  if (sessErr) {
    const hint = hintProgressSessionsSetup(sessErr.message)
    return Response.json({ error: hint || sessErr.message }, { status: 500 })
  }

  const { data: rows, error } = await supabase
    .from('progress_photos')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true })

  if (error) {
    const hint = hintProgressSessionsSetup(error.message)
    return Response.json({ error: hint || error.message }, { status: 500 })
  }

  const withSessions = attachSessionsToPhotos(rows, sessions)

  const photos = await Promise.all(
    withSessions.map(async (row) => {
      if (!row.storage_path) {
        return { ...row, signedUrl: null }
      }
      const { data: signed, error: signErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(row.storage_path, SIGNED_URL_SEC)
      if (signErr) {
        return { ...row, signedUrl: null, signError: signErr.message }
      }
      return { ...row, signedUrl: signed?.signedUrl ?? null }
    })
  )

  return Response.json({ photos, sessions: sessions || [] })
}

export async function DELETE(request) {
  const token = getBearerToken(request)
  if (!token) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let userSb
  try {
    userSb = createSupabaseUserJwtClient(token)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }

  const id = new URL(request.url).searchParams.get('id')
  if (!id) {
    return Response.json({ error: 'id required' }, { status: 400 })
  }

  const {
    data: { user },
    error: userErr,
  } = await userSb.auth.getUser(token)
  if (userErr || !user?.id) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: ownedProfile, error: profileLookupErr } = await userSb
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileLookupErr || !ownedProfile?.id) {
    return Response.json({ error: 'Could not verify profile' }, { status: 403 })
  }

  const serviceSb = createSupabaseServiceRoleClient()
  const db = serviceSb || userSb

  const { data: row, error: selErr } = await db
    .from('progress_photos')
    .select('id, storage_path, profile_id')
    .eq('id', id)
    .maybeSingle()

  if (selErr || !row) {
    return Response.json({ error: 'Photo not found' }, { status: 404 })
  }
  if (row.profile_id !== ownedProfile.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (row.storage_path) {
    const { error: rmErr } = await db.storage.from(BUCKET).remove([row.storage_path])
    if (rmErr) console.error('progress-photo DELETE storage:', rmErr)
  }

  const { error: delErr } = await db.from('progress_photos').delete().eq('id', id)
  if (delErr) {
    console.error('progress-photo DELETE:', delErr)
    return Response.json({ error: delErr.message }, { status: 500 })
  }

  return Response.json({ success: true })
}

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const headerToken = getBearerToken(request)
  const bodyToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : ''
  const token = headerToken || bodyToken || null
  if (!token) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let userSb
  try {
    userSb = createSupabaseUserJwtClient(token)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }

  try {
    const {
      profileId,
      imageBase64,
      analysis = null,
      weightAtTime = null,
      notes = null,
      photoType = 'front',
    } = body

    if (!profileId) {
      return Response.json({ error: 'profileId required' }, { status: 400 })
    }
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return Response.json({ error: 'imageBase64 required' }, { status: 400 })
    }

    const {
      data: { user },
      error: userErr,
    } = await userSb.auth.getUser(token)
    if (userErr || !user?.id) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: ownedProfile, error: profileLookupErr } = await userSb
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileLookupErr) {
      console.error('progress-photo profile lookup:', profileLookupErr)
      return Response.json({ error: 'Could not verify profile' }, { status: 500 })
    }
    if (!ownedProfile?.id) {
      return Response.json(
        { error: 'Profile not linked to this account. Complete onboarding or contact support.' },
        { status: 403 }
      )
    }
    if (profileId !== ownedProfile.id) {
      return Response.json({ error: 'Profile does not match this account.' }, { status: 403 })
    }

    const serviceSb = createSupabaseServiceRoleClient()
    const effectiveProfileId = ownedProfile.id
    const uid = user.id
    const storageClient = serviceSb || userSb

    const sessionOutcome = await ensureSessionForUpload(userSb, serviceSb, effectiveProfileId, body)
    if (sessionOutcome.error) {
      return Response.json({ error: sessionOutcome.error }, { status: 400 })
    }
    const session = sessionOutcome.session

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`
    const storagePath = `${uid}/${effectiveProfileId}/${fileName}`

    const buffer = Buffer.from(imageBase64, 'base64')
    const { error: uploadError } = await storageClient.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (uploadError) {
      console.error('progress-photo upload:', uploadError)
      return Response.json({ error: uploadError.message }, { status: 500 })
    }

    const bodyFat =
      analysis && typeof analysis.bodyFatEstimate === 'string' ? analysis.bodyFatEstimate : null

    const row = {
      profile_id: effectiveProfileId,
      session_id: session.id,
      storage_path: storagePath,
      image_url: null,
      analysis,
      body_fat_estimate: bodyFat,
      weight_at_time: weightAtTime != null && weightAtTime !== '' ? Number(weightAtTime) : null,
      notes: notes?.trim?.() ? notes.trim() : null,
      photo_type: photoType || 'front',
    }

    const insertOutcome = await insertProgressPhotoRow(userSb, serviceSb, row)
    const { data: inserted, error: insertError } = insertOutcome

    if (insertError) {
      await storageClient.storage.from(BUCKET).remove([storagePath])
      const msg = insertError.message || ''
      const lower = msg.toLowerCase()
      const sessionHint = hintProgressSessionsSetup(msg)
      const hint =
        sessionHint ||
        (lower.includes('insert_owned_progress_photo') ||
        lower.includes('does not exist') ||
        lower.includes('42883') ||
        lower.includes('session_id')
          ? 'Database may need migration: run supabase-progress-sessions-migration.sql and supabase-progress-photo-rpc.sql in Supabase, and set SUPABASE_SERVICE_ROLE_KEY if inserts fail.'
          : isRlsPolicyError(insertError)
            ? `${msg} Fix: run supabase-progress-photo-rpc.sql in Supabase (ALTER FUNCTION ... OWNER TO postgres), or set SUPABASE_SERVICE_ROLE_KEY to the service_role secret (not the anon key).`
            : msg)
      console.error('progress-photo insert:', insertError)
      return Response.json({ error: hint }, { status: 500 })
    }

    const { data: signed } = await storageClient.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_SEC)

    if (!inserted) {
      await storageClient.storage.from(BUCKET).remove([storagePath])
      return Response.json(
        { error: 'Save succeeded but no row returned. Re-run supabase-progress-photo-rpc.sql.' },
        { status: 500 }
      )
    }

    return Response.json({
      success: true,
      sessionId: session.id,
      session,
      photo: { ...inserted, signedUrl: signed?.signedUrl ?? null, session },
    })
  } catch (e) {
    console.error('progress-photo POST:', e)
    return Response.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}
