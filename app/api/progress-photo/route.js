import {
  createSupabaseRouteClient,
  createSupabaseServiceRoleClient,
  createSupabaseUserJwtClient,
  getBearerToken,
} from '../../../lib/supabase-api-route'

const BUCKET = 'progress-photos'
const SIGNED_URL_SEC = 3600

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

    let inserted
    let insertError

    if (serviceSb) {
      const ins = await serviceSb
        .from('progress_photos')
        .insert(row)
        .select()
        .single()
      inserted = ins.data
      insertError = ins.error
    } else {
      const ins = await userSb
        .rpc('insert_owned_progress_photo', {
          p_profile_id: row.profile_id,
          p_storage_path: row.storage_path,
          p_image_url: row.image_url,
          p_analysis: row.analysis,
          p_body_fat_estimate: row.body_fat_estimate,
          p_weight_at_time: row.weight_at_time,
          p_notes: row.notes,
          p_photo_type: row.photo_type,
        })
        .single()
      inserted = ins.data
      insertError = ins.error
    }

    if (insertError) {
      await storageClient.storage.from(BUCKET).remove([storagePath])
      const msg = insertError.message || ''
      const lower = msg.toLowerCase()
      const hint =
        lower.includes('insert_owned_progress_photo') ||
        lower.includes('does not exist') ||
        lower.includes('42883')
          ? 'Database function missing: run supabase-progress-photo-rpc.sql in Supabase SQL Editor, or set SUPABASE_SERVICE_ROLE_KEY on the server.'
          : msg
      console.error('progress-photo insert:', insertError)
      return Response.json({ error: hint }, { status: 500 })
    }

    const { data: signed } = await storageClient.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_SEC)

    return Response.json({
      success: true,
      photo: { ...inserted, signedUrl: signed?.signedUrl ?? null },
    })
  } catch (e) {
    console.error('progress-photo POST:', e)
    return Response.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}
