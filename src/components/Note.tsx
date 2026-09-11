import type { NoteView } from '../card'
import styles from './Note.module.css'

/** 한 줄(라벨 + 본문). 페이저의 "고르는 법"·"보관·쓰임" 쪽이 세 줄을 나눠 쓰므로 내보낸다 —
 *  쪽마다 Note에 프롭을 다는 대신 이미 있는 조각을 그대로 쓴다. */
export function NoteRow({ label, text }: { label: string; text: string }) {
  return (
    <div className={styles.nrow}>
      <span className={styles.lbl}>{label}</span>
      <span>{text}</span>
    </div>
  )
}

export function Note({ note }: { note: NoteView }) {
  return (
    <div className={styles.note}>
      <NoteRow label="고르는 법" text={note.pick} />
      <NoteRow label="보관" text={note.store} />
      <NoteRow label="쓰임" text={note.use} />
    </div>
  )
}
