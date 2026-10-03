import { driveAccessToken } from "./supabase";

const headers = async () => ({ Authorization: "Bearer " + await driveAccessToken() });
export type DriveFile = { id:string; name:string; size?:string };
export async function listPdfs(folderId:string): Promise<DriveFile[]> {
  if(!navigator.onLine) throw new Error("Sin conexión: no se puede leer Drive.");
  if(!folderId.trim()) throw new Error("Pega el ID de una carpeta de Drive antes de detectar los PDF.");
  const q = encodeURIComponent(`'${folderId}' in parents and mimeType='application/pdf' and trashed=false`);
  const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,size)&pageSize=200&orderBy=name`, { headers:await headers() });
  if(r.status===401||r.status===403) throw new Error("Drive no dio permiso o el acceso venció. Vuelve a entrar con Google y acepta el permiso de Drive.");
  if(!r.ok) throw new Error("No se pudo leer la carpeta de Drive.");
  return (await r.json()).files;
}
export async function downloadPdf(id:string): Promise<Blob> {
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, { headers:await headers() });
  if(r.status===401||r.status===403) throw new Error("Drive no dio permiso o el acceso venció. Vuelve a entrar con Google y acepta el permiso de Drive.");
  if(!r.ok) throw new Error("No se pudo descargar el PDF de Drive.");
  if(!r.headers.get("content-type")?.includes("pdf")) throw new Error("Drive no devolvió un PDF válido.");
  return r.blob();
}
