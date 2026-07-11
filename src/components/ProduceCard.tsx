import type { CardView } from '../card'
import { PriceBlock } from './PriceBlock'
import { Sparkline } from './Sparkline'
import { Note } from './Note'
import { PeakDot } from './PeakDot'

export function ProduceCard({ card }: { card: CardView }) {
  return (
    <details className="card" data-cat={card.category}>
      <summary>
        <div className="summary-row">
          <span className="id">
            <span className="emoji">{card.emoji}</span>
            <span>
              <span className="card-title">
                {card.name}
                {card.inPeak && <PeakDot />}
              </span>
              <span className="kind">{card.kind}</span>
            </span>
          </span>
          {card.price && <PriceBlock price={card.price} />}
        </div>
        {card.whyNow && <p className="why">{card.whyNow}</p>}
      </summary>
      <div className="open">
        {card.price?.spark && <Sparkline spark={card.price.spark} />}
        <Note note={card.note} />
      </div>
    </details>
  )
}
