import { SignJWT } from 'jose'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}

function send(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  })
}

export async function onRequestOptions() {
  return new Response(null, { headers: cors })
}

export async function onRequestPost({ request, env }) {
  try {
    const { roomName, participantName } = await request.json()

    if (!roomName || !participantName) {
      return send({ error: 'Informe roomName e participantName.' }, 400)
    }

    if (!env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
      return send({ error: 'Configure LIVEKIT_API_KEY e LIVEKIT_API_SECRET no Cloudflare Pages.' }, 500)
    }

    const now = Math.floor(Date.now() / 1000)
    const secret = new TextEncoder().encode(env.LIVEKIT_API_SECRET)

    const token = await new SignJWT({
      video: {
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true
      }
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(env.LIVEKIT_API_KEY)
      .setSubject(participantName)
      .setIssuedAt(now)
      .setExpirationTime(now + 60 * 60 * 6)
      .sign(secret)

    return send({ token })
  } catch (e) {
    return send({ error: e.message || 'Erro ao gerar token.' }, 500)
  }
}
