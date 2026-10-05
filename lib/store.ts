import { get, set, del, keys } from "idb-keyval";
import { sb } from "./supabase";
export type Progress = { bookId:string; title:string; page:number; line:number; total:number; updated:number };
export type Note = { id:string; text:string; bookId?:string; page?:number; line?:number; updated:number };
export const saveProgress = async (p:Progress) => { await set("p:"+p.bookId, p); push(); };
export const allProgress = async () => (await Promise.all((await keys()).filter(k=>String(k).startsWith("p:")).map(k=>get(k) as Promise<Progress>))).sort((a,b)=>b.updated-a.updated);
export const getProgress = (id:string) => get("p:"+id) as Promise<Progress|undefined>;
export const saveNote = async (n:Note) => { await set("n:"+n.id, n); push(); };
export const delNote = (id:string) => del("n:"+id);
export const allNotes = async () => (await Promise.all((await keys()).filter(k=>String(k).startsWith("n:")).map(k=>get(k) as Promise<Note>))).sort((a,b)=>b.updated-a.updated);
export const savePdf = (id:string, b:Blob) => set("pdf:"+id, b);
export const getPdf = (id:string) => get("pdf:"+id) as Promise<Blob|undefined>;
export const delPdf = (id:string) => del("pdf:"+id);
export const downloaded = async () => Promise.all((await keys()).filter(k=>String(k).startsWith("pdf:")).map(async k=>({ id:String(k).slice(4), size:((await get(k)) as Blob).size })));
// Sincroniza lo local con Supabase (se reintenta al volver internet)
export async function push(){
  if(!navigator.onLine) return; const { data } = await sb.auth.getSession(); if(!data.session) return;
  const ps = await allProgress(), ns = await allNotes();
  if(ps.length) await sb.from("progress").upsert(ps.map(p=>({book_id:p.bookId,title:p.title,page:p.page,line:p.line,total:p.total,updated_at:new Date(p.updated).toISOString()})));
  if(ns.length) await sb.from("notes").upsert(ns.map(n=>({id:n.id,text:n.text,book_id:n.bookId,page:n.page,line:n.line,updated_at:new Date(n.updated).toISOString()})));
}
export async function pull(){
  if(!navigator.onLine) return; const { data } = await sb.auth.getSession(); if(!data.session) return;
  const { data: ps } = await sb.from("progress").select("*");
  for(const r of ps||[]){ const l = await getProgress(r.book_id); const t = Date.parse(r.updated_at);
    if(!l || l.updated<t) await set("p:"+r.book_id,{bookId:r.book_id,title:r.title,page:r.page,line:r.line,total:r.total,updated:t}); }
  const { data: ns } = await sb.from("notes").select("*");
  for(const r of ns||[]) await set("n:"+r.id,{id:r.id,text:r.text,bookId:r.book_id,page:r.page,line:r.line,updated:Date.parse(r.updated_at)});
  const LIBRARY_FOLDER_KEY = "library_folder";

export function saveLibraryFolder(folder: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LIBRARY_FOLDER_KEY, folder);
}

export function savedLibraryFolder(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LIBRARY_FOLDER_KEY) ?? "";
}
}
