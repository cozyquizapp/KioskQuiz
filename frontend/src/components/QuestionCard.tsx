import { AnyQuestion } from '@shared/quizTypes';
import { categoryIcons } from '../categoryAssets';
import { categoryColors } from '../categoryColors';
import { theme } from '../theme';

interface Props {
  question: AnyQuestion;
  compact?: boolean; // compact = keine Punkte, kein Bild (z. B. Team/Admin)
}

const badgeBase: React.CSSProperties = {
  display: 'inline-block',
  padding: '4px 8px',
  borderRadius: 999,
  fontSize: 12,
  color: '#0d0f14',
  marginRight: 8,
  fontWeight: 700,
  letterSpacing: 0.2
};

function QuestionCard({ question, compact }: Props) {
  const icon = categoryIcons[question.category];
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(214,162,255,0.08), rgba(21,24,36,0.9))',
        borderRadius: theme.radius,
        padding: theme.spacing(1),
        border: '1px solid #2b3444',
        boxShadow: '0 12px 28px rgba(0,0,0,0.28)'
      }}
    >
      <div style={{ marginBottom: 8 }}>
        {icon && (
          <img
            src={icon}
            alt={question.category}
            style={{ width: 32, height: 32, objectFit: 'contain', verticalAlign: 'middle', marginRight: 6 }}
          />
        )}
        <span
          style={{
            ...badgeBase,
            background: categoryColors[question.category] ?? 'var(--surface-2)'
          }}
        >
          {question.category}
        </span>
        <span style={{ ...badgeBase, background: 'var(--surface-2)', color: 'var(--muted)' }}>
          {question.mechanic}
        </span>
        {!compact && (
          <span style={{ ...badgeBase, background: 'var(--surface-2)', color: 'var(--muted)' }}>
            {question.points} Punkte
          </span>
        )}
      </div>
      <strong>{question.question}</strong>
      {!compact && question.media && question.media.type === 'image' && (
        <div style={{ marginTop: 8 }}>
          <img
            src={question.media.url}
            alt={question.media.alt ?? ''}
            style={{ width: '100%', borderRadius: theme.radius }}
          />
        </div>
      )}
    </div>
  );
}

export default QuestionCard;
