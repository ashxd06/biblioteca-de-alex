"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listPdfs, downloadPdf, DriveFile } from "@/lib/drive";
import { savePdf, delPdf, downloaded, saveLibraryFolder, savedLibraryFolder } from "@/lib/store";
const mb=(n:number)=>(n/1048576).toFixed(1)+" MB";
export default function Lib(){
  const [folder,setFolder]=useState(""); const [files,setFiles]=useState<DriveFile[]>([]); const [err,setErr]=useState(""); const [off,setOff]=useState<Record<string,number>>({}); const [busy,setBusy]=useState("");
  const refresh=async()=>{ const o:Record<string,number>={}; (await downloaded()).forEach(d=>o[d.id]=d.size); setOff(o); };
  const scan=async(f=folder)=>{ setErr(""); try{ const found=await listPdfs(f); setFiles(found); await saveLibraryFolder(f); }catch(e:any){ setErr(e.message); } };
  useEffect(()=>{ void (async()=>{ const f=await savedLibraryFolder(); setFolder(f); refresh(); if(f) scan(f); })(); },[]);
  const dl=async(x:DriveFile)=>{ setBusy(x.id); try{ await savePdf(x.id, await downloadPdf(x.id)); await refresh(); }catch(e:any){ setErr(e.message);} setBusy(""); };
  return <main className="space-y-4"><Link href="/" className="text-sm text-mor">← Inicio</Link><h1 className="text-xl font-bold">Biblioteca</h1>
    <p className="text-sm text-neutral-400">Guarda una carpeta de Drive una vez y tu biblioteca se abrirá automáticamente en esta cuenta, también desde el celular.</p>
    <div className="flex gap-2"><input value={folder} onChange={e=>setFolder(e.target.value)} placeholder="Enlace o ID de carpeta/PDF/EPUB de Drive" className="flex-1 rounded-xl border border-line bg-card px-3 py-2"/>
      <button className="btn-p" onClick={()=>scan()}>Guardar y actualizar</button></div>
    {folder&&<p className="text-xs text-ok">Carpeta predeterminada guardada. Solo pega otro enlace si quieres cambiar de biblioteca.</p>}
    {err&&<p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{err}</p>}
    <ul className="space-y-2">{files.map(f=><li key={f.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-card p-3">
      <Link href={`/read/${f.id}?t=${encodeURIComponent(f.name.replace(/\.(pdf|epub)$/i,""))}&format=${/\.epub$/i.test(f.name)?"epub":"pdf"}`} className="min-w-0 flex-1 truncate">{f.name.replace(/\.(pdf|epub)$/i,"")}</Link>
      {off[f.id]!=null ? <button className="btn" onClick={async()=>{await delPdf(f.id);refresh()}}>Borrar ({mb(off[f.id])})</button>
        : <button className="btn" disabled={busy===f.id} onClick={()=>dl(f)}>{busy===f.id?"Descargando…":"Descargar"}</button>}</li>)}</ul>
  </main>;
}
