import type { StudyNotes } from '../types';
import { formatNaturalTimestamp } from '../../../shared/notesGrounding';

export interface ReadableNoteSection {
  key: 'summary' | 'concepts' | 'definitions' | 'highlights' | 'bookmarks' | 'unverified';
  label: string;
  spokenText: string;
  firstSegmentId?: string;
}

export function buildReadableSections(notes: StudyNotes): ReadableNoteSection[] {
  const sections: ReadableNoteSection[] = [];

  const pushItems = (
    key: ReadableNoteSection['key'],
    label: string,
    items: StudyNotes['keyConcepts']
  ) => {
    if (items.length === 0) return;
    const body = items
      .map((item) => {
        const prefix = item.unverified
          ? 'The following explanation contains uncertain speech recognition and should be verified. '
          : '';
        const sourceNote =
          item.references.length > 0
            ? ` (Mentioned ${formatNaturalTimestamp(item.references[0].timestampMs)}.)`
            : '';
        return `${prefix}${item.title}. ${item.content}${sourceNote}`;
      })
      .join(' ');
    sections.push({
      key,
      label,
      spokenText: `${label}. ${body}`,
      firstSegmentId: items[0]?.references[0]?.segmentId,
    });
  };

  pushItems('summary', 'Lesson Summary', notes.lessonSummary);
  pushItems('concepts', 'Key Concepts', notes.keyConcepts);
  pushItems('definitions', 'Important Definitions', notes.importantDefinitions);
  pushItems('highlights', 'Highlighted Explanations', notes.highlightedExplanations);
  pushItems('bookmarks', 'Bookmarked Moments', notes.bookmarkedMoments);
  pushItems('unverified', 'Unclear or Unverified Information', notes.unclearOrUnverified);

  return sections;
}
