// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  categoryForExt,
  extForPath,
  isSourceFilePath,
  isTextExtractable,
} from '@/domain/models/source-file'

describe('source-file classification', () => {
  it('extracts the lowercased extension', () => {
    expect(extForPath('a/b/Report.PDF')).toBe('pdf')
    expect(extForPath('notes.md')).toBe('md')
    expect(extForPath('archive.tar.gz')).toBe('gz')
    expect(extForPath('README')).toBe('')
    expect(extForPath('.gitignore')).toBe('') // leading dot is not an extension
  })

  it('maps extensions to categories', () => {
    expect(categoryForExt('docx')).toBe('docx')
    expect(categoryForExt('pdf')).toBe('pdf')
    expect(categoryForExt('txt')).toBe('text')
    expect(categoryForExt('md')).toBe('text')
    expect(categoryForExt('png')).toBe('image')
    expect(categoryForExt('mp3')).toBe('other')
  })

  it('marks text/docx/pdf as extractable, images/other not', () => {
    expect(isTextExtractable('text')).toBe(true)
    expect(isTextExtractable('docx')).toBe(true)
    expect(isTextExtractable('pdf')).toBe(true)
    expect(isTextExtractable('image')).toBe(false)
    expect(isTextExtractable('other')).toBe(false)
  })

  it('treats non-authored, visible files as sources', () => {
    // Foreign uploads anywhere in the archive are sources...
    expect(isSourceFilePath('uploads/manuscript.docx')).toBe(true)
    expect(isSourceFilePath('research/diagram.png')).toBe(true) // non-md inside a workspace
    expect(isSourceFilePath('loose-note.md')).toBe(true) // loose md outside a workspace
    expect(isSourceFilePath('reference/paper.pdf')).toBe(true)
  })

  it('excludes authored documents and hidden paths', () => {
    // Authored markdown inside a known workspace flows through the documents index instead.
    expect(isSourceFilePath('research/idea.md')).toBe(false)
    expect(isSourceFilePath('story-bible/characters/mara.md')).toBe(false)
    // Hidden files / our own index dir are never indexed as sources.
    expect(isSourceFilePath('.creative-archive/index.sqlite')).toBe(false)
    expect(isSourceFilePath('.DS_Store')).toBe(false)
    expect(isSourceFilePath('.git/config')).toBe(false)
  })
})
