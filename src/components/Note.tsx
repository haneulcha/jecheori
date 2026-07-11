import type { NoteView } from '../card'

function Row({ label, text }: { label: string; text: string }) {
  return (
    <div className="nrow">
      <span className="lbl">{label}</span>
      <span>{text}</span>
    </div>
  )
}

export function Note({ note }: { note: NoteView }) {
  return (
    <div className="note">
      <Row label="고르는 법" text={note.pick} />
      <Row label="보관" text={note.store} />
      <Row label="쓰임" text={note.use} />
    </div>
  )
}
