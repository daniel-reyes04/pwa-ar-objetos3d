
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function crearVisor(contenedor: HTMLElement) {
  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(75, contenedor.clientWidth / contenedor.clientHeight, 0.1, 1000);
  
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(contenedor.clientWidth, contenedor.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  contenedor.appendChild(renderer.domElement);

  const controles = new OrbitControls(camara, renderer.domElement);
  controles.enableDamping = true;

  const geometria = new THREE.BoxGeometry(1.6, 1.6, 1.6);
  const material = new THREE.MeshBasicMaterial({ color: 0xffcc29, wireframe: false });
  const grupo = new THREE.Mesh(geometria, material);
  escena.add(grupo);

  camara.position.set(0, 0, 3);

  let animacion: number = 0;
  let porSensores = false;

  function bucle() {
    animacion = requestAnimationFrame(bucle);
    controles.update();
    if (!porSensores) {
      grupo.rotation.y += 0.005;
    }
    renderer.render(escena, camara);
  }
  bucle();

  function ajustarTamano() {
    camara.aspect = contenedor.clientWidth / contenedor.clientHeight;
    camara.updateProjectionMatrix();
    renderer.setSize(contenedor.clientWidth, contenedor.clientHeight);
  }
  window.addEventListener('resize', ajustarTamano);

  async function entrarEnAR(sesion: XRSession, alTerminar: () => void) {
    cancelAnimationFrame(animacion);
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local");
    await renderer.xr.setSession(sesion);

    const fondoPrevio = escena.background;
    escena.background = null;
    controles.enabled = false;
    
    const posicionPrevia = grupo.position.clone();
    const escalaPrevia = grupo.scale.clone();
    grupo.position.set(0, -0.2, -1.5);
    grupo.scale.setScalar(0.25);

    renderer.setAnimationLoop(() => {
      grupo.rotation.y += 0.01;
      renderer.render(escena, camara);
    });

    sesion.addEventListener(
      "end",
      () => {
        renderer.setAnimationLoop(null);
        renderer.xr.enabled = false;
        escena.background = fondoPrevio;
        controles.enabled = !porSensores;
        grupo.position.copy(posicionPrevia);
        grupo.scale.copy(escalaPrevia);
        grupo.rotation.set(0, 0, 0);
        ajustarTamano();
        bucle();
        alTerminar();
      },
      { once: true }
    );
  }

  return {
    rotarHacia(x: number, y: number) {
      grupo.rotation.y = x;
      grupo.rotation.x = y;
    },
    controlPorSensores(activo: boolean) {
      porSensores = activo;
      controles.enabled = !activo;
    },
    fondoTransparente(transparente: boolean) {
      renderer.setClearAlpha(transparente ? 0 : 1);
    },
    entrarEnAR
  };
}