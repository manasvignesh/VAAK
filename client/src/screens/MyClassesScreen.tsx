import { useState } from 'react';
import { BookOpen, Download, FolderOpen, Search, Trash2 } from 'lucide-react';
import type { ClassroomSession } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { notesToMarkdown } from './SmartNotesScreen';

interface MyClassesScreenProps {
  sessions: ClassroomSession[];
  onOpenTranscript: (session: ClassroomSession) => void;
  onOpenNotes: (session: ClassroomSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onClearAll: () => void;
}

function formatDuration(ms: number): string {
  const totalSec = Math.max(1, Math.floor(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export function MyClassesScreen({
  sessions,
  onOpenTranscript,
  onOpenNotes,
  onDeleteSession,
  onClearAll,
}: MyClassesScreenProps) {
  const [query, setQuery] = useState('');

  const filtered = sessions.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    if (s.title.toLowerCase().includes(q)) return true;
    return s.segments.some((seg) =>
      (seg.correctedText ?? seg.originalText).toLowerCase().includes(q)
    );
  });

  const handleExportSession = (session: ClassroomSession) => {
    const content = session.notes
      ? notesToMarkdown(session, session.notes)
      : [
          `# ${session.title} — Transcript (VAAK)`,
          '',
          ...session.segments
            .filter((s) => !s.isVoiceCommand && !s.isGapMarker)
            .map((s) => `- [${s.id}] ${s.correctedText ?? s.originalText}`),
        ].join('\n');

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      data-tour-id="my-classes-panel"
      className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:py-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Classes Archive</h1>
          <p className="mt-1 text-sm font-medium text-[var(--mv-text-muted)]">
            Saved locally in your browser. Search, review, export, or delete sessions anytime.
          </p>
        </div>

        {sessions.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="nb-btn inline-flex min-h-10 items-center gap-1.5 bg-[var(--mv-danger)] px-4 py-2 text-sm font-bold text-[#151515]"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span>Clear All Data</span>
          </button>
        )}
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <label htmlFor="class-search-input" className="visually-hidden">
          Search saved classes and transcripts
        </label>
        <input
          id="class-search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by lecture title or transcript keyword..."
          className="nb-card w-full bg-[var(--mv-surface)] py-3 pl-10 pr-4 text-base font-medium"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="nb-card-lg bg-[var(--mv-surface)] p-10 text-center">
          <FolderOpen className="mx-auto h-10 w-10" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-bold">
            {sessions.length === 0 ? 'No Saved Classes Yet' : 'No Matching Classes'}
          </h2>
          <p className="mt-1 text-sm font-medium text-[var(--mv-text-muted)]">
            {sessions.length === 0
              ? 'Start a Live Class or run the Interactive Demo to save your first classroom session.'
              : 'Try a different keyword in your search.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((session) => {
            const educationalCount = session.segments.filter(
              (s) => s.isFinal && !s.isVoiceCommand && !s.isGapMarker
            ).length;
            const savedCount = session.segments.filter(
              (s) => s.highlightType || s.isBookmarked
            ).length;

            return (
              <article
                key={session.id}
                className="nb-card flex flex-wrap items-center justify-between gap-4 bg-[var(--mv-surface)] p-5"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold">{session.title}</h2>
                    {session.isDemo && <StatusBadge tone="demo" label="Demo" />}
                    {session.notes && <StatusBadge tone="success" label="Notes Ready" />}
                  </div>
                  <p className="font-mono text-xs font-semibold text-[var(--mv-text-muted)]">
                    {new Date(session.createdAtIso).toLocaleString()} •{' '}
                    {formatDuration(session.durationMs)} • {session.language} • {educationalCount}{' '}
                    captions • {savedCount} highlights/bookmarks
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenTranscript(session)}
                    className="nb-btn min-h-10 bg-[var(--mv-surface)] px-3.5 py-2 text-sm font-bold"
                  >
                    Open Transcript
                  </button>
                  {session.notes && (
                    <button
                      type="button"
                      onClick={() => onOpenNotes(session)}
                      className="nb-btn inline-flex min-h-10 items-center gap-1.5 bg-[var(--mv-lime)] px-3.5 py-2 text-sm font-bold text-[#151515]"
                    >
                      <BookOpen className="h-4 w-4" aria-hidden="true" />
                      <span>View Notes</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleExportSession(session)}
                    aria-label={`Export ${session.title}`}
                    className="nb-btn inline-flex min-h-10 items-center gap-1.5 bg-[var(--mv-lavender)] px-3 py-2 text-sm font-bold text-[#151515]"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    <span>Export</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSession(session.id)}
                    aria-label={`Delete ${session.title}`}
                    className="nb-btn inline-flex min-h-10 items-center gap-1.5 bg-[var(--mv-danger)] px-3 py-2 text-sm font-bold text-[#151515]"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
