const ROBOFLOW_API_URL = "https://serverless.roboflow.com";
const WORKSPACE = "ekadelaaa-gmail-com";
const WORKFLOW_ID = "general-segmentation-api-2";
const CLASSES = "pothole, Alligator, Edge Cracking, Lateral-Crack, Longitudinal-Crack";

// Skor kerusakan per jenis (0-100), makin tinggi makin parah
const DAMAGE_SCORES: Record<string, number> = {
  pothole: 95,
  Alligator: 85,
  "Edge Cracking": 60,
  "Lateral-Crack": 50,
  "Longitudinal-Crack": 35,
};

export interface AIDetectionResult {
  labels: string[];        // jenis kerusakan yang terdeteksi
  damageScore: number;     // 0-100
  kepadatanScore: number;  // 0-100 (dummy)
  indeksPrioritas: number; // IP = 60% damage + 40% kepadatan
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Fleksibel karena struktur response workflow Roboflow bisa bervariasi
function extractLabels(data: unknown): string[] {
  if (!data) return [];

  const tryPaths = [
    (d: unknown) => (d as any)?.[0]?.output?.predictions,
    (d: unknown) => (d as any)?.outputs?.[0]?.predictions?.predictions,
    (d: unknown) => (d as any)?.predictions?.predictions,
    (d: unknown) => (d as any)?.predictions,
    (d: unknown) => (d as any)?.[0]?.predictions,
  ];

  for (const getPath of tryPaths) {
    const preds = getPath(data);
    if (Array.isArray(preds) && preds.length > 0) {
      return [
        ...new Set(
          preds
            .map((p: { class?: string }) => p.class)
            .filter((c): c is string => Boolean(c))
        ),
      ];
    }
  }

  return [];
}

function calcDamageScore(labels: string[]): number {
  if (labels.length === 0) return 0;
  return Math.max(...labels.map((l) => DAMAGE_SCORES[l] ?? 20));
}

export function generateDummyKepadatan(): number {
  return Math.floor(Math.random() * 80) + 20;
}

export function calculateIP(damageScore: number, kepadatanScore: number): number {
  return Math.round(0.6 * damageScore + 0.4 * kepadatanScore);
}

export function getIPLabel(ip: number): string {
  if (ip >= 80) return "Darurat";
  if (ip >= 60) return "Tinggi";
  if (ip >= 40) return "Sedang";
  return "Rendah";
}

export function getIPColor(ip: number): string {
  if (ip >= 80) return "#ef4444";
  if (ip >= 60) return "#f59e0b";
  if (ip >= 40) return "#f97316";
  return "#22c55e";
}

export async function detectRoadDamage(file: File): Promise<AIDetectionResult> {
  const apiKey = import.meta.env.VITE_ROBOFLOW_API_KEY;
  if (!apiKey || apiKey === "GANTI_DENGAN_API_KEY_BARU_KAMU") {
    throw new Error("API key belum dikonfigurasi di file .env");
  }

  const base64 = await fileToBase64(file);

  const response = await fetch(
    `${ROBOFLOW_API_URL}/${WORKSPACE}/workflows/${WORKFLOW_ID}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        inputs: {
          image: { type: "base64", value: base64 },
          classes: CLASSES,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Roboflow error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log("Roboflow raw response:", data);

  const labels = extractLabels(data);
  const damageScore = calcDamageScore(labels);
  const kepadatanScore = generateDummyKepadatan();
  const indeksPrioritas = calculateIP(damageScore, kepadatanScore);

  return { labels, damageScore, kepadatanScore, indeksPrioritas };
}
