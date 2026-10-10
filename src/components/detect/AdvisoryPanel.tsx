import { getDiseaseInfo, displayClassLabel } from "../../data/diseaseInfo";

export function AdvisoryPanel({ predictedClass }: { predictedClass: string }) {
  const info = getDiseaseInfo(predictedClass);

  if (!info) {
    return (
      <section className="card limitations">
        <h3>Agricultural advisory</h3>
        <p>
          The backend returned <strong>{displayClassLabel(predictedClass)}</strong>,
          which is outside the three reviewed classes. No disease-specific
          advisory is shown for unexpected labels.
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <h3>Agricultural advisory</h3>
      <p>{info.description}</p>
      <h4>General guidance</h4>
      <ul>
        {info.advisory.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h4>What this model does not do</h4>
      <ul>
        {info.limitations.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="muted">
        This is general crop information, not a confirmed diagnosis or a
        treatment prescription.
      </p>
    </section>
  );
}
