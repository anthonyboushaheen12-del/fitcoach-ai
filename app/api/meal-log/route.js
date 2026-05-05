import { createClient } from '@supabase/supabase-js'
import {
  createSupabaseServiceRoleClient,
  createSupabaseUserJwtClient,
  getBearerToken,
} from '../../../lib/supabase-api-route'

const BUCKET = 'progress-photos'
const MEAL_PHOTO_SIGNED_SEC = 7 * 24 * 3600

function getSupabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

async function attachMealPhotoSignedUrls(serviceSb, meals) {
  if (!meals?.length) return meals
  if (!serviceSb) {
    return meals.map((m) => ({
      ...m,
      meal_photo_url: null,
      meal_photo_storage_path: m.meal_photo_storage_path ?? null,
    }))
  }
  const out = []
  for (const m of meals) {
    const path = m.meal_photo_storage_path
    if (!path) {
      out.push({ ...m, meal_photo_url: null })
      continue
    }
    const { data, error } = await serviceSb.storage.from(BUCKET).createSignedUrl(path, MEAL_PHOTO_SIGNED_SEC)
    if (error) {
      out.push({ ...m, meal_photo_url: null })
      continue
    }
    out.push({ ...m, meal_photo_url: data?.signedUrl ?? null })
  }
  return out
}

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      profileId,
      mealName,
      foodItems,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFats,
      mealType,
      mealPhotoBase64,
      mealPhotoMediaType,
    } = body

    if (!profileId || !mealName) {
      return Response.json({ error: 'profileId and mealName required' }, { status: 400 })
    }

    const token = getBearerToken(request)
    const hasPhoto = typeof mealPhotoBase64 === 'string' && mealPhotoBase64.length > 0

    if (hasPhoto && !token) {
      return Response.json({ error: 'Sign in required to attach a meal photo.' }, { status: 401 })
    }

    let db = getSupabaseAnon()
    let mealPhotoStoragePath = null

    if (token) {
      db = createSupabaseUserJwtClient(token)
      const {
        data: { user },
        error: userErr,
      } = await db.auth.getUser(token)
      if (userErr || !user?.id) {
        return Response.json({ error: 'Not authenticated' }, { status: 401 })
      }

      const { data: ownedProfile, error: profileLookupErr } = await db
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (profileLookupErr) {
        console.error('meal-log profile lookup:', profileLookupErr)
        return Response.json({ error: 'Could not verify profile' }, { status: 500 })
      }
      if (!ownedProfile?.id || ownedProfile.id !== profileId) {
        return Response.json({ error: 'Profile does not match this account.' }, { status: 403 })
      }

      if (hasPhoto) {
        const serviceSb = createSupabaseServiceRoleClient()
        const storageClient = serviceSb || db
        const fileName = `meal-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`
        mealPhotoStoragePath = `${user.id}/${profileId}/meals/${fileName}`
        const mediaType = typeof mealPhotoMediaType === 'string' ? mealPhotoMediaType : 'image/jpeg'
        const buffer = Buffer.from(mealPhotoBase64, 'base64')
        const { error: uploadError } = await storageClient.storage.from(BUCKET).upload(mealPhotoStoragePath, buffer, {
          contentType: mediaType.startsWith('image/') ? mediaType : 'image/jpeg',
          upsert: false,
        })
        if (uploadError) {
          console.error('meal-log upload:', uploadError)
          return Response.json({ error: uploadError.message }, { status: 500 })
        }
      }
    }

    const insertRow = {
      profile_id: profileId,
      meal_name: mealName,
      food_items: foodItems || [],
      total_calories: totalCalories ?? 0,
      total_protein: totalProtein ?? 0,
      total_carbs: totalCarbs ?? 0,
      total_fats: totalFats ?? 0,
      meal_type: mealType,
    }
    if (mealPhotoStoragePath) {
      insertRow.meal_photo_storage_path = mealPhotoStoragePath
    }

    const { data, error } = await db.from('meal_logs').insert(insertRow).select()

    if (error) return Response.json({ error: error.message }, { status: 500 })

    const row = data[0]
    const serviceSb = createSupabaseServiceRoleClient()
    const signedRows = await attachMealPhotoSignedUrls(serviceSb, row ? [row] : [])
    const payload = signedRows[0] || row
    return Response.json({ success: true, data: payload })
  } catch (err) {
    return Response.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const supabase = getSupabaseAnon()
    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId')
    const date = searchParams.get('date')

    if (!profileId) {
      return Response.json({ error: 'profileId required' }, { status: 400 })
    }

    let query = supabase
      .from('meal_logs')
      .select('*')
      .eq('profile_id', profileId)
      .order('logged_at', { ascending: false })

    if (date) {
      query = query.gte('logged_at', `${date}T00:00:00`).lt('logged_at', `${date}T23:59:59.999`)
    }

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })
    const serviceSb = createSupabaseServiceRoleClient()
    const meals = await attachMealPhotoSignedUrls(serviceSb, data || [])
    return Response.json({ meals })
  } catch (err) {
    return Response.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
