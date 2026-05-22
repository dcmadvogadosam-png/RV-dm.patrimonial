import { useMemo, useState } from 'react'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import { supabase } from './supabase'

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL

function clean(value) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')
}
function code() { return `dm-${Math.random().toString(36).slice(2,8)}` }
function rooms() { return JSON.parse(localStorage.getItem('dm_meet_rooms') || '[]') }
function save(room) {
  const list = rooms().filter(r => r.roomName !== room.roomName)
  localStorage.setItem('dm_meet_rooms', JSON.stringify([room, ...list].slice(0, 20)))
}

export default function App() {
  const [screen, setScreen] = useState('home')
  const [roomName, setRoomName] = useState('')
  const [roomTitle, setRoomTitle] = useState('')
  const [participantName, setParticipantName] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const recent = useMemo(() => rooms(), [screen])

  async function register(nextRoomName, title) {
    const room = { roomName: nextRoomName, title: title || 'Reunião DM', createdAt: new Date().toISOString() }
    save(room)
    if (supabase) {
      await supabase.from('dm_meet_rooms').upsert({
        room_name: room.roomName, title: room.title, created_by: participantName || 'DM', created_at: room.createdAt
      }, { onConflict: 'room_name' })
    }
  }

  async function getToken(nextRoomName, name) {
    const res = await fetch('/api/livekit-token', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ roomName: nextRoomName, participantName: name })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erro ao conectar.')
    return data.token
  }

  async function start(mode) {
    setError('')
    setLoading(true)
    try {
      const name = participantName.trim() || 'Convidado DM'
      let rn = roomName.trim()
      if (mode === 'new') {
        rn = clean(roomTitle || code())
        if (!rn || rn.length < 3) rn = code()
        await register(rn, roomTitle || 'Reunião DM')
      }
      if (!rn) throw new Error('Digite o código da reunião.')
      const tk = await getToken(rn, name)
      setRoomName(rn); setParticipantName(name); setToken(tk); setScreen('room')
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  if (screen === 'room') return (
    <div className="meeting-shell">
      <div className="meeting-top">
        <div className="brand-mini"><div className="logo-circle">DM</div><div><strong>DM Meet</strong><small>Sala: {roomName}</small></div></div>
        <button className="danger" onClick={() => { setToken(''); setScreen('home') }}>Sair da reunião</button>
      </div>
      <LiveKitRoom video audio token={token} serverUrl={LIVEKIT_URL} data-lk-theme="default" style={{height:'calc(100vh - 82px)'}}>
        <VideoConference />
      </LiveKitRoom>
    </div>
  )

  return (
    <div className="app"><div className="bg"></div>
      <header className="topbar">
        <button className="brand-button" onClick={()=>setScreen('home')}><div className="logo-circle">DM</div><div><h1>DM Meet</h1><p>Gestão Patrimonial</p></div></button>
        <div className="top-actions"><button className="ghost" onClick={()=>setScreen('join')}>Entrar</button><button className="primary small" onClick={()=>setScreen('create')}>Nova reunião</button></div>
      </header>
      <main className="hero">
        {screen === 'home' && <section className="glass-card big-card">
          <span className="pill">Plataforma oficial DM</span>
          <h2>Reuniões Online Profissionais</h2>
          <p>Crie salas para assembleias, reuniões administrativas, atendimentos e encontros online com áudio, vídeo, chat e compartilhamento de tela.</p>
          <div className="actions"><button className="primary" onClick={()=>setScreen('create')}>Criar nova reunião</button><button className="secondary" onClick={()=>setScreen('join')}>Entrar com código</button></div>
          <div className="features"><div>🎥 Vídeo HD</div><div>🎙️ Áudio</div><div>💬 Chat</div><div>🖥️ Compartilhar tela</div></div>
        </section>}

        {screen === 'create' && <section className="glass-card form-card">
          <button className="back" onClick={()=>setScreen('home')}>← Voltar</button><h2>Criar reunião</h2><p>Preencha os dados para abrir uma sala DM Meet.</p>
          <label>Nome da reunião</label><input value={roomTitle} onChange={e=>setRoomTitle(e.target.value)} placeholder="Ex: Assembleia condomínio" />
          <label>Seu nome</label><input value={participantName} onChange={e=>setParticipantName(e.target.value)} placeholder="Ex: Administração DM" />
          {error && <div className="error">{error}</div>}
          <button className="primary full" disabled={loading} onClick={()=>start('new')}>{loading ? 'Criando...' : 'Criar e entrar'}</button>
        </section>}

        {screen === 'join' && <section className="glass-card form-card">
          <button className="back" onClick={()=>setScreen('home')}>← Voltar</button><h2>Entrar na reunião</h2><p>Digite o código da sala para participar.</p>
          <label>Código da reunião</label><input value={roomName} onChange={e=>setRoomName(clean(e.target.value))} placeholder="Ex: dm-reuniao" />
          <label>Seu nome</label><input value={participantName} onChange={e=>setParticipantName(e.target.value)} placeholder="Seu nome" />
          {error && <div className="error">{error}</div>}
          <button className="primary full" disabled={loading} onClick={()=>start('join')}>{loading ? 'Entrando...' : 'Entrar agora'}</button>
          {recent.length > 0 && <div className="recent"><h3>Reuniões recentes</h3>{recent.map(r=><button key={r.roomName} onClick={()=>{setRoomName(r.roomName); setRoomTitle(r.title)}}><strong>{r.title}</strong><span>{r.roomName}</span></button>)}</div>}
        </section>}
      </main>
    </div>
  )
}
