// src/main.ts
import './style.css'
import heroImg from './assets/hero.png'
import typescriptLogo from './assets/typescript.svg'
import viteLogo from './assets/vite.svg'
import { setupCounter } from './counter.ts'
import { registerSW } from 'virtual:pwa-register'

import { abrirBaseDeDatos, encolarDescargas } from './db';
import { descargarPendientes, ETIQUETA_SYNC } from './descargas';
import { pedirPermisoNotificaciones, mostrarAviso } from './avisos';

import { crearVisor } from './visor'
import { iniciarControlOrientacion, pedirPermisoOrientacion, hayOrientacionReal } from './sensores'
import type { ControlOrientacion } from './sensores'
import { iniciarCamaraDeFondo, detenerCamaraDeFondo, describirErrorCamara } from './camara'
import { diagnosticarAR, mensajeSoporteAR, describirErrorAR, pedirSesionAR } from './xr';

const btnAR = document.getElementById("btn-ar") as HTMLButtonElement;
const estadoAR = document.getElementById("estado-ar") as HTMLElement;
const diagAR = document.getElementById("diag-ar") as HTMLElement;
const detallesAR = document.querySelector<HTMLDetailsElement>(".diag-ar")!;
const btnRecomprobar = document.getElementById("btn-recomprobar") as HTMLButtonElement;
const overlayAR = document.getElementById("xr-overlay") as HTMLElement;
const btnSalirAR = document.getElementById("btn-salir-ar") as HTMLButtonElement;

const MODELOS_IDS = ["modelo-demo-1", "modelo-demo-2", "modelo-demo-3"];

const dbLista = abrirBaseDeDatos();

registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    console.log('SW propio inyectado y registrado:', swUrl, registration);
  },
  onRegisterError(error) {
    console.error('Error al registrar el SW:', error);
  },
  onOfflineReady() {
    const estadoDescargaEl = document.getElementById("estado-descarga");
    if (estadoDescargaEl) estadoDescargaEl.textContent = "✓ La app ya funciona sin conexión.";
  }
});

window.addEventListener('appinstalled', async () => {
  await mostrarAviso("Atlas 3D instalado", "La aplicación ya está en tu pantalla de inicio.");
});

+navigator.serviceWorker?.addEventListener("message", (event) => {
  if (event.data?.tipo === "progreso") {
    pintarProgreso(event.data.hechos, event.data.total);
  } else if (event.data?.tipo === "descarga-completa") {
    const estadoDescargaEl = document.getElementById("estado-descarga");
    if (estadoDescargaEl) estadoDescargaEl.textContent = "✓ Todas las fichas guardadas: ya puedes consultarlas sin conexión.";
  }
});

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<section id="center">
  <div class="hero">
    <img src="${heroImg}" class="base" width="170" height="179">
    <img src="${typescriptLogo}" class="framework" alt="TypeScript logo"/>
    <img src="${viteLogo}" class="vite" alt="Vite logo" />
  </div>
  <div>
    <h1>Atlas 3D</h1>
    <p>Edit <code>src/main.ts</code> and save to test <code>HMR</code></p>
  </div>
  <button id="counter" type="button" class="counter"></button>
</section>

<div class="ticks"></div>

<!-- SECCIÓN VISOR (Actualizada con Video y CSS en línea) -->
<section id="visor-section" style="padding: 2rem; max-width: 800px; margin: 0 auto; text-align: center;">
  <h2>Visor de Modelos</h2>
  
  <style>
    .visor { position: relative; background: #0b1220; border-radius: 8px; overflow: hidden; }
    .fondo-camara { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .fondo-camara[hidden] { display: none; }
    .visor canvas { position: relative; z-index: 1; }
  </style>

  <div id="visor-container" class="visor" style="width: 100%; height: 400px; margin-bottom: 1rem; border: 1px solid #333;">
    <video id="fondo-camara" class="fondo-camara" playsinline muted hidden></video>
  </div>
  
  <div style="display: flex; gap: 1rem; justify-content: center; margin-bottom: 1rem;">
    <button id="btn-orientacion" class="counter">📱 Rotar con el teléfono</button>
    <button id="btn-calibrar" class="counter" disabled>Calibrar</button>
    <button id="btn-camara" class="counter">📷 Cámara de fondo</button>
  </div>
  <p id="div-mensajes" style="color: #ffaa00; font-weight: bold; min-height: 24px;"></p>
</section>

<div class="ticks"></div>

<!-- NUEVO - SESIÓN 37: AVISOS Y DESCARGAS EN SEGUNDO PLANO -->
<section style="padding: 2rem; max-width: 800px; margin: 0 auto; text-align: center; border-top: 1px solid #333;">
  <h2>Modo sin conexión</h2>
  <div style="display: flex; flex-direction: column; gap: 1rem; align-items: center; margin-top: 1rem;">
    <button id="btn-avisos" class="counter">🔔 Activar avisos</button>
    <button id="btn-descargar" class="counter">⬇️ Descargar fichas para usar sin conexión</button>
    <p id="estado-descarga" style="font-size: 0.9em; color: #888;">No hay descargas activas.</p>
  </div>
</section>

<section id="next-steps">
  <!-- (Código del footer intacto) ... -->
</section>
`

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)

// --------------------------------------------------------
// LÓGICA DE DESCARGAS Y NOTIFICACIONES (Sesión 37)
// --------------------------------------------------------
const btnAvisos = document.getElementById("btn-avisos") as HTMLButtonElement;
const btnDescargar = document.getElementById("btn-descargar") as HTMLButtonElement;
const estadoDescargaEl = document.getElementById("estado-descarga") as HTMLElement;

function pintarProgreso(hechos: number, total: number) {
  estadoDescargaEl.textContent = `Descargando: ${hechos} de ${total} fichas...`;
}

btnAvisos.addEventListener("click", async () => {
  const permiso = await pedirPermisoNotificaciones();
  if (permiso === "granted") {
    await mostrarAviso("Avisos activados", "Así te avisará el Atlas cuando terminen tus descargas.");
  } else {
    alert("No se activaron los avisos.");
  }
});

btnDescargar.addEventListener("click", async () => {
  try {
    const db = await dbLista;
    await encolarDescargas(db, MODELOS_IDS);
    pintarProgreso(0, MODELOS_IDS.length);
    btnDescargar.disabled = true;
    
    let enSegundoPlano = false;    
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register(ETIQUETA_SYNC);
        enSegundoPlano = true;
        estadoDescargaEl.textContent = "Descarga solicitada: el navegador la completará en cuanto haya red.";
      } catch (e) {
        enSegundoPlano = false; // El permiso pudo estar bloqueado[cite: 5]
      }
    }

    if (!enSegundoPlano) {
      await descargarPendientes(db, pintarProgreso);
      estadoDescargaEl.textContent = "✓ Todas las fichas guardadas (Plan B): ya puedes consultarlas sin conexión.";
    }
  } catch (err) {
    estadoDescargaEl.textContent = "No se pudo completar la descarga: " + (err instanceof Error ? err.message : String(err));
  } finally {
    btnDescargar.disabled = false;
  }
});

const contenedorVisor = document.getElementById("visor-container") as HTMLElement;
const videoFondo = document.getElementById("fondo-camara") as HTMLVideoElement;
const btnOrientacion = document.getElementById("btn-orientacion") as HTMLButtonElement;
const btnCalibrar = document.getElementById("btn-calibrar") as HTMLButtonElement;
const btnCamara = document.getElementById("btn-camara") as HTMLButtonElement;
const divMensajes = document.getElementById("div-mensajes") as HTMLElement;

const visor = crearVisor(contenedorVisor);
let control: ControlOrientacion | null = null;
let streamFondo: MediaStream | null = null;

function avisarVisor(mensaje: string) {
  divMensajes.textContent = mensaje;
}

function apagarSensores() {
  if (control) {
    control.detener();
    control = null;
  }
  visor.controlPorSensores(false);
  btnOrientacion.textContent = "📱 Rotar con el teléfono";
  btnCalibrar.disabled = true;
  avisarVisor("");
}

btnOrientacion.addEventListener("click", async () => {
  if (control) { apagarSensores(); return; }
  
  const permiso = await pedirPermisoOrientacion();
  if (permiso === "denied" || permiso === "no-soportado" || !(await hayOrientacionReal())) {
    avisarVisor("Sensores no disponibles o denegados. Usa el ratón o el dedo para girar el visor.");
    return;
  }
  
  visor.controlPorSensores(true);
  control = iniciarControlOrientacion((x, y) => visor.rotarHacia(x, y));
  btnOrientacion.textContent = "📱 Sensores: ACTIVOS (toca para apagar)";
  btnCalibrar.disabled = false;
  avisarVisor("");
});

btnCalibrar.addEventListener("click", () => {
  if (control) control.calibrar();
});

function apagarCamara() {
  detenerCamaraDeFondo(videoFondo, streamFondo);
  streamFondo = null;
  videoFondo.hidden = true;
  visor.fondoTransparente(false);
  btnCamara.textContent = "📷 Cámara de fondo";
}

btnCamara.addEventListener("click", async () => {
  if (streamFondo) { apagarCamara(); avisarVisor(""); return; }
  
  try {
    streamFondo = await iniciarCamaraDeFondo(videoFondo);
    videoFondo.hidden = false;
    visor.fondoTransparente(true);
    btnCamara.textContent = "📷 Cámara: ACTIVA (toca para apagar)";
    avisarVisor("");
  } catch (error) {
    avisarVisor(describirErrorCamara(error));
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && streamFondo) {
    apagarCamara();
    avisarVisor("La cámara se apagó al salir de la página. Vuelve a activarla cuando quieras.");
  }
});



let sesionAR: XRSession | null = null;

async function comprobarAR(): Promise<void> {
  const { estado, lineas } = await diagnosticarAR();
  estadoAR.textContent = mensajeSoporteAR(estado);
  diagAR.textContent = lineas.join("\n");
  if (!sesionAR) btnAR.disabled = estado !== "disponible";
  detallesAR.open = estado !== "disponible";
}
void comprobarAR();
btnRecomprobar.addEventListener("click", () => void comprobarAR());
navigator.xr?.addEventListener("devicechange", () => void comprobarAR());

btnAR.addEventListener("click", async () => {
  avisarVisor("");
  apagarCamara();
  apagarSensores();
  try {
    const sesion = await pedirSesionAR(overlayAR);
    sesionAR = sesion;
    btnAR.disabled = true;
    
    await visor.entrarEnAR(sesion, () => {
      sesionAR = null;
      btnAR.disabled = false;
      estadoAR.textContent = "La sesión de realidad aumentada terminó.";
    });

    estadoAR.textContent = sesion.domOverlayState
      ? "Sesión de realidad aumentada activa. Usa «Salir de AR» sobre la cámara."
      : "Sesión de realidad aumentada activa. Sal con el gesto de salida del sistema.";
  } catch (err) {
    sesionAR?.end().catch(() => {});
    sesionAR = null;
    btnAR.disabled = false;
    avisarVisor(describirErrorAR(err));
  }
});

btnSalirAR.addEventListener("click", () => {
  void sesionAR?.end();
});