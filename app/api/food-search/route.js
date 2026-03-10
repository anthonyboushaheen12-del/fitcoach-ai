export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query) {
    return Response.json({ error: 'Query required' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,nutriments,image_small_url,brands,serving_size`,
      { next: { revalidate: 3600 } }
    )

    const data = await res.json()

    const results = (data.products || [])
      .filter((p) => p.product_name && p.nutriments)
      .map((p) => ({
        name: p.product_name,
        brand: p.brands || '',
        image: p.image_small_url || null,
        servingSize: p.serving_size || '100g',
        per100g: {
          calories: Math.round(p.nutriments['energy-kcal_100g'] || 0),
          protein: Math.round((p.nutriments.proteins_100g || 0) * 10) / 10,
          carbs: Math.round((p.nutriments.carbohydrates_100g || 0) * 10) / 10,
          fats: Math.round((p.nutriments.fat_100g || 0) * 10) / 10,
        },
      }))

    return Response.json({ results })
  } catch (error) {
    console.error('Food search error:', error)
    return Response.json({ error: 'Search failed' }, { status: 500 })
  }
}
