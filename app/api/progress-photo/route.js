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

function normalizeRpcProgressPhotoRow(data) {
  if (data == null) return null
  if (Array.isArray(data)) return data[0] ?? null
  return data
}

async function rpcInsertProgressPhoto(userSb, row) {
  const rpc = await userSb.rpc('insert_owned_progress_photo', {
    p_profile_id: row.profile_id,
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
    // Invalid/pasted anon key as "service role" still enforces RLS — fall back to RPC.
    if (isRlsPolicyError(ins.error)) {
      console.warn('progress-photo: service-role insert hit RLS, falling back to RPC')
      const rpc = await rpcInsertProgressPhoto(userSb, row)
      return { data: rpc.data, error: rpc.error, path: 'rpc_after_service_rls' }
    }
    return { data: ins.data, error: ins.error, path: 'service_insert' }
  }

  // No service role: try normal authenticated INSERT first (JWT + anon client).
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

/**
 * Keep only baseline (earliest) + latest photo for a profile; remove others from Storage + DB.
 * Uses service role when available; otherwise user JWT (requires progress_photos_delete_own + storage delete policy).
 */
async function trimProgressPhotosToBaselineAndLatest(trimClient, profileId) {
  if (!trimClient || !profileId) return

  const { data: rows, error: selErr } = await trimClient
    .from('progress_photos')
    .select('id, storage_path')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })

  if (selErr) {
    console.error('progress-photo trim: select failed', selErr)
    return
  }

  const list = rows || []
  if (list.length <= 2) return

  const first = list[0]
  const last = list[list.length - 1]
  const keep = new Set([first.id, last.id])
  const toRemove = list.filter((r) => !keep.has(r.id))
  const paths = toRemove.map((r) => r.storage_path).filter(Boolean)

  if (paths.length) {
    const { error: rmErr } = await trimClient.storage.from(BUCKET).remove(paths)
    if (rmErr) console.error('progress-photo trim: storage remove', rmErr)
  }

  const ids = toRemove.map((r) => r.id)
  if (!ids.length) return

  const { error: delErr } = await trimClient.from('progress_photos').delete().in('id', ids)
  if (delErr) console.error('progress-photo trim: delete rows', delErr)
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

  const { data: rows, error } = await supabase
    .from('progress_photos')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const photos = await Promise.all(
    (rows || []).map(async (row) => {
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

  return Response.json({ photos })
}

export async function POST(request) {
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

  try {
    const body = await request.json()
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
      const hint =
        lower.includes('insert_owned_progress_photo') ||
        lower.includes('does not exist') ||
        lower.includes('42883')
          ? 'Database function missing: run supabase-progress-photo-rpc.sql in Supabase SQL Editor (include ALTER FUNCTION ... OWNER TO postgres), or set the real service_role key in Vercel.'
          : isRlsPolicyError(insertError)
            ? `${msg} Fix: run supabase-progress-photo-rpc.sql in Supabase (ALTER FUNCTION ... OWNER TO postgres), or set SUPABASE_SERVICE_ROLE_KEY to the service_role secret (not the anon key).`
            : msg
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

    const trimClient = serviceSb || userSb
    if (!serviceSb) {
      console.warn(
        'progress-photo: SUPABASE_SERVICE_ROLE_KEY missing; trimming via user JWT (delete RLS + storage policies must allow it)'
      )
    }
    await trimProgressPhotosToBaselineAndLatest(trimClient, effectiveProfileId)

    return Response.json({
      success: true,
      photo: { ...inserted, signedUrl: signed?.signedUrl ?? null },
    })
  } catch (e) {
    console.error('progress-photo POST:', e)
    return Response.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}
