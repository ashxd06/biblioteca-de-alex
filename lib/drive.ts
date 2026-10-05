import { driveAccessToken } from "./supabase";

const headers = async () => ({ Authorization: "Bearer " + await driveAccessToken() });
export type DriveFile = { id:string; name:string; size?:string; mimeType?:string };
export type DriveInput = { id:string; kind:"file"|"folder" };

export function parseDriveInput(input:string): DriveInput {
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
    if(file.mimeType !== "application/pdf" && file.mimeType !== "application/epub+zip") throw new Error("El enlace debe apuntar a un PDF o EPUB.");
    return [file];
  }
  return listBooks(target.id);
}
export async function downloadPdf(id:string): Promise<Blob> {
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, { headers:await headers() });
  if(r.status===401||r.status===403) throw new Error("Drive no dio permiso o el acceso venció. Vuelve a entrar con Google y acepta el permiso de Drive.");
  if(!r.ok) throw new Error("No se pudo descargar el PDF de Drive.");
  return r.blob();
}

/* ------------------------------------------------------------------ */
/* Colecciones / novelas: cada subcarpeta de la carpeta principal      */
/* ------------------------------------------------------------------ */
export type DriveCollection = { id:string; name:string; files:DriveFile[] };
export type DriveLibrary = {
  rootId:string;
  kind:"file"|"folder";
  collections:DriveCollection[]; // una por subcarpeta, detectadas automáticamente
  looseFiles:DriveFile[];        // archivos que están directamente en la carpeta principal
};

const FILES_URL = "https://www.googleapis.com/drive/v3/files";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const BOOK_MIMES = "(mimeType='application/pdf' or mimeType='application/epub+zip')";
const PERMISSION_ERROR = "Drive no dio permiso o el acceso venció. Vuelve a entrar con Google y acepta el permiso de Drive.";

// Orden natural: "Volumen 2" va antes que "Volumen 10".
const collator = new Intl.Collator("es", { numeric:true, sensitivity:"base" });
export const naturalCompare = (a:string, b:string) => collator.compare(a, b);

export const bookTitle = (name:string) => name.replace(/\.(pdf|epub)$/i, "");
export const bookFormat = (f:DriveFile): "pdf"|"epub" =>
  f.mimeType === "application/epub+zip" || /\.epub$/i.test(f.name) ? "epub" : "pdf";

// GET a la API de Drive con los mismos mensajes de error de siempre y reintentos si Drive limita el ritmo.
async function driveGet(url:string, failure:string, notFound?:string): Promise<Response> {
  if(!navigator.onLine) throw new Error("Sin conexión: no se puede leer Drive.");
  for(let attempt = 0; ; attempt++) {
    const r = await fetch(url, { headers:await headers() });
    if(r.status === 401) throw new Error(PERMISSION_ERROR);
    const limited = r.status === 429 || r.status >= 500 || (r.status === 403 && /ratelimit/i.test(await r.clone().text()));
    if(limited && attempt < 3) { await new Promise(done => setTimeout(done, 400 * (attempt + 1))); continue; }
    if(r.status === 403) throw new Error(PERMISSION_ERROR);
    if(r.status === 404 && notFound) throw new Error(notFound);
    if(!r.ok) throw new Error(failure);
    return r;
  }
}

// Lista todos los resultados de una consulta, siguiendo la paginación de Drive.
async function listFiles(q:string): Promise<DriveFile[]> {
  const files:DriveFile[] = [];
  let pageToken = "";
  do {
    const url = `${FILES_URL}?q=${encodeURIComponent(q)}`
      + `&fields=${encodeURIComponent("nextPageToken,files(id,name,size,mimeType)")}`
      + `&pageSize=1000&orderBy=name&supportsAllDrives=true&includeItemsFromAllDrives=true`
      + (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");
    const data = await (await driveGet(url, "No se pudo leer la carpeta de Drive.")).json();
    files.push(...(data.files || []));
    pageToken = data.nextPageToken || "";
  } while(pageToken);
  return files;
}

// PDF y EPUB que están directamente dentro de una carpeta, en orden natural.
export async function listBooks(folderId:string): Promise<DriveFile[]> {
  const files = await listFiles(`'${folderId}' in parents and ${BOOK_MIMES} and trashed=false`);
  return files.sort((a, b) => naturalCompare(a.name, b.name));
}

// Subcarpetas directas de una carpeta.
async function listFolders(parentId:string): Promise<DriveFile[]> {
  const folders = await listFiles(`'${parentId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`);
  return folders.sort((a, b) => naturalCompare(a.name, b.name));
}

// Nombre real de una carpeta (para el encabezado de la novela).
export async function getFolderName(folderId:string): Promise<string> {
  const r = await driveGet(
    `${FILES_URL}/${folderId}?fields=id,name&supportsAllDrives=true`,
    "No se pudo leer la carpeta de Drive.",
    "No encuentro esta carpeta en Drive. Comprueba que tu cuenta de Google tenga acceso."
  );
  return (await r.json()).name as string;
}

async function mapLimit<T, R>(items:T[], limit:number, fn:(item:T) => Promise<R>): Promise<R[]> {
  const out:R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length:Math.min(limit, items.length) }, async () => {
    while(next < items.length) { const i = next++; out[i] = await fn(items[i]); }
  }));
  return out;
}

// Detecta las novelas: cada subcarpeta de la carpeta guardada es una colección.
// Si la entrada es un archivo suelto (comportamiento anterior), se devuelve tal cual.
export async function listLibrary(input:string): Promise<DriveLibrary> {
  if(!navigator.onLine) throw new Error("Sin conexión: no se puede leer Drive.");
  if(!input.trim()) throw new Error("Pega el enlace o ID de una carpeta o PDF de Drive antes de detectar los archivos.");
  const target = parseDriveInput(input);
  if(target.kind === "file") return { rootId:target.id, kind:"file", collections:[], looseFiles:await listPdfs(input) };
  const [folders, looseFiles] = await Promise.all([listFolders(target.id), listBooks(target.id)]);
  const collections = await mapLimit(folders, 4, async f => ({ id:f.id, name:f.name, files:await listBooks(f.id) }));
  return { rootId:target.id, kind:"folder", collections, looseFiles };
}
