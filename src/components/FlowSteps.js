export default function FlowSteps({ steps }) {
  return (
    <div className="flow-steps">
      {steps.map((step, index) => (
        <div key={step.title} className={step.done ? "done" : step.active ? "active" : ""}>
          <strong>{index + 1}</strong>
          <span>{step.title}</span>
          {step.detail && <small>{step.detail}</small>}
        </div>
      ))}
    </div>
  );
}
