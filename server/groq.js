// Backups for Sensai: when every Gemini model is busy or out of quota, the same request goes to the next
// OpenAI-compatible provider that has a key, in this order:
//   Groq → NVIDIA NIM → Mistral → OpenRouter → SambaNova → Cloudflare Workers AI → IteraCompute → Z.ai → DeepSeek (paid)
// Every provider is optional: it switches on only when its key is set on the server. Model lists can be overridden
// with <NAME>_TEXT_MODELS / <NAME>_VISION_MODELS (comma-separated); a retired model name just falls through to the next.
// (GitHub Models was retired by GitHub on 30 July 2026, so it is not used.)
// Each provider has a text model and a model that can read photos. A provider that is rate-limited or failing is
// rested for a while. Responses are shaped like Gemini's ({ text } / chunks with .text), so the rest of the server
// doesn't need to know who answered.
const env = (...names) => names.map((n) => process.env[n]).find(Boolean)

const PROVIDERS = [
  {
    name: 'groq',
    key: env('GROQ_API_KEY', 'Groq_API_KEY', 'groq_api_key'),
    url: 'https://api.groq.com/openai/v1/chat/completions',
    text: [env('GROQ_TEXT_MODEL') || 'openai/gpt-oss-120b'],
    vision: [env('GROQ_VISION_MODEL') || 'qwen/qwen3.8-27b'],
  },
  {
    name: 'nvidia',
    key: env('NVIDIA_API_KEY', 'Nvidia_API_KEY'),
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    text: (env('NVIDIA_TEXT_MODELS') || 'nvidia/nemotron-3-super-120b-a12b,deepseek-ai/deepseek-v4.1-flash,openai/gpt-oss-20b').split(','),
    vision: (env('NVIDIA_VISION_MODELS') || 'nvidia/nemotron-3.5-super-vl-120b-a12b').split(','),
  },
  {
    name: 'mistral',
    key: env('MISTRAL_API_KEY', 'Mistral_API_KEY'),
    url: 'https://api.mistral.ai/v1/chat/completions',
    text: (env('MISTRAL_TEXT_MODELS') || 'mistral-medium-latest,mistral-small-latest').split(','),
    vision: (env('MISTRAL_VISION_MODELS') || 'mistral-small-latest,mistral-medium-latest').split(','),
  },
  {
    name: 'openrouter',
    key: env('OPENROUTER_API_KEY', 'OpenRouter_API_KEY', 'OPENROUTER_KEY'),
    url: 'https://openrouter.ai/api/v1/chat/completions',
    // OpenRouter tries the listed models in order itself (the "models" field)
    text: [(env('OPENROUTER_TEXT_MODELS') || 'openrouter/free,nvidia/nemotron-3-super-120b-a12b:free,google/gemma-4-31b-it:free').split(',')],
    vision: [(env('OPENROUTER_VISION_MODELS') || 'openrouter/free,google/gemma-4-31b-it:free,nvidia/nemotron-3.5-super-vl:free').split(',')],
    headers: { 'HTTP-Referer': 'https://step12.uz', 'X-Title': 'STEP12 Sensai' },
  },
  {
    name: 'sambanova',
    key: env('SAMBANOVA_API_KEY', 'SambaNova_API_KEY'),
    url: 'https://api.sambanova.ai/v1/chat/completions',
    text: (env('SAMBANOVA_TEXT_MODELS') || 'gpt-oss-120b,DeepSeek-V3.2,Meta-Llama-3.3-70B-Instruct').split(','),
    vision: (env('SAMBANOVA_VISION_MODELS') || 'gemma-4-31B-it').split(','),
  },
  {
    name: 'cloudflare',
    key: env('CLOUDFLARE_API_TOKEN', 'Cloudflare_API_TOKEN') && env('CLOUDFLARE_ACCOUNT_ID', 'Cloudflare_ACCOUNT_ID') ? env('CLOUDFLARE_API_TOKEN', 'Cloudflare_API_TOKEN') : null,
    url: `https://api.cloudflare.com/client/v4/accounts/${env('CLOUDFLARE_ACCOUNT_ID', 'Cloudflare_ACCOUNT_ID')}/ai/v1/chat/completions`,
    text: (env('CLOUDFLARE_TEXT_MODELS') || '@cf/openai/gpt-oss-120b,@cf/meta/llama-3.3-70b-instruct-fp8-fast').split(','),
    vision: (env('CLOUDFLARE_VISION_MODELS') || '@cf/meta/llama-4-scout-17b-16e-instruct').split(','),
  },
  {
    // free: 30M tokens/month on Qwen3.8 27B (promotion until 24 Nov 2026), no paid overage
    name: 'iteracompute',
    key: env('ITERACOMPUTE_API_KEY', 'IteraCompute_API_KEY'),
    url: 'https://api.iteracompute.com/v1/chat/completions',
    text: (env('ITERACOMPUTE_TEXT_MODELS') || 'qwen/qwen3.8-27b').split(','),
    vision: (env('ITERACOMPUTE_VISION_MODELS') || 'qwen/qwen3.8-27b').split(','),
  },
  {
    name: 'zai',
    key: env('ZAI_API_KEY', 'ZAI_KEY', 'GLM_API_KEY'),
    url: 'https://api.z.ai/api/paas/v4/chat/completions',
    text: (env('ZAI_TEXT_MODELS') || 'glm-4.7-flash').split(','),
    vision: (env('ZAI_VISION_MODELS') || 'glm-4.6v-flash').split(','),
  },
  {
    name: 'deepseek',
    key: env('DEEPSEEK_API_KEY', 'DeepSeek_API_KEY'),
    url: 'https://api.deepseek.com/chat/completions',
    text: [env('DEEPSEEK_TEXT_MODEL') || 'deepseek-flash'],
    vision: [env('DEEPSEEK_VISION_MODEL') || 'deepseek-flash'],
  },
].filter((p) => p.key)

export const groqReady = PROVIDERS.length > 0
export const backupNames = PROVIDERS.map((p) => p.name)
const resting = new Map()

function toMessages({ contents, config = {} }) {
  const messages = []
  const sys = typeof config.systemInstruction === 'string' ? config.systemInstruction : config.systemInstruction?.parts?.map((p) => p.text).join('\n')
  if (sys) messages.push({ role: 'system', content: sys })
  let images = false
  const list = typeof contents === 'string' ? [{ role: 'user', parts: [{ text: contents }] }] : contents || []
  for (const c of list) {
    const parts = (c.parts || []).map((p) => {
      if (p.text != null) return { type: 'text', text: p.text }
      if (p.inlineData) {
        images = true
        return { type: 'image_url', image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` } }
      }
      return null
    }).filter(Boolean)
    if (!parts.length) continue
    const role = c.role === 'model' ? 'assistant' : 'user'
    // only user turns may carry images; plain text keeps the request small
    messages.push({ role, content: role === 'user' && parts.some((p) => p.type === 'image_url') ? parts : parts.map((p) => p.text || '').join('\n') })
  }
  return { messages, images }
}

async function callOne(p, model, req, stream) {
  const { messages, images } = toMessages(req)
  const body = { messages, temperature: req.config?.temperature ?? 0.4, stream }
  if (Array.isArray(model)) body.models = model
  else body.model = model
  if (req.config?.responseMimeType === 'application/json') body.response_format = { type: 'json_object' }
  const res = await fetch(p.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${p.key}`, 'Content-Type': 'application/json', ...(p.headers || {}) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) {
    const err = new Error(`${p.name} ${Array.isArray(model) ? model[0] : model} ${res.status}: ${(await res.text()).slice(0, 200)}`)
    err.status = res.status
    throw err
  }
  return { res, images }
}

/** Tries each provider (and each of its models) until one answers. */
async function call(req, stream) {
  const hasImages = toMessages(req).images
  let last
  const order = PROVIDERS.filter((p) => (resting.get(p.name) || 0) < Date.now())
  for (const p of order.length ? order : PROVIDERS) {
    for (const model of hasImages ? p.vision : p.text) {
      try {
        const { res } = await callOne(p, model, req, stream)
        return { res, label: `${p.name}:${Array.isArray(model) ? model[0] : model}` }
      } catch (e) {
        last = e
        console.warn(`Backup ${e.message}`)
        if (e.status === 429 || e.status === 401 || e.status === 403 || e.status >= 500) {
          resting.set(p.name, Date.now() + (e.status === 401 || e.status === 403 ? 3600_000 : 60_000))
          break // this provider is out for now: go to the next one
        }
        // 400/404 (e.g. a retired model name): try this provider's next model
      }
    }
  }
  throw last || new Error('No backup AI provider is configured')
}

export async function groqGenerate(req) {
  const { res } = await call(req, false)
  const j = await res.json()
  return { text: j.choices?.[0]?.message?.content || '' }
}

export async function groqStream(req) {
  const { res, label } = await call(req, true)
  const gen = (async function* () {
    const decoder = new TextDecoder()
    let buf = ''
    for await (const piece of res.body) {
      buf += decoder.decode(piece, { stream: true })
      let i
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim()
        buf = buf.slice(i + 1)
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (data === '[DONE]') return
        let t
        try {
          t = JSON.parse(data).choices?.[0]?.delta?.content
        } catch {
          continue // keep-alive comments and partial lines
        }
        if (t) yield { text: t }
      }
    }
  })()
  gen.model = label
  return gen
}
