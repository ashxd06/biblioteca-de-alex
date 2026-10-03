"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { login, watchToken, configured } from "@/lib/supabase";
import { allProgress, allNotes, saveNote, delNote, pull, push, Progress, Note } from "@/lib/store";
export default function Hub(){
  const [ps,setPs]=useState<Progress[]>([]); const [ns,setNs]=useState<Note[]>([]); const [t,setT]=useState(""); const [on,setOn]=useState(true);
  const load=async()=>{ setPs(await allProgress()); setNs((await allNotes()).filter(n=>!n.bookId)); };
  const [authError,setAuthError]=useState("");
  useEffect(()=>{ const stop=watchToken(); pull().then(load); load(); setOn(navigator.onLine);
    const f=()=>{setOn(navigator.onLine); if(navigator.onLine) push();}; addEventListener("online",f); addEventListener("offline",f); return()=>{stop();removeEventListener("online",f);removeEventListener("offline",f)} },[]);
  const last=ps[0];
  return <main className="space-y-6">
    <header className="flex items-center justify-between"><h1 className="text-2xl font-bold">📚 Biblioteca de <span className="text-mor">Alex</span></h1>
      <button className="btn" onClick={async()=>{setAuthError("");try{await login()}catch(e:any){setAuthError(e.message||"No se pudo abrir Google.")}}}>Entrar con Google</button></header>
    {!configured&&<p className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-200">Falta terminar la conexión segura con Supabase y Google. Tus PDF siguen privados: la app no puede leer Drive hasta configurarla.</p>}
    {authError&&<p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{authError}</p>}
    {!on && <p className="text-sm text-yellow-300">Sin conexión: tu avance se sincronizará al volver internet.</p>}
    {last ? <Link href={`/read/${last.bookId}`} className="block rounded-2xl border border-ok/40 bg-ok/10 p-4">
      <p className="text-xs text-ok">Continuar leyendo</p>
      <p className="font-semibold">Te quedaste en {last.title}, página {last.page}, línea {last.line}</p></Link>
      : <p className="text-neutral-400">Aún no has leído nada. Ve a la Biblioteca.</p>}
    <nav className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {last&&<Link className="btn-p text-center" href={`/read/${last.bookId}`}>Continuar leyendo</Link>}
      <Link className="btn text-center" href="/library">Biblioteca</Link>
      <a className="btn text-center" href="#notas">Notas</a>
      <Link className="btn text-center" href="/library?tab=offline">Sin conexión</Link>
      <Link className="btn text-center" href="/library?tab=config">Configuración</Link></nav>
    <section><h2 className="mb-2 font-semibold">Últimos libros</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{ps.slice(0,6).map(p=>
        <Link key={p.bookId} href={`/read/${p.bookId}`} className="rounded-xl border border-line bg-card p-3">
          <div className="mb-2 flex h-24 items-center justify-center rounded-lg bg-gradient-to-br from-mor/30 to-ok/20 text-3xl">📖</div>
          <p className="truncate text-sm font-medium">{p.title}</p>
          <p className="text-xs text-neutral-400">Pág. {p.page}, línea {p.line} · {Math.round(p.page/Math.max(p.total,1)*100)}%</p>
          <div className="mt-1 h-1 rounded bg-line"><div className="h-1 rounded bg-ok" style={{width:`${p.page/Math.max(p.total,1)*100}%`}}/></div></Link>)}</div></section>
    <section id="notas"><h2 className="mb-2 font-semibold">Notas rápidas</h2>
      <div className="flex gap-2"><input value={t} onChange={e=>setT(e.target.value)} placeholder="Recordatorio, frase, comentario…" className="flex-1 rounded-xl border border-line bg-card px-3 py-2"/>
        <button className="btn-p" onClick={async()=>{ if(!t.trim())return; await saveNote({id:crypto.randomUUID(),text:t,updated:Date.now()}); setT(""); load(); }}>Guardar</button></div>
      <ul className="mt-3 space-y-2">{ns.map(n=><li key={n.id} className="flex justify-between rounded-xl border border-line bg-card p-3 text-sm">{n.text}
        <button onClick={async()=>{await delNote(n.id);load()}} className="text-neutral-500">✕</button></li>)}</ul></section>
  </main>;
}
