import { useState, useRef, useEffect } from "react";

const FACE_SIZE = 12;
const PIXEL_SCALE = 6;

function generateFace(seed, variation = 0.3) {
  const face = [];
  const base = [
    [20,20,30,40,50,60,60,60,50,40,30,20],
    [20,40,80,120,140,150,150,140,120,80,40,20],
    [30,80,140,180,200,210,210,200,180,140,80,30],
    [40,120,180,210,220,225,225,220,210,180,120,40],
    [50,140,200,220,60,230,230,60,220,200,140,50],
    [60,150,210,225,50,235,235,50,225,210,150,60],
    [60,150,210,225,230,235,235,230,225,210,150,60],
    [60,140,200,210,220,180,180,220,210,200,140,60],
    [50,120,180,200,100,190,190,100,200,180,120,50],
    [40,80,140,170,180,120,120,180,170,140,80,40],
    [30,40,80,120,140,150,150,140,120,80,40,30],
    [20,20,30,40,50,60,60,60,50,40,30,20],
  ];
  for (let y = 0; y < FACE_SIZE; y++) {
    face[y] = [];
    for (let x = 0; x < FACE_SIZE; x++) {
      const noise = (Math.sin(seed * 13.7 + x * 7.3 + y * 11.1) * 0.5 + 0.5) * variation;
      face[y][x] = Math.max(0, Math.min(255, Math.round(base[y][x] + (noise - 0.25) * 120)));
    }
  }
  return face;
}

function computeMeanFace(faces) {
  const mean = Array.from({ length: FACE_SIZE }, () => Array(FACE_SIZE).fill(0));
  for (const f of faces) {
    for (let y = 0; y < FACE_SIZE; y++)
      for (let x = 0; x < FACE_SIZE; x++)
        mean[y][x] += f[y][x];
  }
  for (let y = 0; y < FACE_SIZE; y++)
    for (let x = 0; x < FACE_SIZE; x++)
      mean[y][x] = Math.round(mean[y][x] / faces.length);
  return mean;
}

function subtractFaces(a, b) {
  return a.map((row, y) => row.map((v, x) => v - b[y][x]));
}

function addWeighted(base, eigenface, weight) {
  return base.map((row, y) =>
    row.map((v, x) => Math.max(0, Math.min(255, Math.round(v + eigenface[y][x] * weight))))
  );
}

function FaceGrid({ face, size = PIXEL_SCALE, label, highlight = false, showValues = false }) {
  const w = FACE_SIZE * size;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        style={{
          width: w, height: w,
          border: highlight ? "2px solid #ff6b6b" : "1px solid rgba(255,255,255,0.15)",
          borderRadius: 4,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {face.map((row, y) =>
          row.map((val, x) => {
            const v = Math.max(0, Math.min(255, val));
            return (
              <div
                key={`${y}-${x}`}
                style={{
                  position: "absolute",
                  left: x * size,
                  top: y * size,
                  width: size,
                  height: size,
                  backgroundColor: `rgb(${v},${v},${v})`,
                  fontSize: size > 10 && showValues ? 7 : 0,
                  color: v > 128 ? "#222" : "#ddd",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                }}
              >
                {size > 10 && showValues ? v : ""}
              </div>
            );
          })
        )}
      </div>
      {label && (
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", textAlign: "center", maxWidth: w }}>
          {label}
        </span>
      )}
    </div>
  );
}

function Section({ title, children, step }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "linear-gradient(135deg, #ff6b6b, #c44569)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0,
          }}
        >
          {step}
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#e8e8e8", margin: 0 }}>{title}</h2>
      </div>
      <div style={{ paddingLeft: 44 }}>{children}</div>
    </div>
  );
}

export default function EigenfacesIntro() {
  const [weight1, setWeight1] = useState(0);
  const [weight2, setWeight2] = useState(0);
  const [showValues, setShowValues] = useState(false);
  const [probeIdx, setProbeIdx] = useState(0);

  const faces = useRef(
    Array.from({ length: 8 }, (_, i) => generateFace(i * 3.7 + 1, 0.35))
  ).current;

  const meanFace = useRef(computeMeanFace(faces)).current;
  const deviations = useRef(faces.map((f) => subtractFaces(f, meanFace))).current;

  const eigenface1 = useRef(
    deviations[0].map((row, y) =>
      row.map((_, x) => {
        let sum = 0;
        for (const d of deviations) sum += d[y][x];
        return sum / deviations.length;
      })
    )
  ).current;

  const eigenface2 = useRef(
    deviations[1].map((row, y) =>
      row.map((_, x) => {
        let sum = 0;
        for (let i = 0; i < deviations.length; i++) sum += deviations[i][y][x] * (i % 2 === 0 ? 1 : -1);
        return sum / deviations.length;
      })
    )
  ).current;

  const reconstructed = addWeighted(addWeighted(meanFace, eigenface1, weight1 / 50), eigenface2, weight2 / 50);

  const distances = faces.map((f) => {
    let d = 0;
    for (let y = 0; y < FACE_SIZE; y++)
      for (let x = 0; x < FACE_SIZE; x++)
        d += (f[y][x] - faces[probeIdx][y][x]) ** 2;
    return Math.sqrt(d);
  });

  const maxDist = Math.max(...distances.filter((_, i) => i !== probeIdx));

  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
        background: "linear-gradient(160deg, #0d0d1a 0%, #1a1025 40%, #0d1a1a 100%)",
        color: "#d4d4d4",
        minHeight: "100vh",
        padding: "32px 24px",
      }}
    >
      <header style={{ textAlign: "center", marginBottom: 48 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#ff6b6b",
            marginBottom: 8,
          }}
        >
          Miroir Noir Biometric Division
        </div>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 300,
            color: "#f0f0f0",
            letterSpacing: -0.5,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Eigenfaces
        </h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 8, maxWidth: 500, margin: "8px auto 0" }}>
          How a database of faces becomes a coordinate system for identity
        </p>
      </header>

      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <Section step="1" title="A face is a vector">
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.65)", marginBottom: 16 }}>
            A 12×12 greyscale image has 144 pixels. Each pixel is a number between 0 and 255.
            We can read the image row by row into a single list of 144 numbers: a <strong style={{ color: "#ff6b6b" }}>vector</strong>.
            Every face lives as a point in 144-dimensional space.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <FaceGrid face={faces[0]} size={14} showValues={showValues} label="Face #1" />
            <div style={{ fontSize: 24, color: "rgba(255,255,255,0.3)" }}>→</div>
            <div
              style={{
                background: "rgba(255,255,255,0.05)",
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 10,
                color: "rgba(255,255,255,0.5)",
                maxWidth: 300,
                wordBreak: "break-all",
                lineHeight: 1.6,
              }}
            >
              [{faces[0].flat().slice(0, 24).join(", ")}, ...]
            </div>
          </div>
          <button
            onClick={() => setShowValues(!showValues)}
            style={{
              marginTop: 12, fontSize: 11, padding: "4px 12px",
              background: "rgba(255,107,107,0.15)", color: "#ff6b6b",
              border: "1px solid rgba(255,107,107,0.3)", borderRadius: 4, cursor: "pointer",
            }}
          >
            {showValues ? "Hide pixel values" : "Show pixel values"}
          </button>
        </Section>

        <Section step="2" title="A dataset of faces">
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.65)", marginBottom: 16 }}>
            Miroir Noir's archive contains thousands of faces. Here are eight.
            Each is a point in 144-dimensional space. Together they form a <strong style={{ color: "#ff6b6b" }}>cloud</strong>.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {faces.map((f, i) => (
              <FaceGrid key={i} face={f} size={5} label={`#${i + 1}`} />
            ))}
          </div>
        </Section>

        <Section step="3" title="The mean face">
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.65)", marginBottom: 16 }}>
            Average every pixel across all faces. The result is the <strong style={{ color: "#ff6b6b" }}>mean face</strong>: the centroid of the cloud.
            It captures what all faces have in common and washes out individual features.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 200 }}>
              {faces.slice(0, 4).map((f, i) => (
                <FaceGrid key={i} face={f} size={3} />
              ))}
            </div>
            <div style={{ fontSize: 20, color: "rgba(255,255,255,0.3)" }}>→ avg →</div>
            <FaceGrid face={meanFace} size={10} label="Mean face" highlight />
          </div>
        </Section>

        <Section step="4" title="Deviation: what makes you you">
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.65)", marginBottom: 16 }}>
            Subtract the mean face from each face. What remains is the <strong style={{ color: "#ff6b6b" }}>deviation</strong>:
            the part of the face that is unique to that individual. Light pixels = brighter than average.
            Dark pixels = darker than average.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            {deviations.slice(0, 4).map((d, i) => {
              const shifted = d.map((row) => row.map((v) => Math.max(0, Math.min(255, v + 128))));
              return <FaceGrid key={i} face={shifted} size={7} label={`Deviation #${i + 1}`} />;
            })}
          </div>
        </Section>

        <Section step="5" title="Eigenfaces: the axes of face-space">
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.65)", marginBottom: 16 }}>
            The covariance matrix of deviations reveals <strong style={{ color: "#ff6b6b" }}>eigenfaces</strong>: the directions
            along which faces vary the most. Each eigenface is itself a ghostly image. The first
            eigenface captures the most variation, the second captures the next-most, and so on.
          </p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <FaceGrid
              face={eigenface1.map((row) => row.map((v) => Math.max(0, Math.min(255, v * 3 + 128))))}
              size={10}
              label="Eigenface 1"
            />
            <FaceGrid
              face={eigenface2.map((row) => row.map((v) => Math.max(0, Math.min(255, v * 3 + 128))))}
              size={10}
              label="Eigenface 2"
            />
          </div>
        </Section>

        <Section step="6" title="Reconstruction: mean + weighted eigenfaces">
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.65)", marginBottom: 16 }}>
            Any face can be approximated as the mean face plus a weighted combination of eigenfaces.
            Drag the sliders to see how changing the weights morphs the reconstructed face.
          </p>
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <FaceGrid face={reconstructed} size={14} label="Reconstructed" highlight />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 4 }}>
                  Weight 1: {(weight1 / 50).toFixed(2)}
                </label>
                <input
                  type="range" min={-100} max={100} value={weight1}
                  onChange={(e) => setWeight1(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 4 }}>
                  Weight 2: {(weight2 / 50).toFixed(2)}
                </label>
                <input
                  type="range" min={-100} max={100} value={weight2}
                  onChange={(e) => setWeight2(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 6,
                  padding: 12,
                  fontSize: 11,
                  color: "rgba(255,255,255,0.45)",
                  lineHeight: 1.8,
                }}
              >
                face ≈ mean + ({(weight1 / 50).toFixed(2)}) × eigenface₁ + ({(weight2 / 50).toFixed(2)}) × eigenface₂
              </div>
            </div>
          </div>
        </Section>

        <Section step="7" title="Recognition: who is this face?">
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.65)", marginBottom: 16 }}>
            To recognise a face: project it onto the eigenface basis, then measure the <strong style={{ color: "#ff6b6b" }}>distance</strong> to every
            stored face in the database. The closest match is the identity. Click a face below to use it as the probe.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {faces.map((f, i) => (
              <div
                key={i}
                onClick={() => setProbeIdx(i)}
                style={{ cursor: "pointer", opacity: probeIdx === i ? 1 : 0.5, transition: "opacity 0.2s" }}
              >
                <FaceGrid face={f} size={5} label={probeIdx === i ? "PROBE" : `#${i + 1}`} highlight={probeIdx === i} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 100 }}>
            {distances.map((d, i) => {
              const h = maxDist > 0 ? (d / maxDist) * 80 : 0;
              const isProbe = i === probeIdx;
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.4)" }}>
                    {isProbe ? "0" : Math.round(d)}
                  </span>
                  <div
                    style={{
                      width: 32, height: isProbe ? 2 : Math.max(4, h),
                      background: isProbe
                        ? "#ff6b6b"
                        : `rgba(107, 200, 255, ${0.3 + (1 - d / (maxDist || 1)) * 0.7})`,
                      borderRadius: 2,
                      transition: "height 0.3s",
                    }}
                  />
                  <span style={{ fontSize: 9, color: isProbe ? "#ff6b6b" : "rgba(255,255,255,0.35)" }}>
                    #{i + 1}
                  </span>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 8 }}>
            Distance = 0 for the probe itself. The shortest bar among the rest is the best match.
          </p>
        </Section>

        <div
          style={{
            marginTop: 48,
            padding: 20,
            background: "rgba(255,107,107,0.06)",
            border: "1px solid rgba(255,107,107,0.15)",
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.7 }}>
            In the real system, eigenfaces are computed via <strong style={{ color: "#ff6b6b" }}>PCA</strong> (Principal Component Analysis)
            on the covariance matrix. The face embeddings and their coordinates live in a
            <strong style={{ color: "#ff6b6b" }}> MySQL database</strong>. This week, you will build it.
          </p>
        </div>
      </div>
    </div>
  );
}
