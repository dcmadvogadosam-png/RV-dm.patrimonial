
export default function App() {
  return (
    <div className="app">
      <div className="overlay"></div>

      <header className="topbar">
        <div className="logo">
          <div className="logo-circle">DM</div>
          <div>
            <h1>DM Meet</h1>
            <p>Gestão Patrimonial</p>
          </div>
        </div>

        <button className="btn">Entrar</button>
      </header>

      <main className="hero">
        <div className="card">
          <h2>Reuniões Online Profissionais</h2>

          <p>
            Plataforma personalizada da DM Gestão Patrimonial
            para videoconferências, assembleias e reuniões.
          </p>

          <div className="actions">
            <button className="primary">
              Nova Reunião
            </button>

            <button className="secondary">
              Entrar com Código
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
