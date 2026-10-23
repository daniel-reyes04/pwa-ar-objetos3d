export type SoporteAR = "disponible" | "contexto-inseguro" | "sin-webxr" | "sin-ar";

export async function diagnosticarAR(): Promise<{ estado: SoporteAR; lineas: string[] }> {
  const lineas: string[] = [];
  const seguro = window.isSecureContext;
  lineas.push(`Contexto seguro (HTTPS o localhost): ${seguro ? "sí" : "NO"}`);
  if (!seguro) return { estado: "contexto-inseguro", lineas };

  lineas.push(`navigator.xr: ${navigator.xr ? "presente" : "AUSENTE"}`);
  if (!navigator.xr) return { estado: "sin-webxr", lineas };

  try {
    const ok = await navigator.xr.isSessionSupported("immersive-ar");
    lineas.push(`isSessionSupported("immersive-ar"): ${ok}`);
    return { estado: ok ? "disponible" : "sin-ar", lineas };
  } catch (err) {
    lineas.push(`isSessionSupported("immersive-ar") lanzó: ${err instanceof Error ? err.name : String(err)}`);
    return { estado: "sin-ar", lineas };
  }
}

export function mensajeSoporteAR(estado: SoporteAR): string {
  switch (estado) {
    case "disponible":
      return "Este dispositivo puede abrir una sesión de realidad aumentada.";
    case "contexto-inseguro":
      return "La realidad aumentada exige HTTPS o localhost.";
    case "sin-webxr":
      return "Este navegador no ofrece WebXR (por ejemplo, Safari en iPhone o Firefox). El visor 3D sigue funcionando.";
    case "sin-ar":
      return "Este dispositivo no admite realidad aumentada en el navegador (por ejemplo, un computador de escritorio sin el emulador activado).";
  }
}

export function pedirSesionAR(overlay: HTMLElement | null): Promise<XRSession> {
  const opciones: XRSessionInit & { domOverlay?: { root: Element } } = {
    requiredFeatures: ["local"],
    optionalFeatures: ["dom-overlay"],
  };
  if (overlay) opciones.domOverlay = { root: overlay };
  return navigator.xr!.requestSession("immersive-ar", opciones);
}

export function describirErrorAR(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "NotSupportedError") return "Este dispositivo no puede abrir realidad aumentada con las funciones que pide la app.";
    if (err.name === "SecurityError") return "El navegador rechazó la sesión de realidad aumentada: se denegó el permiso o la petición no vino de un toque del usuario.";
    return `No se pudo iniciar la realidad aumentada: ${err.message}`;
  }
  return "No se pudo iniciar la realidad aumentada. Inténtalo de nuevo.";
}