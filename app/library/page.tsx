"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listLibrary, bookTitle, DriveCollection, DriveLibrary } from "@/lib/drive";
import { saveLibraryFolder, savedLibraryFolder, Progress } from "@/lib/store";
import { BookOpenIcon, ChevronRightIcon } from "./icons";
import { ProgressBar, VolumeRow, lastRead, pct, useLocalState } from "./shared";

// Card de una novela/colección (una subcarpeta de Drive).
function NovelCard({ c, progress }: { c: DriveCollection; progress: Record<string, Progress> }) {
  const n = c.files.length;
  const last = lastRead(c.files, progress);
  return (
    <Link
      href={`/library/${c.id}`}
      className="flex min-h-[10rem] flex-col rounded-2xl border border-line bg-card p-4 transition hover:border-mor/50 active:scale-[0.98]"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-mor/30 to-ok/20 text-mor">
        <BookOpenIcon className="h-5 w-5" />
      </div>
      <h3 className="line-clamp-2 font-semibold leading-snug">{c.name}</h3>
      <p className="mt-0.5 text-xs text-neutral-400">{n === 0 ? "Sin volúmenes" : `${n} ${n === 1 ? "volumen" : "volúmenes"}`}</p>
      {last && (
        <div className="mt-2 space-y-1">
          <p className="truncate text-xs text-ok">Leyendo: {bookTitle(last.file.name)}</p>
          <ProgressBar value={pct(last.progress)} />
          <p className="text-[11px] text-neutral-400">{pct(last.progress)} %</p>
        </div>
      )}
      <span className="mt-auto flex items-center gap-1 pt-3 text-sm font-medium text-mor">
        Ver novela <ChevronRightIcon className="h-4 w-4" />
      </span>
    </Link>
  );
}

export default function Lib() {
  const [folder, setFolder] = useState("");
  const [lib, setLib] = useState<DriveLibrary | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const local = useLocalState(setErr);

  const scan = async (f = folder) => {
    setErr("");
    setLoading(true);
    try {
      const found = await listLibrary(f);
      setLib(found);
      await saveLibraryFolder(f);
    } catch (e: any) {
      setErr(e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    void (async () => {
      const f = await savedLibraryFolder();
      setFolder(f);
      if (f) scan(f);
    })();
  }, []);

  // Archivos que están directamente en la carpeta principal (sin subcarpeta) se agrupan aparte.
  const cards: DriveCollection[] = lib && lib.kind === "folder"
    ? [...lib.collections, ...(lib.looseFiles.length ? [{ id: lib.rootId, name: "Archivos sueltos", files: lib.looseFiles }] : [])]
    : [];

  return (
    <main className="space-y-4">
      <Link href="/" className="text-sm text-mor">← Inicio</Link>
      <h1 className="text-xl font-bold">Biblioteca</h1>
      <p className="text-sm text-neutral-400">Guarda una carpeta de Drive una vez y tu biblioteca se abrirá automáticamente en esta cuenta, también desde el celular. Cada subcarpeta aparece como una novela.</p>
      <div className="flex gap-2">
        <input value={folder} onChange={e => setFolder(e.target.value)} placeholder="Enlace o ID de carpeta/PDF/EPUB de Drive" className="flex-1 rounded-xl border border-line bg-card px-3 py-2" />
        <button className="btn-p" disabled={loading} onClick={() => scan()}>Guardar y actualizar</button>
      </div>
      {folder && <p className="text-xs text-ok">Carpeta predeterminada guardada. Solo pega otro enlace si quieres cambiar de biblioteca.</p>}
      {err && <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{err}</p>}

      {lib?.kind === "file" ? (
        <section className="space-y-2">
          <h2 className="font-semibold">Archivo</h2>
          <ul className="space-y-2">
            {lib.looseFiles.map(f => (
              <VolumeRow key={f.id} file={f} progress={local.progress[f.id]} offlineSize={local.off[f.id]} busy={local.busy === f.id}
                onDownload={() => local.download(f)} onDelete={() => local.remove(f.id)} />
            ))}
          </ul>
        </section>
      ) : (
        <section className="space-y-3">
          <h2 className="font-semibold">Mis novelas</h2>
          {loading && !lib && <p className="text-sm text-neutral-400">Buscando novelas en Drive…</p>}
          {lib && cards.length === 0 && !loading && (
            <p className="text-sm text-neutral-400">No encontré subcarpetas ni archivos PDF/EPUB en esta carpeta. Crea una carpeta por novela y pulsa «Guardar y actualizar».</p>
          )}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3">
            {cards.map(c => <NovelCard key={c.id} c={c} progress={local.progress} />)}
          </div>
        </section>
      )}
    </main>
  );
}
