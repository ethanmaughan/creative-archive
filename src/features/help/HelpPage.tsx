import type { JSX, ReactNode } from 'react'

/** One syntax row: the literal you type, and what it does. */
function Row({ code, children }: { code: string; children: ReactNode }): JSX.Element {
  return (
    <div className="syntax">
      <code className="syntax__code">{code}</code>
      <div className="syntax__desc">{children}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <section className="help__section">
      <h2 className="help__h2">{title}</h2>
      {children}
    </section>
  )
}

export function HelpPage(): JSX.Element {
  return (
    <div className="content__inner help">
      <div className="page-head">
        <div>
          <h1 className="page-title">Help &amp; syntax</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            Everything is plain Markdown in your folder. These are the extra bits of syntax that
            connect it together.
          </p>
        </div>
      </div>

      <Section title="How it works">
        <p className="help__p">
          Your writing lives as ordinary Markdown files on your machine — that folder is the real
          thing. Creative Archive reads it in place and builds a searchable index; delete the index
          and it rebuilds from your files. Nothing goes to a server, there are no accounts, and the
          AI only ever <em>retrieves</em> from what you&apos;ve written — it never authors your
          work.
        </p>
      </Section>

      <Section title="Linking notes">
        <Row code="[[Note Title]]">
          Link to another note by its title or filename (case-insensitive). Click it to jump there.
          The note you link to lists it under <strong>Linked references</strong>.
        </Row>
        <Row code="[[Note Title|as you like]]">Same link, shown with different text.</Row>
      </Section>

      <Section title="Referencing a block or heading">
        <Row code="…end of a paragraph. ^anchor">
          Give a paragraph an anchor by ending it with <code>^</code> and a short id. The{' '}
          <strong>⚓</strong> button in the editor toolbar stamps one for you and copies the
          reference.
        </Row>
        <Row code="[[Note#^anchor]]">
          Link straight to that block. Clicking it opens the note and flashes the block.
        </Row>
        <Row code="[[#^anchor]]">A block reference within the same note.</Row>
        <Row code="[[Note#Heading Text]]">
          Link to a heading — no anchor needed; headings are their own targets.
        </Row>
      </Section>

      <Section title="Embedding content (transclusion)">
        <p className="help__p">
          Add a <code>!</code> in front of any link to render the target&apos;s content inline,
          read-only, right where you write it.
        </p>
        <Row code="![[Note]]">Embed a whole note.</Row>
        <Row code="![[Note#^anchor]]">Embed a single block.</Row>
        <Row code="![[Note#Heading Text]]">Embed a heading and its section.</Row>
      </Section>

      <Section title="Tags">
        <Row code="#tag">
          Tag anywhere in a note. Nested tags like <code>#story/theme</code> work too. Browse them
          all on the <strong>Tags</strong> page, or click a tag to see everything that carries it.
        </Row>
      </Section>

      <Section title="Inline queries">
        <p className="help__p">
          A fenced code block tagged <code>query</code> renders a live, clickable list of matching
          documents. It&apos;s declarative and read-only — no code runs.
        </p>
        <pre className="help__pre">{`\`\`\`query
kind: note
tag: fantasy
sort: -title
limit: 10
\`\`\``}</pre>
        <div className="help__keys">
          <Row code="kind: note">Filter by document kind.</Row>
          <Row code="tag: fantasy">Only documents with this tag.</Row>
          <Row code="space: my-novel">Only inside this space.</Row>
          <Row code="path: research">Only under this folder path.</Row>
          <Row code="sort: -title">By title; a leading “-” sorts descending.</Row>
          <Row code="limit: 10">Cap the results (1–100).</Row>
        </div>
      </Section>

      <Section title="Where to find things">
        <Row code="Spaces">
          A workspace per project or class; the Library and research stay shared.
        </Row>
        <Row code="Files">Browse your whole folder — documents you edit, uploads you can read.</Row>
        <Row code="Search">Full-text across your notes and inside uploaded Word/PDF files.</Row>
        <Row code="Graph">See your notes as a web of the links you&apos;ve made.</Row>
      </Section>
    </div>
  )
}
