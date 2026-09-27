export default function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {description && <span>{description}</span>}
      {action}
    </div>
  );
}
