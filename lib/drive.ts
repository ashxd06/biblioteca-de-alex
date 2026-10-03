import { driveAccessToken } from "./supabase";

const headers = async () => ({ Authorization: "Bearer " + await driveAccessToken() });
export type DriveFile = { id:string; name:string; size?:string };
type DriveInput = { id:string; kind:"file"|"folder" };

function parseDriveInput(input:string): DriveInput {
  const value = input.trim();
  const match = value.match(/\/folders\/([\w-]+)/) || value.match(/\/file\/d\/([\w-]+)/);
  if (match) return { id:match[1], kind:value.includes("/file/d/") ? "file" : "folder" };
  return { id:value, kind:"folder" };
}

export async function listPdfs(input:string): Promise<DriveFile[]> {
  if(!navigator.onLine) throw new Error("Sin conexión: no se puede leer Drive.");
  if(!input.trim()) throw new Error("Pega el enlace o ID de una carpeta o PDF de Drive antes de detectar los archivos.");
  const target = parseDriveInput(input);
  if(target.kind === "file") {
    const r = await fetch(`https://www.googleapis.com/drive/v3/files/${target.id}?fields=id,name,size,mimeType`, { headers:await headers() });
    if(r.status===401||r.status===403) throw new Error("Drive no dio permiso o el acceso venció. Vuelve a entrar con Google y acepta el permiso de Drive.");
    if(r.status===404) throw new Error("No encuentro este archivo en Drive. Comprueba el enlace y que tu cuenta de Google tenga acceso.");
    if(!r.ok) throw new Error("No se pudo leer este archivo de Drive.");
    const file = await r.json();
    if(file.mimeType !== "application/pdf") throw new Error("El enlace no apunta a un PDF.");
    return [file];
  }
  const q = encodeURIComponent(`'${target.id}' in parents and mimeType='application/pdf' and trashed=false`);
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
