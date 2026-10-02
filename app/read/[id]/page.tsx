"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getPdf, savePdf, getProgress, saveProgress, saveNote, allNotes, Note } from "@/lib/store";
import { downloadPdf } from "@/lib/drive";
type Ln = { text:string; x:number; y:number; w:number; h:number };
export default function Reader(){
  const id = useParams().id as string; const title = useSearchParams().get("t") || id;
  const cv = useRef<HTMLCanvasElement>(null); const box = useRef<HTMLDivElement>(null);
  const [doc,setDoc]=useState<any>(null); const [page,setPage]=useState(1); const [line,setLine]=useState(1); const [lines,setLines]=useState<Ln[]>([]);
  const [zoom,setZoom]=useState(1.3); const [msg,setMsg]=useState(""); const [err,setErr]=useState(""); const [notes,setNotes]=useState<Note[]>([]);
  useEffect(()=>{(async()=>{ try{
    const pdfjs:any = await import("pdfjs-dist"); pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    let blob = await getPdf(id); if(!blob){ blob = await downloadPdf(id); await savePdf(id, blob); }
    const d = await pdfjs.getDocument({ data: await blob.arrayBuffer() }).promise; setDoc(d);
    const p = await getProgress(id); if(p){ setPage(p.page); setLine(p.line); setMsg(`Continuar desde página ${p.page}, línea ${p.line}`); setTimeout(()=>setMsg(""),3500); }
    setNotes((await allNotes()).filter(n=>n.bookId===id));
  }catch(e:any){ setErr(e.message||"No se pudo abrir el PDF (¿sin conexión o sin permiso de Drive?)"); } })()},[id]);
  useEffect(()=>{ if(!doc) return; (async()=>{
    const pg = await doc.getPage(page); const vp = pg.getViewport({ scale: zoom }); const c = cv.current!;
    c.width = vp.width; c.height = vp.height; await pg.render({ canvasContext: c.getContext("2d")!, viewport: vp }).promise;
    const tc = await pg.getTextContent(); const rows: Record<number,Ln> = {};
    for(const it of tc.items as any[]){ if(!it.str.trim()) continue; const [x,y] = vp.convertToViewportPoint(it.transform[4], it.transform[5]); const k = Math.round(y/4);
      const w = it.width*zoom, h = it.height*zoom; const r = rows[k];
      if(r){ r.text += " "+it.str; r.w = Math.max(r.w, x+w-r.x); r.x = Math.min(r.x,x); } else rows[k] = { text:it.str, x, y:y-h, w, h }; }
    setLines(Object.values(rows).sort((a,b)=>a.y-b.y));
  })() },[doc,page,zoom]);
  const mark=(p:number,l:number)=>{ setPage(p); setLine(l); saveProgress({ bookId:id, title, page:p, line:l, total:doc?.numPages||1, updated:Date.now() }); };
  const cur = lines[line-1];
  if(err) return <p className="rounded-xl border border-red-500/40 p-3 text-red-300">{err} <Link href="/library" className="underline">Volver</Link></p>;
  return <main className="space-y-3"><div className="flex items-center justify-between"><Link href="/library" className="text-sm text-mor">← Biblioteca</Link>
    <span className="text-sm text-neutral-400">Pág. {page} / {doc?.numPages||"…"}</span></div>
    {msg&&<p className="rounded-xl bg-ok/15 p-2 text-center text-sm text-ok">{msg}</p>}
    {notes.filter(n=>n.page===page).map(n=><p key={n.id} className="rounded-xl bg-mor/15 p-2 text-sm">📝 Línea {n.line}: {n.text}</p>)}
    <div ref={box} className="relative mx-auto w-fit max-w-full overflow-auto bg-white">
      <canvas ref={cv}/>
      {lines.map((l,i)=><div key={i} onClick={()=>mark(page,i+1)} title={l.text} className={`absolute cursor-pointer ${i+1===line?"bg-yellow-300/40":"hover:bg-mor/20"}`} style={{left:l.x,top:l.y,width:l.w,height:l.h*1.2}}/>)}</div>
    <p className="text-center text-xs text-neutral-400">Toca una línea para guardarla ({lines.length?`línea ${line} de ${lines.length}`:"sin texto detectado — OCR pendiente"})</p>
    <div className="grid grid-cols-2 gap-3"><button className="btn-p py-5 text-lg" disabled={page<=1} onClick={()=>mark(page-1,1)}>◀ Retroceder</button>
      <button className="btn-p py-5 text-lg" disabled={page>=(doc?.numPages||1)} onClick={()=>mark(page+1,1)}>Avanzar ▶</button></div>
    <div className="flex gap-2"><button className="btn" onClick={()=>setZoom(z=>Math.max(.6,z-.2))}>−</button><button className="btn" onClick={()=>setZoom(z=>z+.2)}>+ Zoom</button>
      <button className="btn" onClick={()=>box.current?.requestFullscreen()}>Pantalla completa</button>
      <button className="btn flex-1" onClick={async()=>{ const t=prompt(`Nota para página ${page}, línea ${line}`); if(!t) return; const n={id:crypto.randomUUID(),text:t,bookId:id,page,line,updated:Date.now()}; await saveNote(n); setNotes(x=>[n,...x]); }}>+ Nota en esta línea</button></div>
  </main>;
}
