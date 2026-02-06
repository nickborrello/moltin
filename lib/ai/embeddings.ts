import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float',
  })

  return response.data[0].embedding
}

export async function generateProfileEmbedding(profile: {
  name: string
  headline?: string
  bio?: string
  skills?: string[]
}): Promise<number[]> {
  const text = [
    profile.name,
    profile.headline,
    profile.bio,
    ...(profile.skills || []),
  ]
    .filter(Boolean)
    .join(' ')

  return generateEmbedding(text)
}

export async function generateJobEmbedding(job: {
  title: string
  description: string
  requirements?: string[]
}): Promise<number[]> {
  const text = [
    job.title,
    job.description,
    ...(job.requirements || []),
  ]
    .filter(Boolean)
    .join(' ')

  return generateEmbedding(text)
}
