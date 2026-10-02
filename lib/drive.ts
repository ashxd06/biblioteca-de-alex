const H = () => ({ Authorization: "Bearer " + localStorage.getItem("gtoken") });
export type DriveFile = { id:string; name:string; size?:string };
export async function listPdfs(folderId:string): Promise<DriveFile[]> {
  if(!navigator.onLine) throw new Error("Sin conexión: no se puede leer Drive.");
  const q = encodeURIComponent(`'${folderId}' in parents and mimeType='application/pdf' and trashed=false`);
  const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,size)&pageSize=200&orderBy=name`, { headers:H() });
  if(r.status===401||r.status===403) throw new Error("Drive no dio permiso. Cierra sesión e inicia con Google otra vez.");
  if(!r.ok) throw new Error("No se pudo leer la carpeta de Drive.");
  return (await r.json()).files;
}
export async function downloadPdf(id:string): Promise<Blob> {
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, { headers:H() });
  if(!r.ok) throw new Error("No se pudo descargar el archivo de Drive.");
  return r.blob();
}
