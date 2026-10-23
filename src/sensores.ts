// src/sensores.ts

export const GRADOS_A_RAD = Math.PI / 180;

function limitar(valor: number, min: number, max: number) {
  return Math.max(min, Math.min(max, valor));
}

export interface ControlOrientacion {
  calibrar: () => void;
  detener: () => void;
}

// 1. Manejo de permisos (Caso especial de iOS 13+)
export async function pedirPermisoOrientacion(): Promise<"granted" | "denied" | "no-soportado"> {
  if (typeof window === "undefined" || !window.DeviceOrientationEvent) {
    return "no-soportado";
  }

  // Comprueba si el navegador requiere una solicitud explícita (iOS Safari)
  if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
    try {
      const estado = await (DeviceOrientationEvent as any).requestPermission();
      return estado === 'granted' ? 'granted' : 'denied';
    } catch (error) {
      console.error("Error al pedir permiso de sensores:", error);
      return "denied";
    }
  }

  // Android y computadores no requieren requestPermission explícito
  return "granted"; 
}

// 2. Detección de hardware real
export function hayOrientacionReal(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!window.DeviceOrientationEvent) {
      resolve(false);
      return;
    }

    // Escucha durante 500ms; si no hay datos válidos, el equipo no tiene sensores reales
    const timeout = setTimeout(() => {
      window.removeEventListener("deviceorientation", comprobador);
      resolve(false);
    }, 500);

    const comprobador = (e: DeviceOrientationEvent) => {
      // Si beta o gamma arrojan números (no null), el sensor existe y transmite
      if (e.beta !== null && e.gamma !== null) {
        clearTimeout(timeout);
        window.removeEventListener("deviceorientation", comprobador);
        resolve(true);
      }
    };

    window.addEventListener("deviceorientation", comprobador);
  });
}

// 3. Control y transformación de ángulos absolutos a relativos (Sesión 35)
export function iniciarControlOrientacion(
  onRotacion: (rotX: number, rotY: number) => void,
  intervaloMs = 33
): ControlOrientacion {
  let referencia: { beta: number; gamma: number } | null = null;
  let ultimaLectura: { beta: number; gamma: number } | null = null;
  let ultimoAviso = 0;

  const manejador = (e: DeviceOrientationEvent) => {
    if (e.beta === null || e.gamma === null) return;
    ultimaLectura = { beta: e.beta, gamma: e.gamma };
    
    // La primera lectura pasa a ser el centro (cero)
    if (!referencia) referencia = { ...ultimaLectura };       
    
    const ahora = performance.now();
    if (ahora - ultimoAviso < intervaloMs) return; // Limita a ~30 lecturas por segundo
    ultimoAviso = ahora;
    
    // Evita inestabilidades y bloqueos de cardán limitando el rango
    const dBeta  = limitar(e.beta  - referencia.beta,  -90, 90);
    const dGamma = limitar(e.gamma - referencia.gamma, -90, 90);
    
    // Envía la rotación convertida a radianes
    onRotacion(dBeta * GRADOS_A_RAD, dGamma * GRADOS_A_RAD);   
  };

  window.addEventListener("deviceorientation", manejador);
  
  return {
    calibrar() {
      // Ajusta la referencia a la posición actual del dispositivo
      referencia = ultimaLectura ? { ...ultimaLectura } : null;
      onRotacion(0, 0);       
    },
    detener() { 
      window.removeEventListener("deviceorientation", manejador); 
    },
  };
}