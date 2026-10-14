import type { CSSProperties } from "react";
import type { Crop } from "../../types/prediction";

const neurons = [
  [212, 54], [171, 70], [253, 68], [132, 99], [204, 101], [287, 101],
  [97, 136], [161, 138], [240, 137], [323, 139], [126, 177], [194, 170],
  [274, 174], [341, 179], [157, 211], [225, 207], [301, 213], [192, 246],
  [260, 248], [226, 277], [82, 176], [356, 127], [112, 224], [332, 232],
] as const;

const connections = [
  [0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5], [3, 4], [3, 6],
  [3, 7], [4, 7], [4, 8], [5, 8], [5, 9], [6, 7], [6, 20], [7, 10],
  [7, 11], [8, 11], [8, 12], [8, 13], [9, 13], [9, 21], [10, 11],
  [10, 14], [10, 22], [11, 12], [11, 15], [12, 13], [12, 16], [13, 23],
  [14, 15], [14, 17], [15, 16], [15, 18], [16, 18], [16, 23], [17, 18],
  [17, 19], [18, 19], [20, 10], [21, 13], [22, 17], [23, 18],
] as const;

const brainOutline =
  "M218 40C193 25 157 39 148 62C119 57 96 79 101 106C75 110 69 140 87 159C70 181 82 207 105 214C109 244 138 257 161 245C179 267 207 259 220 241C234 260 262 264 282 245C308 257 338 238 339 212C363 202 368 175 350 158C367 135 355 109 333 103C337 75 312 57 285 64C273 38 240 28 218 40Z";

function BrainSvg() {
  return (
    <svg
      className="brain-network"
      viewBox="0 0 440 310"
      role="img"
      aria-label="Decorative animation of an interconnected neural network"
    >
      <defs>
        <radialGradient id="brain-glow">
          <stop offset="0" stopColor="#75e9ff" stopOpacity=".2" />
          <stop offset=".7" stopColor="#556aff" stopOpacity=".06" />
          <stop offset="1" stopColor="#101425" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="brain-outline" x1="0" x2="1" y1="0" y2="1">
          <stop stopColor="#5eeaff" />
          <stop offset=".48" stopColor="#8588ff" />
          <stop offset="1" stopColor="#bc80ff" />
        </linearGradient>
        <clipPath id="brain-clip">
          <path d={brainOutline} />
        </clipPath>
      </defs>

      <ellipse cx="220" cy="158" rx="192" ry="154" fill="url(#brain-glow)" />
      <g className="brain-network-shell">
        <path d={brainOutline} fill="rgba(38, 53, 93, .22)" stroke="url(#brain-outline)" strokeWidth="1.5" />
        <path d="M220 45C214 83 226 103 218 142C211 181 228 204 220 249" fill="none" stroke="#94a6ff" strokeOpacity=".35" strokeWidth="1" strokeDasharray="3 6" />
      </g>
      <g clipPath="url(#brain-clip)">
        <g className="brain-connections">
          {connections.map(([from, to], index) => {
            const [x1, y1] = neurons[from];
            const [x2, y2] = neurons[to];
            const style: CSSProperties = { animationDelay: `${(index % 11) * -0.31}s` };
            return (
              <line
                key={`${from}-${to}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                style={style}
              />
            );
          })}
        </g>
        <g className="brain-neurons">
          {neurons.map(([cx, cy], index) => {
            const style: CSSProperties = { animationDelay: `${(index % 9) * -0.24}s` };
            return (
              <g className="brain-neuron" key={`${cx}-${cy}`} style={style}>
                <circle className="brain-neuron-halo" cx={cx} cy={cy} r={index % 5 === 0 ? 10 : 6} />
                <circle className="brain-neuron-core" cx={cx} cy={cy} r={index % 5 === 0 ? 3 : 2} />
              </g>
            );
          })}
        </g>
        <circle className="brain-scan-line" cx="220" cy="0" r="0" />
        <path className="brain-scan-band" d="M58 155H382" />
      </g>
      <circle className="brain-particle brain-particle-one" cx="77" cy="97" r="2" />
      <circle className="brain-particle brain-particle-two" cx="355" cy="83" r="1.5" />
      <circle className="brain-particle brain-particle-three" cx="375" cy="217" r="2" />
      <circle className="brain-particle brain-particle-four" cx="90" cy="245" r="1.5" />
    </svg>
  );
}

interface BrainNetworkProps {
  state: "ready" | "processing" | "complete";
  crop: Crop | null;
  selectedCrop: Crop | "auto";
}

const models: { id: Crop | "auto"; title: string; description: string }[] = [
  {
    id: "auto",
    title: "Crop Identifier",
    description: "Wheat · Maize · Other",
  },
  {
    id: "maize",
    title: "Maize Disease Detection",
    description: "Blight · Rust · Leaf spot · Healthy",
  },
  {
    id: "wheat",
    title: "Wheat Disease Detection",
    description: "Healthy · Septoria · Stripe rust",
  },
];

export function BrainNetwork({
  state,
  crop,
  selectedCrop,
}: BrainNetworkProps) {
  const target = state === "complete" ? crop : selectedCrop;
  const routeTarget = target === "auto" ? "identifier" : target;

  return (
    <div
      className={`neural-stage neural-stage--${state}`}
      data-state={state}
      data-target={routeTarget ?? ""}
      role="group"
      aria-label={
        state === "processing"
          ? target === "auto"
            ? "AI brain routing the uploaded image to the crop identifier"
            : `AI brain sending the uploaded image directly to the ${target} disease model`
          : state === "complete"
            ? `AI brain completed analysis with the ${crop} disease model`
            : "AI brain ready for crop identification"
      }
    >
      <svg
        className="neural-routes"
        viewBox="0 0 1000 380"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="route-gradient" x1="0" x2="1">
            <stop stopColor="#52dfff" />
            <stop offset=".52" stopColor="#8b8aff" />
            <stop offset="1" stopColor="#ed82df" />
          </linearGradient>
        </defs>
        <path id="route-identifier" className="neural-route" stroke="url(#route-gradient)" d="M480 190 C545 190 560 92 650 92" />
        <path id="route-maize" className="neural-route" stroke="url(#route-gradient)" d="M480 190 C550 190 570 190 650 190" />
        <path id="route-wheat" className="neural-route" stroke="url(#route-gradient)" d="M480 190 C545 190 560 288 650 288" />
        {state === "processing" ? (
          <>
            <circle className="neural-signal" r="4">
              <animateMotion dur="1.5s" repeatCount="indefinite">
                <mpath href={`#route-${routeTarget}`} />
              </animateMotion>
            </circle>
            <circle className="neural-signal neural-signal--second" r="2.6">
              <animateMotion dur="1.5s" begin="-0.72s" repeatCount="indefinite">
                <mpath href={`#route-${routeTarget}`} />
              </animateMotion>
            </circle>
          </>
        ) : null}
      </svg>
      <div className="brain-visual">
        <span className="neural-coordinate neural-coordinate-top">NEURAL ACTIVITY</span>
        <BrainSvg />
        <span className="neural-coordinate neural-coordinate-bottom">
          {state === "complete"
            ? "SIGNAL COMPLETE"
            : state === "processing"
              ? "SIGNAL ACTIVE"
              : "IMAGE LINKED · READY"}
        </span>
      </div>
      <div className="model-rail" role="group" aria-label="Choose a prediction model">
        {models.map((model) => {
          const selected = target === model.id;
          const completed = state === "complete" && selected;
          return (
            <button
              className={`model-card${selected ? " is-selected" : ""}${state === "processing" && !selected ? " is-dim" : ""}${completed ? " is-complete" : ""}`}
              key={model.id}
              type="button"
              aria-pressed={selected}
              disabled
            >
              <span className={`model-card-icon model-card-icon--${model.id}`} aria-hidden="true">
                {model.id === "auto" ? "◎" : model.id === "maize" ? "✳" : "⌁"}
              </span>
              <span className="model-card-copy">
                <strong>{model.title}</strong>
                <small>{model.description}</small>
              </span>
              <span className="model-card-state">
                {completed
                  ? "DONE"
                  : model.id === "auto"
                    ? state === "processing" && selectedCrop === "auto"
                      ? "IDENTIFYING"
                      : selectedCrop === "auto"
                        ? "AUTO"
                        : "IDENTIFIED"
                    : selected
                      ? state === "processing"
                        ? "RUNNING"
                        : "ROUTED"
                      : state === "processing"
                        ? "WAITING"
                        : "STANDBY"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
