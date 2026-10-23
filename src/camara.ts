
export async function iniciarCamaraDeFondo(video: HTMLVideoElement): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  return stream;
}

export function detenerCamaraDeFondo(video: HTMLVideoElement, stream: MediaStream | null): void {
  stream?.getTracks().forEach((pista) => pista.stop());
  video.srcObject = null;
}

export function describirErrorCamara(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "NotAllowedError") return "Bloqueaste el permiso de cámara. El visor sigue funcionando sin ella.";
    if (error.name === "NotFoundError") return "No se encontró ninguna cámara en el dispositivo.";
    if (error.name === "NotReadableError") return "La cámara está siendo usada por otra aplicación.";
    if (error.name === "TypeError") return "La cámara requiere una conexión segura (HTTPS o localhost).";
  }
  return "Error desconocido al intentar acceder a la cámara.";
}