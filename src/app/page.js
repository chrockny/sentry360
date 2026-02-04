import Dashboard from "../components/Dashboard";

export default function Page() {
  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brandTitle">SYSTEM // SENTRY-360</div>
          <div className="brandSub">Guardian Ambiental IoT</div>
        </div>

        <div className="tagline">
          Detección temprana · Telemetría · Decisión rápida
        </div>
      </header>

      <section className="hero">
        <div className="heroPanel">
          <div className="heroKicker">CONTROL CONSOLE</div>
          <h1 className="heroTitle">Centro de monitoreo crítico</h1>
          <p className="heroText">
            SENTRY-360 nace como un “sistema nervioso” para entornos reales.
            Diseñado para calor extremo, gas, lluvia y fuego. Une sensores en campo (Arduino)
            con conectividad (ESP32) y nube (Firebase) para respuesta rápida.
          </p>

          <div className="heroGrid">
            <div className="miniCard">
              <div className="miniTitle">Problemática</div>
              <ul className="miniList">
                <li>Falta de monitoreo temprano</li>
                <li>Reacción tardía</li>
                <li>Sistemas desconectados</li>
              </ul>
            </div>

            <div className="miniCard">
              <div className="miniTitle">Qué soluciona</div>
              <ul className="miniList">
                <li>Centralización</li>
                <li>Alerta temprana</li>
                <li>Decisión basada en datos</li>
              </ul>
            </div>

            <div className="miniCard">
              <div className="miniTitle">Proyección futura</div>
              <ul className="miniList">
                <li>Más sensores</li>
                <li>IA / predicción</li>
                <li>Múltiples nodos</li>
                <li>Minería, industria, defensa civil, smart cities</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="heroBackdrop" aria-hidden="true">
          <div className="scanline" />
          <div className="gridGlow" />
        </div>
      </section>

      <section className="section">
        <div className="sectionHeader">
          <div className="sectionTitle">Dashboard en tiempo real</div>
          <div className="sectionHint">Lectura directa desde Firebase (polling simple)</div>
        </div>

        <Dashboard />
      </section>

      <footer className="footer">
        <div className="footerLine" />
        <div className="footerText">
          SENTRY-360 · Telemetría industrial · Consola de control
        </div>
      </footer>
    </main>
  );
}
