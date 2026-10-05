"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getPdf, savePdf, getProgress, saveProgress, saveNote, allNotes, Note } from "@/lib/store";
import { downloadPdf } from "@/lib/drive";
import EpubReader from "./epub-reader";
type Ln = { text:string; x:number; y:number; w:number; h:number };
export default function Reader(){
  const id = useParams().id as string; const params=useSearchParams(); const title = params.get("t") || id;
  const from=params.get("from"); const back=from?`/library/${encodeURIComponent(from)}`:"/library";
  if(params.get("format")==="epub") return <EpubReader id={id} title={title} back={back}/>;
  const cv = useRef<HTMLCanvasElement>(null); const box = useRef<HTMLDivElement>(null);
  const utterance = useRef<SpeechSynthesisUtterance|null>(null); const [asEpub,setAsEpub]=useState(false);
  const [doc,setDoc]=useState<any>(null); const [page,setPage]=useState(1); const [line,setLine]=useState(1); const [lines,setLines]=useState<Ln[]>([]);
  const [zoom,setZoom]=useState(1.3); const [msg,setMsg]=useState(""); const [err,setErr]=useState(""); const [notes,setNotes]=useState<Note[]>([]);
  const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]); const [voiceName,setVoiceName]=useState(""); const [rate,setRate]=useState(1); const [speaking,setSpeaking]=useState(false); const [paused,setPaused]=useState(false);
  useEffect(()=>{(async()=>{ try{
    const pdfjs:any = await import("pdfjs-dist"); pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    let blob = await getPdf(id); if(!blob){ blob = await downloadPdf(id); await savePdf(id, blob); }
    const head=new Uint8Array(await blob.slice(0,4).arrayBuffer()); if(head[0]===0x50&&head[1]===0x4b){ setAsEpub(true); return; } // un EPUB es un ZIP ("PK"): se abrió sin ?format=epub (p. ej. desde Inicio)
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
  useEffect(()=>{
    if(!("speechSynthesis" in window)) return;
    const load=()=>{ const available=window.speechSynthesis.getVoices(); setVoices(available); setVoiceName(current=>current||localStorage.getItem("reader-voice")||available.find(v=>v.lang.toLowerCase().startsWith("es"))?.name||available[0]?.name||""); const savedRate=Number(localStorage.getItem("reader-rate")); if([.75,1,1.25,1.5].includes(savedRate)) setRate(savedRate); };
    load(); window.speechSynthesis.addEventListener("voiceschanged",load);
    return()=>{ window.speechSynthesis.removeEventListener("voiceschanged",load); window.speechSynthesis.cancel(); };
  },[]);
  useEffect(()=>{ if(speaking) { window.speechSynthesis.cancel(); setSpeaking(false); setPaused(false); } },[page]);
  const mark=(p:number,l:number)=>{ setPage(p); setLine(l); saveProgress({ bookId:id, title, page:p, line:l, total:doc?.numPages||1, updated:Date.now() }); };
  const changeVoice=(name:string)=>{ setVoiceName(name); localStorage.setItem("reader-voice",name); };
  const changeRate=(value:number)=>{ setRate(value); localStorage.setItem("reader-rate",String(value)); };
  const listen=()=>{
    if(!("speechSynthesis" in window)){ setMsg("Este navegador no tiene lectura en voz alta disponible."); return; }
    const text=lines.slice(Math.max(line-1,0)).map(item=>item.text).join(". ");
    if(!text){ setMsg("Esta página no tiene texto seleccionable para leer."); return; }
    window.speechSynthesis.cancel();
    const next=new SpeechSynthesisUtterance(text); const chosen=voices.find(v=>v.name===voiceName);
    if(chosen){ next.voice=chosen; next.lang=chosen.lang; } else next.lang="es-ES";
    next.rate=rate; next.onstart=()=>{setSpeaking(true);setPaused(false);}; next.onend=()=>{setSpeaking(false);setPaused(false);};
    next.onerror=(event)=>{ if(event.error!=="canceled"&&event.error!=="interrupted") setMsg("No se pudo reproducir la voz. Prueba otra voz."); setSpeaking(false); setPaused(false); };
    utterance.current=next; window.speechSynthesis.speak(next); setMsg(`Leyendo desde la línea ${line}`);
  };
  const pauseOrResume=()=>{ if(!speaking) return; if(paused){ window.speechSynthesis.resume(); setPaused(false); } else { window.speechSynthesis.pause(); setPaused(true); } };
  const stopListening=()=>{ window.speechSynthesis.cancel(); setSpeaking(false); setPaused(false); };
  if(asEpub) return <EpubReader id={id} title={title} back={back}/>;
  if(err) return <p className="rounded-xl border border-red-500/40 p-3 text-red-300">{err} <Link href={back} className="underline">Volver</Link></p>;
  return <main className="space-y-3"><div className="flex items-center justify-between"><Link href={back} className="text-sm text-mor">{from?"← Novela":"← Biblioteca"}</Link>
    <span className="text-sm text-neutral-400">Pág. {page} / {doc?.numPages||"…"}</span></div>
    {msg&&<p className="rounded-xl bg-ok/15 p-2 text-center text-sm text-ok">{msg}</p>}
    {notes.filter(n=>n.page===page).map(n=><p key={n.id} className="rounded-xl bg-mor/15 p-2 text-sm">📝 Línea {n.line}: {n.text}</p>)}
    <div ref={box} className="relative mx-auto w-fit max-w-full overflow-auto bg-white">
      <canvas ref={cv}/>
      {lines.map((l,i)=><div key={i} onClick={()=>mark(page,i+1)} title={l.text} className={`absolute cursor-pointer ${i+1===line?"bg-yellow-300/40":"hover:bg-mor/20"}`} style={{left:l.x,top:l.y,width:l.w,height:l.h*1.2}}/>)}</div>
    <p className="text-center text-xs text-neutral-400">Toca una línea para guardarla ({lines.length?`línea ${line} de ${lines.length}`:"sin texto detectado — OCR pendiente"})</p>
    <div className="grid grid-cols-2 gap-3"><button className="btn-p py-5 text-lg" disabled={page<=1} onClick={()=>mark(page-1,1)}>◀ Retroceder</button>
      <button className="btn-p py-5 text-lg" disabled={page>=(doc?.numPages||1)} onClick={()=>mark(page+1,1)}>Avanzar ▶</button></div>
    <section className="space-y-2 rounded-xl border border-line bg-card p-3" aria-label="Audiolibro gratuito">
      <div className="flex items-center justify-between"><h2 className="font-semibold">🔊 Escuchar gratis</h2><span className="text-xs text-neutral-400">Desde línea {line}</span></div>
      <p className="text-xs text-neutral-400">Usa las voces disponibles en este dispositivo. No envía el PDF a ningún servicio.</p>
      <div className="grid gap-2 sm:grid-cols-2"><label className="text-sm">Voz<select aria-label="Voz para lectura" value={voiceName} onChange={e=>changeVoice(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-black/20 p-2">{voices.length?voices.map(v=><option key={`${v.name}-${v.lang}`} value={v.name}>{v.name} · {v.lang}</option>):<option value="">Voz predeterminada</option>}</select></label>
        <label className="text-sm">Velocidad<select aria-label="Velocidad de lectura" value={rate} onChange={e=>changeRate(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-line bg-black/20 p-2"><option value={0.75}>Lenta</option><option value={1}>Normal</option><option value={1.25}>Rápida</option><option value={1.5}>Muy rápida</option></select></label></div>
      <div className="grid grid-cols-3 gap-2"><button className="btn-p" onClick={listen}>▶ Escuchar</button><button className="btn" disabled={!speaking} onClick={pauseOrResume}>{paused?"▶ Seguir":"Ⅱ Pausar"}</button><button className="btn" disabled={!speaking} onClick={stopListening}>■ Detener</button></div>
    </section>
    <div className="flex gap-2"><button className="btn" onClick={()=>setZoom(z=>Math.max(.6,z-.2))}>−</button><button className="btn" onClick={()=>setZoom(z=>z+.2)}>+ Zoom</button>
      <button className="btn" onClick={()=>box.current?.requestFullscreen()}>Pantalla completa</button>
      <button className="btn flex-1" onClick={async()=>{ const t=prompt(`Nota para página ${page}, línea ${line}`); if(!t) return; const n={id:crypto.randomUUID(),text:t,bookId:id,page,line,updated:Date.now()}; await saveNote(n); setNotes(x=>[n,...x]); }}>+ Nota en esta línea</button></div>
  </main>;
}
