import { createSupabaseRouteClient } from '../../../lib/supabase-api-route'

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
  let supabase
  try {
    supabase = createSupabaseRouteClient(request)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 401 })
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

    const authHdr = request.headers.get('authorization') || ''
    const token = authHdr.replace(/^Bearer\s+/i, '').trim()
    const {
      data: { user },
      error: userErr,
    } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser()
    if (userErr || !user?.id) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: ownedProfile, error: profileLookupErr } = await supabase
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

    const effectiveProfileId = ownedProfile.id
    const uid = user.id
    const fileName = `${Date.now()}.jpg`
    const storagePath = `${uid}/${effectiveProfileId}/${fileName}`

    const buffer = Buffer.from(imageBase64, 'base64')
    const { error: uploadError } = await supabase.storage
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

    const { data: inserted, error: insertError } = await supabase
      .from('progress_photos')
      .insert({
        profile_id: effectiveProfileId,
        storage_path: storagePath,
        image_url: null,
        analysis,
        body_fat_estimate: bodyFat,
        weight_at_time: weightAtTime != null ? Number(weightAtTime) : null,
        notes: notes || null,
        photo_type: photoType || 'front',
      })
      .select()
      .single()

    if (insertError) {
      await supabase.storage.from(BUCKET).remove([storagePath])
      return Response.json({ error: insertError.message }, { status: 500 })
    }

    const { data: signed } = await supabase.storage
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
