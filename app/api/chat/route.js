import Anthropic from '@anthropic-ai/sdk'
import { getTrainer, buildSystemPrompt, buildOnboardingContextPrompt } from '../../../lib/trainers'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request) {
  try {
    const { message, image, profile, trainerId, history, onboardingContext } = await request.json()

    const trainer = getTrainer(trainerId)
    const systemPrompt = buildSystemPrompt(trainer, profile) + buildOnboardingContextPrompt(onboardingContext)

    // Build message content
    const userContent = []

    // Add image if provided
    if (image) {
      userContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: image,
        },
      })
    }

    // Add text
    userContent.push({
      type: 'text',
      text: message || (image ? 'Please assess this photo and give me your honest feedback based on my profile and goals.' : 'Hello!'),
    })

    // Build conversation history for context
    const messages = []
    
    // Add recent history
    if (history && history.length > 0) {
      for (const msg of history) {
        messages.push({
          role: msg.role,
          content: msg.content,
        })
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      content: userContent,
    })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
    })

    const reply = response.content[0].text

    return Response.json({ reply })
  } catch (error) {
    console.error('Chat API error:', error)
    return Response.json(
      { error: 'Failed to get response', details: error.message },
      { status: 500 }
    )
  }
}
