import { useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  Check,
  Copy,
  Download,
  Edit3,
  RefreshCw,
} from 'lucide-react';
import type { ClassroomSession, NoteItem, StudyNotes } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface SmartNotesScreenProps {
  session: ClassroomSession | null;
  isGenerating: boolean;
  generationError: string | null;
  onRetryGenerate: () => void;
  onUpdateNotes: (notes: StudyNotes) => void;
  onJumpToSegment: (segmentId: string) => void;
}

function formatTimestamp(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function notesToMarkdown(session: ClassroomSession, notes: StudyNotes): string {
  const lines: string[] = [
    `# ${session.title} — Study Notes`,
    `Generated: ${new Date(notes.generatedAtIso).toLocaleString()}`,
    notes.isDemo ? '> Note: Generated from Interactive Demo Mode' : '> Source: Live Classroom Transcript',
    '',
  ];

  if (notes.topicHeadings.length > 0) {
    lines.push('## Topic Headings', ...notes.topicHeadings.map((h) => `- ${h}`), '');
  }

  const addSection = (heading: string, items: NoteItem[]) => {
    if (items.length === 0) return;
    lines.push(`## ${heading}`);
    for (const item of items) {
      const refs = item.references
        .map((r) => `#${r.segmentId} @ ${formatTimestamp(r.timestampMs)}`)
        .join(', ');
      lines.push(
        `### ${item.title}${item.unverified ? ' [Unverified]' : ''}`,
        item.content,
        refs ? `*Evidence:* ${refs}` : '',
        ''
      );
    }
  };

  addSection('Lesson Summary', notes.lessonSummary);
  addSection('Key Concepts', notes.keyConcepts);
  addSection('Important Definitions', notes.importantDefinitions);
  addSection('Highlighted Explanations', notes.highlightedExplanations);
  addSection('Bookmarked Moments', notes.bookmarkedMoments);
  addSection('Unclear or Unverified Information', notes.unclearOrUnverified);

  return lines.join('\n');
}

export function SmartNotesScreen({
  session,
  isGenerating,
  generationError,
  onRetryGenerate,
  onUpdateNotes,
  onJumpToSegment,
}: SmartNotesScreenProps) {
  const [copied, setCopied] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <div className="rounded-2xl border border-[var(--mv-border)] bg-[var(--mv-surface)] p-8">
          <BookOpen className="mx-auto h-10 w-10 text-[var(--mv-accent)]" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-bold">No Study Notes Selected</h1>
          <p className="mt-2 text-sm text-[var(--mv-text-muted)]">
            Complete a live or demo classroom session, or open a saved class from My Classes to
            view its evidence-linked study notes.
          </p>
        </div>
      </div>
    );
  }

  const notes = session.notes;

  const handleCopy = async () => {
    if (!notes) return;
    await navigator.clipboard.writeText(notesToMarkdown(session, notes));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!notes) return;
    const md = notesToMarkdown(session, notes);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-notes.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveItemEdit = (
    sectionKey: keyof Pick<
      StudyNotes,
      | 'keyConcepts'
      | 'importantDefinitions'
      | 'lessonSummary'
      | 'highlightedExplanations'
      | 'bookmarkedMoments'
      | 'unclearOrUnverified'
    >,
    itemId: string
  ) => {
    if (!notes || !editDraft.trim()) return;
    const updated: StudyNotes = {
      ...notes,
      [sectionKey]: notes[sectionKey].map((item) =>
        item.id === itemId ? { ...item, content: editDraft.trim() } : item
      ),
    };
    onUpdateNotes(updated);
    setEditingItemId(null);
  };

  const renderSection = (
    title: string,
    sectionKey: keyof Pick<
      StudyNotes,
      | 'keyConcepts'
      | 'importantDefinitions'
      | 'lessonSummary'
      | 'highlightedExplanations'
      | 'bookmarkedMoments'
      | 'unclearOrUnverified'
    >,
    items: NoteItem[]
  ) => {
    if (items.length === 0) return null;
    return (
      <section className="rounded-2xl border border-[var(--mv-border)] bg-[var(--mv-surface)] p-5">
        <h2 className="text-lg font-bold">{title}</h2>
        <div className="mt-3 space-y-3">
          {items.map((item) => {
            const isEditing = editingItemId === item.id;
            return (
              <article
                key={item.id}
                className={`rounded-xl border p-4 ${
                  item.unverified
                    ? 'border-[var(--mv-amber)] bg-[var(--mv-amber-bg)]/40'
                    : 'border-[var(--mv-border)] bg-[var(--mv-bg)]'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold">{item.title}</h3>
                    {item.unverified && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--mv-amber)] bg-[var(--mv-amber-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--mv-amber)]">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                        Unverified / Check Audio
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItemId(item.id);
                      setEditDraft(item.content);
                    }}
                    className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[var(--mv-border)] bg-[var(--mv-surface)] px-2.5 py-1 text-xs font-semibold hover:bg-[var(--mv-surface-alt)]"
                  >
                    <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Edit</span>
                  </button>
                </div>

                {isEditing ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      rows={3}
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      className="w-full rounded-lg border border-[var(--mv-border)] bg-[var(--mv-surface)] p-2.5 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveItemEdit(sectionKey, item.id)}
                        className="rounded-lg bg-[var(--mv-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--mv-accent-text)]"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingItemId(null)}
                        className="rounded-lg border border-[var(--mv-border)] px-3 py-1.5 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1.5 text-sm leading-relaxed">{item.content}</p>
                )}

                {item.references.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--mv-text-muted)]">
                      Evidence:
                    </span>
                    {item.references.map((ref) => (
                      <button
                        key={ref.segmentId}
                        type="button"
                        onClick={() => onJumpToSegment(ref.segmentId)}
                        title={ref.excerpt}
                        className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[var(--mv-accent)] bg-[var(--mv-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--mv-accent)] hover:opacity-90"
                      >
                        <span>
                          #{ref.segmentId} @ {formatTimestamp(ref.timestampMs)}
                        </span>
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:py-10">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-[var(--mv-radius-lg)] border border-[var(--mv-border)] bg-[var(--mv-surface)] p-6 shadow-[var(--mv-shadow-sm)]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{session.title}</h1>
            {notes && (
              <StatusBadge
                tone={notes.isDemo ? 'demo' : notes.isLocalFallback ? 'warning' : 'success'}
                label={
                  notes.isDemo
                    ? 'Demo Study Notes'
                    : notes.isLocalFallback
                      ? 'Basic Local Notes'
                      : 'Evidence-Linked AI Notes'
                }
              />
            )}
          </div>
          <p className="mt-1.5 text-sm text-[var(--mv-text-muted)]">
            {new Date(session.createdAtIso).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}{' '}
            • Every concept links directly to its classroom transcript timestamp.
          </p>
        </div>

        {notes && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--mv-border)] px-3.5 py-2 text-sm font-semibold hover:bg-[var(--mv-surface-alt)]"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-[var(--mv-success)]" aria-hidden="true" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[var(--mv-accent)] px-4 py-2 text-sm font-semibold text-[var(--mv-accent-text)] hover:bg-[var(--mv-accent-hover)]"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>Download .md</span>
            </button>
          </div>
        )}
      </header>

      {isGenerating && (
        <div
          role="status"
          className="rounded-2xl border border-[var(--mv-border)] bg-[var(--mv-surface)] p-8 text-center"
        >
          <p className="text-base font-semibold">
            Generating evidence-linked study notes and validating transcript references...
          </p>
        </div>
      )}

      {notes?.isLocalFallback && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--mv-amber)] bg-[var(--mv-amber-bg)] p-4 text-sm text-[var(--mv-amber)]"
        >
          <div>
            <p className="font-bold">
              {notes.notice ||
                'Basic study notes — generated locally from your classroom transcript. AI summarization is currently unavailable.'}
            </p>
            {generationError && <p className="mt-1 text-xs">{generationError}</p>}
          </div>
          <button
            type="button"
            onClick={onRetryGenerate}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[var(--mv-amber)] px-4 py-2 font-semibold text-white"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span>Retry AI-Enhanced Notes</span>
          </button>
        </div>
      )}

      {generationError && !notes?.isLocalFallback && (
        <div
          role="alert"
          className="rounded-2xl border border-[var(--mv-danger)] bg-[var(--mv-danger-bg)] p-5 text-sm text-[var(--mv-danger)]"
        >
          <p className="font-bold">Could Not Generate Study Notes</p>
          <p className="mt-1">{generationError}</p>
          <button
            type="button"
            onClick={onRetryGenerate}
            className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[var(--mv-danger)] px-4 py-2 font-semibold text-white"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span>Retry Note Generation</span>
          </button>
        </div>
      )}

      {notes && (
        <div className="space-y-5">
          {notes.topicHeadings.length > 0 && (
            <section className="rounded-2xl border border-[var(--mv-border)] bg-[var(--mv-surface)] p-5">
              <h2 className="text-lg font-bold">Topic Headings</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {notes.topicHeadings.map((h, idx) => (
                  <li key={idx}>{h}</li>
                ))}
              </ul>
            </section>
          )}

          {renderSection('Lesson Summary', 'lessonSummary', notes.lessonSummary)}
          {renderSection('Key Concepts', 'keyConcepts', notes.keyConcepts)}
          {renderSection('Important Definitions', 'importantDefinitions', notes.importantDefinitions)}
          {renderSection(
            'Highlighted Explanations',
            'highlightedExplanations',
            notes.highlightedExplanations
          )}
          {renderSection('Bookmarked Moments', 'bookmarkedMoments', notes.bookmarkedMoments)}
          {renderSection(
            'Unverified or Unclear Information',
            'unclearOrUnverified',
            notes.unclearOrUnverified
          )}
        </div>
      )}
    </div>
  );
}
