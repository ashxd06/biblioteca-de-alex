"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { listBooks, getFolderName, parseDriveInput, bookTitle, DriveFile } from "@/lib/drive";
import { savedLibraryFolder } from "@/lib/store";
import { ArrowLeftIcon } from "../icons";
import { ProgressBar, VolumeRow, lastRead, pct, readHref, useLocalState } from "../shared";

// Vista de una novela: los archivos de una subcarpeta de Drive, en orden natural.
export default function Novel() {
  const folderId = useParams().folderId as string;
  const [name, setName] = useState("");
  const [files, setFiles] = useState<DriveFile[] | null>(null);
  const [err, setErr] = useState("");
  const local = useLocalState(setErr);

  useEffect(() => {
    let alive = true;
    setFiles(null);
    setErr("");
    (async () => {
      try {
        // Si es la carpeta principal guardada, son los archivos que no están dentro de ninguna novela.
        const isRoot = parseDriveInput(savedLibraryFolder()).id === folderId;
        const [n, f] = await Promise.all([isRoot ? Promise.resolve("Archivos sueltos") : getFolderName(folderId), listBooks(folderId)]);
        if (!alive) return;
        setName(n);
        setFiles(f);
      } catch (e: any) {
        if (alive) setErr(e.message);
      }
    })();
    return () => { alive = false; };
  }, [folderId]);

  const last = files ? lastRead(files, local.progress) : undefined;
  const n = files?.length ?? 0;
  const downloadedCount = files ? files.filter(f => local.off[f.id] != null).length : 0;

  return (
    <main className="space-y-4">
      <Link href="/library" className="inline-flex items-center gap-1 text-sm text-mor"><ArrowLeftIcon className="h-4 w-4" />Mis novelas</Link>
      {err && <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{err}</p>}
      {!files && !err && <p className="text-sm text-neutral-400">Cargando volúmenes…</p>}
      {files && (
        <>
          <header>
            <h1 className="text-xl font-bold">{name}</h1>
            <p className="text-sm text-neutral-400">
              {n} {n === 1 ? "volumen" : "volúmenes"}
              {downloadedCount > 0 && ` · ${downloadedCount} ${downloadedCount === 1 ? "descargado" : "descargados"}`}
            </p>
          </header>
          {last && (
            <Link href={readHref(last.file, folderId)} className="block space-y-2 rounded-2xl border border-ok/40 bg-ok/10 p-4">
              <p className="text-xs text-ok">Continuar leyendo</p>
              <p className="font-semibold">{name}</p>
              <p className="text-sm">Leyendo: {bookTitle(last.file.name)}</p>
              <ProgressBar value={pct(last.progress)} />
              <p className="text-xs text-neutral-300">Progreso: {pct(last.progress)} %</p>
            </Link>
          )}
          {n === 0 && <p className="text-sm text-neutral-400">Esta carpeta no tiene archivos PDF ni EPUB todavía.</p>}
          <ul className="space-y-2">
            {files.map(f => (
              <VolumeRow
                key={f.id}
                file={f}
                from={folderId}
                progress={local.progress[f.id]}
                offlineSize={local.off[f.id]}
                busy={local.busy === f.id}
                isLast={last?.file.id === f.id}
                onDownload={() => local.download(f)}
                onDelete={() => local.remove(f.id)}
              />
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
