import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Upload, X, Camera, Cpu, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Card } from "../components/ui/card";
import { MapPicker } from "../components/MapPicker";
import {
  detectRoadDamage,
  getIPLabel,
  getIPColor,
  type AIDetectionResult,
} from "../services/aiDetection";

const DAMAGE_LABEL_ID: Record<string, string> = {
  pothole: "Lubang (Pothole)",
  Alligator: "Retak Buaya (Alligator Crack)",
  "Edge Cracking": "Retak Tepi",
  "Lateral-Crack": "Retak Lateral",
  "Longitudinal-Crack": "Retak Memanjang",
};

export function Pelaporan() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nama: "",
    email: "",
    telepon: "",
    alamat: "",
    deskripsi: "",
    location: { lat: -6.2088, lng: 106.8456, address: "" },
  });
  const [images, setImages] = useState<{ id: string; preview: string; file?: File }[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIDetectionResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      preview: URL.createObjectURL(file),
      file,
    }));

    setImages((prev) => [...prev, ...newImages].slice(0, 3));
    // Reset AI result jika user ganti foto
    setAiResult(null);
    setAiError(null);
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    setAiResult(null);
    setAiError(null);
  };

  const handleAnalyze = async () => {
    const firstImageWithFile = images.find((img) => img.file);
    if (!firstImageWithFile?.file) return;

    setIsAnalyzing(true);
    setAiError(null);
    setAiResult(null);

    try {
      const result = await detectRoadDamage(firstImageWithFile.file);
      setAiResult(result);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Gagal menganalisis gambar");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const reportId = `RPT${Date.now()}`;
    const report = {
      id: reportId,
      ...formData,
      images: images.map((img) => img.preview),
      status: "pending",
      tanggal: new Date().toISOString(),
      aiDetection: aiResult ?? null,
    };

    const existingReports = JSON.parse(localStorage.getItem("reports") || "[]");
    localStorage.setItem("reports", JSON.stringify([report, ...existingReports]));

    navigate(`/konfirmasi/${reportId}`);
  };

  const ipColor = aiResult ? getIPColor(aiResult.indeksPrioritas) : null;
  const ipLabel = aiResult ? getIPLabel(aiResult.indeksPrioritas) : null;

  return (
    <div className="min-h-screen p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4 text-primary hover:text-primary/80"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Kembali
          </Button>
          <h1 className="text-3xl text-primary mb-2">Laporan Jalan Rusak</h1>
          <p className="text-muted-foreground">
            Isi formulir di bawah untuk melaporkan kondisi jalan rusak
          </p>
        </div>

        {/* Form */}
        <Card className="p-6 bg-card border-2 border-border">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Info */}
            <div className="space-y-4">
              <h3 className="text-lg text-foreground">Data Pelapor</h3>

              <div>
                <label className="text-sm text-foreground">Nama</label>
                <Input
                  required
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Nama lengkap Anda"
                  className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="text-sm text-foreground">Email</label>
                <Input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="text-sm text-foreground">Nomor Telepon</label>
                <Input
                  required
                  type="tel"
                  value={formData.telepon}
                  onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                  placeholder="08xx-xxxx-xxxx"
                  className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-lg text-foreground">Lokasi & Detail</h3>

              <MapPicker
                onLocationSelect={(location) => setFormData({ ...formData, location })}
              />

              <div>
                <label className="text-sm text-foreground">Alamat Detail</label>
                <Textarea
                  required
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  placeholder="Jl. Nama Jalan, No. Rumah/Patokan, Kelurahan, Kecamatan"
                  className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground min-h-20"
                />
              </div>

              <div>
                <label className="text-sm text-foreground">Deskripsi Kerusakan</label>
                <Textarea
                  required
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  placeholder="Jelaskan kondisi kerusakan jalan (misalnya: lubang besar, aspal retak, dll)"
                  className="mt-1 bg-input border-border text-foreground placeholder:text-muted-foreground min-h-24"
                />
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-4">
              <h3 className="text-lg text-foreground">Foto Kerusakan</h3>
              <p className="text-sm text-muted-foreground">
                Upload maksimal 3 foto. Foto pertama akan dianalisis oleh AI.
              </p>

              <div className="grid grid-cols-3 gap-4">
                {images.map((image) => (
                  <div key={image.id} className="relative aspect-square">
                    <img
                      src={image.preview}
                      alt="Preview"
                      className="w-full h-full object-cover rounded-lg border-2 border-border"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(image.id)}
                      className="absolute -top-2 -right-2 p-1 bg-destructive rounded-full text-destructive-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {images.length < 3 && (
                  <label className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">Upload Foto</span>
                  </label>
                )}
              </div>

              {/* Tombol Analisis AI */}
              {images.length > 0 && (
                <div className="space-y-3">
                  <Button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !images.find((img) => img.file)}
                    className="w-full bg-[#45A29E] hover:bg-[#45A29E]/80 text-white gap-2"
                  >
                    <Cpu className="w-4 h-4" />
                    {isAnalyzing ? "Menganalisis gambar..." : "Analisis Kerusakan dengan AI"}
                  </Button>

                  {/* Error */}
                  {aiError && (
                    <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{aiError}</span>
                    </div>
                  )}

                  {/* Hasil Analisis */}
                  {aiResult && (
                    <div className="p-4 bg-muted/30 border border-border rounded-lg space-y-3">
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-[#66FCF1]" />
                        <span>Hasil Analisis AI</span>
                      </div>

                      {/* Jenis kerusakan */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Jenis Kerusakan Terdeteksi</p>
                        {aiResult.labels.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {aiResult.labels.map((label) => (
                              <span
                                key={label}
                                className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full border border-primary/30"
                              >
                                {DAMAGE_LABEL_ID[label] ?? label}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Tidak ada kerusakan terdeteksi</span>
                        )}
                      </div>

                      {/* Skor */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-card rounded-lg border border-border">
                          <p className="text-xs text-muted-foreground">Skor Kerusakan</p>
                          <p className="text-lg" style={{ color: getIPColor(aiResult.damageScore) }}>
                            {aiResult.damageScore}
                          </p>
                          <p className="text-xs text-muted-foreground">/ 100</p>
                        </div>
                        <div className="p-2 bg-card rounded-lg border border-border">
                          <p className="text-xs text-muted-foreground">Kepadatan Jalan</p>
                          <p className="text-lg text-foreground">{aiResult.kepadatanScore}</p>
                          <p className="text-xs text-muted-foreground">/ 100</p>
                        </div>
                        <div className="p-2 bg-card rounded-lg border border-border">
                          <p className="text-xs text-muted-foreground">Indeks Prioritas</p>
                          <p className="text-lg font-bold" style={{ color: ipColor! }}>
                            {aiResult.indeksPrioritas}
                          </p>
                          <p className="text-xs" style={{ color: ipColor! }}>{ipLabel}</p>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        IP = 60% Skor Kerusakan + 40% Kepadatan Jalan
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/")}
                className="flex-1 border-border text-foreground hover:bg-muted"
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Kirim Laporan
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
