import { useMemo, useRef, useState } from 'react'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import { supabase } from './supabase'

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL

function clean(value) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')
}
function code() { return `dm-${Math.random().toString(36).slice(2,8)}` }
function getRooms() { return JSON.parse(localStorage.getItem('dm_meet_rooms') || '[]') }
function saveRoom(room) {
  const list = getRooms().filter(r => r.roomName !== room.roomName)
  localStorage.setItem('dm_meet_rooms', JSON.stringify([room, ...list].slice(0, 40)))
}
function formatDateTime(value) {
  if (!value) return 'Agora'
  try { return new Date(value).toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}) }
  catch { return value }
}
function isRoomLocked(roomName) {
  const room = getRooms().find(r => r.roomName === roomName)
  if (!room?.scheduledAt) return { locked:false, room }
  return { locked: new Date(room.scheduledAt).getTime() > Date.now(), room }
}

export default function App() {
  const [screen, setScreen] = useState('home')
  const [roomName, setRoomName] = useState('')
  const [roomTitle, setRoomTitle] = useState('')
  const [participantName, setParticipantName] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const recent = useMemo(() => getRooms(), [screen, notice])

  async function registerRoom(nextRoomName, title, scheduleValue) {
    const room = { roomName: nextRoomName, title: title || 'Reunião DM', createdBy: participantName || 'DM', scheduledAt: scheduleValue || '', createdAt: new Date().toISOString() }
    saveRoom(room)
    if (supabase) {
      await supabase.from('dm_meet_rooms').upsert({ room_name: room.roomName, title: room.title, created_by: room.createdBy, scheduled_at: room.scheduledAt || null, created_at: room.createdAt }, { onConflict: 'room_name' })
    }
    return room
  }
  async function getToken(nextRoomName, name) {
    const res = await fetch('/api/livekit-token', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ roomName: nextRoomName, participantName: name }) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erro ao conectar.')
    return data.token
  }
  async function createMeeting() {
    setError(''); setNotice(''); setLoading(true)
    try {
      const title = roomTitle.trim() || 'Reunião DM'
      let rn = clean(title); if (!rn || rn.length < 3) rn = code()
      const room = await registerRoom(rn, title, scheduledAt)
      if (scheduledAt && new Date(scheduledAt).getTime() > Date.now()) { setRoomName(room.roomName); setNotice(`Sala agendada com sucesso. Código: ${room.roomName}`); setScreen('scheduled'); return }
      const name = participantName.trim() || 'Administrador DM'
      const tk = await getToken(room.roomName, name)
      setRoomName(room.roomName); setParticipantName(name); setToken(tk); setScreen('room')
    } catch(e) { setError(e.message) } finally { setLoading(false) }
  }
  async function joinMeeting() {
    setError(''); setNotice(''); setLoading(true)
    try {
      const rn = clean(roomName.trim()); if (!rn) throw new Error('Digite o código da reunião.')
      const lock = isRoomLocked(rn)
      if (lock.locked) throw new Error(`Esta reunião está agendada para ${formatDateTime(lock.room.scheduledAt)}. O código só fica ativo no horário marcado.`)
      const name = participantName.trim() || 'Convidado DM'
      const tk = await getToken(rn, name)
      setRoomName(rn); setParticipantName(name); setToken(tk); setScreen('room')
    } catch(e) { setError(e.message) } finally { setLoading(false) }
  }
  async function startBrowserRecording() {
    setError('')
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) throw new Error('Seu navegador não permite gravação de tela.')
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true })
      chunksRef.current = []; streamRef.current = stream
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm'
      const recorder = new MediaRecorder(stream, { mimeType: mime }); recorderRef.current = recorder
      recorder.ondataavailable = (event) => { if (event.data?.size > 0) chunksRef.current.push(event.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        const url = URL.createObjectURL(blob); const a = document.createElement('a')
        const stamp = new Date().toISOString().replace(/[:.]/g, '-')
        a.href = url; a.download = `dm-meet-${roomName || 'reuniao'}-${stamp}.webm`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
        setIsRecording(false); clearInterval(timerRef.current); setRecordingSeconds(0)
      }
      stream.getVideoTracks()[0].addEventListener('ended', () => stopBrowserRecording())
      recorder.start(1000); setIsRecording(true); setRecordingSeconds(0); timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch(e) { setError(e.message || 'Não foi possível iniciar a gravação.') }
  }
  function stopBrowserRecording() {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop())
    clearInterval(timerRef.current)
  }
  function copyCode() { navigator.clipboard.writeText(roomName); setNotice('Código copiado para a área de transferência.') }

  if (screen === 'room') return <div className="meeting-shell"><div className="meeting-top"><div className="brand-mini"><div className="logo-circle">DM</div><div><strong>DM Meet</strong><small>Sala: {roomName}</small></div></div><div className="meeting-actions"><button className="ghost" onClick={copyCode}>Copiar código</button>{!isRecording ? <button className="record" onClick={startBrowserRecording}>● Iniciar gravação</button> : <button className="record active" onClick={stopBrowserRecording}>■ Parar gravação {recordingSeconds}s</button>}<button className="danger" onClick={() => { stopBrowserRecording(); setToken(''); setScreen('home') }}>Sair</button></div></div>{error && <div className="meeting-error">{error}</div>}<LiveKitRoom video audio token={token} serverUrl={LIVEKIT_URL} data-lk-theme="default" style={{height:'calc(100vh - 82px)'}}><VideoConference /></LiveKitRoom></div>

  return <div className="app"><div className="bg"></div><header className="topbar"><button className="brand-button" onClick={()=>setScreen('home')}><div className="logo-circle">DM</div><div><h1>DM Meet</h1><p>Gestão Patrimonial</p></div></button><div className="top-actions"><button className="ghost" onClick={()=>setScreen('join')}>Entrar</button><button className="secondary" onClick={()=>setScreen('schedule')}>Agendar</button><button className="primary small" onClick={()=>setScreen('create')}>Nova reunião</button></div></header><main className="hero">
    {screen === 'home' && <section className="dashboard"><div className="glass-card hero-card"><span className="pill">Plataforma oficial DM</span><h2>Reuniões online com padrão executivo</h2><p>Crie reuniões imediatas ou agendadas, compartilhe tela, converse por chat e grave a reunião direto pelo navegador.</p><div className="actions"><button className="primary" onClick={()=>setScreen('create')}>Criar agora</button><button className="secondary" onClick={()=>setScreen('schedule')}>Agendar sala</button><button className="ghost" onClick={()=>setScreen('join')}>Entrar com código</button></div></div><div className="side-panel"><div className="stat-card"><b>🎥 Vídeo</b><span>LiveKit WebRTC</span></div><div className="stat-card"><b>🗓️ Agendamento</b><span>Código ativo no horário</span></div><div className="stat-card"><b>⏺️ Gravação</b><span>Download WEBM</span></div><div className="stat-card"><b>🔐 Cloudflare</b><span>Deploy automático</span></div></div>{recent.length > 0 && <div className="glass-card recent-wide"><h3>Reuniões criadas</h3><div className="room-grid">{recent.slice(0, 6).map(r => <button key={r.roomName} onClick={()=>{setRoomName(r.roomName); setScreen('join')}}><strong>{r.title}</strong><span>{r.roomName}</span><small>{r.scheduledAt ? `Agendada: ${formatDateTime(r.scheduledAt)}` : 'Reunião imediata'}</small></button>)}</div></div>}</section>}
    {(screen === 'create' || screen === 'schedule') && <section className="glass-card form-card"><button className="back" onClick={()=>setScreen('home')}>← Voltar</button><h2>{screen === 'schedule' ? 'Agendar reunião' : 'Criar reunião'}</h2><p>{screen === 'schedule' ? 'Defina o dia e a hora para o código ficar ativo.' : 'Abra uma sala imediatamente.'}</p><label>Nome da reunião</label><input value={roomTitle} onChange={e=>setRoomTitle(e.target.value)} placeholder="Ex: Assembleia condomínio" /><label>Seu nome</label><input value={participantName} onChange={e=>setParticipantName(e.target.value)} placeholder="Ex: Administração DM" />{screen === 'schedule' && <><label>Dia e hora da reunião</label><input type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)} /></>}{error && <div className="error">{error}</div>}{notice && <div className="success">{notice}</div>}<button className="primary full" disabled={loading} onClick={createMeeting}>{loading ? 'Processando...' : screen === 'schedule' ? 'Agendar sala' : 'Criar e entrar'}</button></section>}
    {screen === 'scheduled' && <section className="glass-card form-card center"><h2>Sala agendada ✅</h2><p>Envie este código para os participantes. Ele só ficará ativo no horário marcado.</p><div className="code-box">{roomName}</div>{notice && <div className="success">{notice}</div>}<div className="actions"><button className="primary" onClick={copyCode}>Copiar código</button><button className="secondary" onClick={()=>setScreen('home')}>Voltar ao início</button></div></section>}
    {screen === 'join' && <section className="glass-card form-card"><button className="back" onClick={()=>setScreen('home')}>← Voltar</button><h2>Entrar na reunião</h2><p>Digite o código da sala para participar.</p><label>Código da reunião</label><input value={roomName} onChange={e=>setRoomName(clean(e.target.value))} placeholder="Ex: dm-assembleia" /><label>Seu nome</label><input value={participantName} onChange={e=>setParticipantName(e.target.value)} placeholder="Seu nome" />{error && <div className="error">{error}</div>}{notice && <div className="success">{notice}</div>}<button className="primary full" disabled={loading} onClick={joinMeeting}>{loading ? 'Entrando...' : 'Entrar agora'}</button></section>}
  </main></div>
}
