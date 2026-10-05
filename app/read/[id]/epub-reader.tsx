"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {getPdf,savePdf} from "@/lib/store";
import {downloadPdf} from "@/lib/drive";

export default function EpubReader({id,title}:{id:string,title:string}){
  const area=useRef<HTMLDivElement>(null); const rendition=useRef<any>(null); const book=useRef<any>(null);
  const [error,setError]=useState(""); const [ready,setReady]=useState(false); const [speaking,setSpeaking]=useState(false);
  useEffect(()=>{let alive=true;(async()=>{try{let blob=await getPdf(id);if(!blob){blob=await downloadPdf(id);await savePdf(id,blob)}const mod:any=await import("epubjs");const epub=mod.default||mod;book.current=epub(await blob.arrayBuffer());const r=book.current.renderTo(area.current,{width:"100%",height:"70vh"});rendition.current=r;await r.display(localStorage.getItem("epub-position:"+id)||undefined);r.on("relocated",(where:any)=>localStorage.setItem("epub-position:"+id,where.start.cfi));if(alive)setReady(true)}catch(e:any){if(alive)setError(e.message||"No se pudo abrir el EPUB")}})();return()=>{alive=false;speechSynthesis.cancel();book.current?.destroy?.()}},[id]);
  const read=()=>{const text=rendition.current?.getContents?.()[0]?.document?.body?.innerText;if(!text)return; speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="es-ES";u.onstart=()=>setSpeaking(true);u.onend=()=>setSpeaking(false);speechSynthesis.speak(u)};
  if(error)return <p className="rounded-xl border border-red-500/40 p-3 text-red-300">{error} <Link href="/library" className="underline">Volver</Link></p>;
  return <main className="space-y-3"><div className="flex items-center justify-between"><Link href="/library" className="text-sm text-mor">← Biblioteca</Link><span className="text-sm text-neutral-400">EPUB · {title}</span></div><div ref={area} className="rounded-xl bg-white text-black"/><p className="text-center text-xs text-neutral-400">{ready?"El capítulo se guarda automáticamente para continuar después.":"Abriendo EPUB…"}</p><div className="grid grid-cols-2 gap-3"><button className="btn-p py-4" onClick={()=>rendition.current?.prev()}>◀ Retroceder</button><button className="btn-p py-4" onClick={()=>rendition.current?.next()}>Avanzar ▶</button></div><section className="rounded-xl border border-line bg-card p-3"><h2 className="font-semibold">🔊 Escuchar gratis</h2><p className="mt-1 text-xs text-neutral-400">Lee el capítulo visible con las voces del dispositivo.</p><div className="mt-2 flex gap-2"><button className="btn-p" onClick={read}>▶ Escuchar</button><button className="btn" disabled={!speaking} onClick={()=>{speechSynthesis.cancel();setSpeaking(false)}}>■ Detener</button></div></section></main>;
}
