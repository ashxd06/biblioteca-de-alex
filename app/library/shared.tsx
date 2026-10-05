"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { downloadPdf, bookFormat, bookTitle, DriveFile } from "@/lib/drive";
import { savePdf, delPdf, downloaded, allProgress, pull, Progress } from "@/lib/store";
import { CheckCircleIcon, DownloadIcon, SpinnerIcon, TrashIcon, BookOpenIcon } from "./icons";

export const mb = (n: number) => (n / 1048576).toFixed(1) + " MB";

// Porcentaje de lectura (misma fórmula que usa la pantalla de inicio).
export const pct = (p?: Progress) =>
  p ? Math.min(100, Math.round((p.page / Math.max(p.total, 1)) * 100)) : 0;

// Enlace al lector existente. "from" permite volver a la novela desde el lector.
export const readHref = (f: DriveFile, from?: string) =>
  `/read/${f.id}?t=${encodeURIComponent(bookTitle(f.name))}&format=${bookFormat(f)}` +
  (from ? `&from=${encodeURIComponent(from)}` : "");

// Último volumen leído de una lista de archivos: el de progreso más reciente.
// El progreso sigue ligado al ID único del archivo (bookId), no al nombre.
export function lastRead(files: DriveFile[], progress: Record<string, Progress>) {
  let best: { file: DriveFile; progress: Progress } | undefined;
  for (const file of files) {
    const p = progress[file.id];
    if (p && (!best || p.updated > best.progress.updated)) best = { file, progress: p };
  }
  return best;
}

// Estado local compartido por las vistas de biblioteca: descargas offline y progreso.
export function useLocalState(onError: (message: string) => void) {
  const [off, setOff] = useState<Record<string, number>>({});
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [busy, setBusy] = useState("");

  const refresh = useCallback(async () => {
    const o: Record<string, number> = {};
    (await downloaded()).forEach(d => { o[d.id] = d.size; });
    const p: Record<string, Progress> = {};
    (await allProgress()).forEach(x => { p[x.bookId] = x; });
    setOff(o);
    setProgress(p);
  }, []);

  useEffect(() => {
    void refresh();
    // Trae el progreso de otros dispositivos (no hace nada sin sesión o sin conexión).
    pull().then(refresh).catch(() => {});
  }, [refresh]);

  const download = async (f: DriveFile) => {
    setBusy(f.id);
    try {
      await savePdf(f.id, await downloadPdf(f.id));
      await refresh();
    } catch (e: any) {
      onError(e.message);
    }
    setBusy("");
  };

  const remove = async (id: string) => {
    await delPdf(id);
    await refresh();
  };

  return { off, progress, busy, refresh, download, remove };
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1 rounded bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <div className="h-1 rounded bg-ok" style={{ width: `${value}%` }} />
    </div>
  );
}

type RowProps = {
  file: DriveFile;
  from?: string;
  progress?: Progress;
  offlineSize?: number;
  busy: boolean;
  isLast?: boolean;
  onDownload: () => void;
  onDelete: () => void;
};

// Un volumen: nombre, formato, estado de descarga, progreso y acciones.
export function VolumeRow({ file, from, progress, offlineSize, busy, isLast, onDownload, onDelete }: RowProps) {
  const isDownloaded = offlineSize != null;
  const percent = pct(progress);
  return (
    <li className={`rounded-xl border bg-card p-3 ${isLast ? "border-ok/40" : "border-line"}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={readHref(file, from)} className="truncate font-medium">{bookTitle(file.name)}</Link>
            {isLast && <span className="shrink-0 rounded-md bg-ok/15 px-1.5 py-0.5 text-[11px] font-medium text-ok">Último leído</span>}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-400">
            <span className="font-medium uppercase">{bookFormat(file)}</span>
            {file.size && <span>{mb(Number(file.size))}</span>}
            {isDownloaded
              ? <span className="inline-flex items-center gap-1 text-ok"><CheckCircleIcon className="h-3.5 w-3.5" />Descargado · {mb(offlineSize)}</span>
              : <span>Sin descargar</span>}
          </p>
          {progress
            ? <div className="mt-2 flex items-center gap-2"><div className="flex-1"><ProgressBar value={percent} /></div><span className="w-10 text-right text-xs text-neutral-400">{percent} %</span></div>
            : <p className="mt-2 text-xs text-neutral-500">Sin leer</p>}
        </div>
        <div className="flex gap-2 sm:shrink-0">
          <Link href={readHref(file, from)} className="btn-p inline-flex flex-1 items-center justify-center gap-2 sm:flex-none">
            <BookOpenIcon />Leer
          </Link>
          {isDownloaded
            ? <button className="btn inline-flex flex-1 items-center justify-center gap-2 sm:flex-none" onClick={onDelete}><TrashIcon />Eliminar descarga</button>
            : <button className="btn inline-flex flex-1 items-center justify-center gap-2 sm:flex-none" disabled={busy} onClick={onDownload}>
                {busy ? <SpinnerIcon /> : <DownloadIcon />}{busy ? "Descargando…" : "Descargar"}
              </button>}
        </div>
      </div>
    </li>
  );
}
