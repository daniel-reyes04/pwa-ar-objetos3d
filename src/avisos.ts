export async function pedirPermisoNotificaciones(): Promise<string> {
  if (!("Notification" in window)) return "no-soportado";
  return await Notification.requestPermission();
}

export function estadoAvisos(): string {
  if (!("Notification" in window)) return "no-soportado";
  return Notification.permission;
}

export async function mostrarAviso(titulo: string, cuerpo: string, url = "/", tag = "atlas-aviso"): Promise<boolean> {
  if (estadoAvisos() !== "granted") return false;
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification(titulo, {
    body: cuerpo,
    icon: "/iconos/icon-192.png",
    tag,
    data: { url },
  });
  return true;
}