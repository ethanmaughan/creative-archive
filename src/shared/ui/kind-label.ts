const LABELS: Record<string, string> = {
  space: 'Space',
  manuscript: 'Manuscript',
  scene: 'Scene',
  note: 'Note',
  'world-rule': 'World rule',
  character: 'Character',
  location: 'Location',
  research: 'Research',
  'library-item': 'Library',
  document: 'Document',
}

export function kindLabel(kind: string): string {
  return LABELS[kind] ?? kind
}
