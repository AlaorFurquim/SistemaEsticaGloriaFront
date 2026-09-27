export default function ModuleTabs({ tabs, active, onChange }) {
  return (
    <div className="module-tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          className={active === tab.id ? "active" : ""}
          onClick={() => onChange(tab.id)}
        >
          <span>{tab.label}</span>
          {tab.description && <small>{tab.description}</small>}
        </button>
      ))}
    </div>
  );
}
