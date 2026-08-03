import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Shield,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { getIPLabel, getIPColor } from "../services/aiDetection";

const DAMAGE_LABEL_ID: Record<string, string> = {
  pothole: "Lubang",
  Alligator: "Retak Buaya",
  "Edge Cracking": "Retak Tepi",
  "Lateral-Crack": "Retak Lateral",
  "Longitudinal-Crack": "Retak Memanjang",
};

type ReportStatus = "pending" | "in_progress" | "verified" | "completed";

interface AIDetection {
  labels: string[];
  damageScore: number;
  kepadatanScore: number;
  indeksPrioritas: number;
}

interface Report {
  id: string;
  nama: string;
  email: string;
  telepon: string;
  alamat: string;
  deskripsi: string;
  location: { lat: number; lng: number; address: string };
  images: string[];
  status: ReportStatus;
  tanggal: string;
  aiDetection: AIDetection | null;
}

const STATUS_OPTIONS: { value: ReportStatus; label: string; color: string }[] = [
  { value: "pending", label: "Laporan Terkirim", color: "#6b7280" },
  { value: "in_progress", label: "Sedang Ditinjau", color: "#f59e0b" },
  { value: "verified", label: "Jalan Diperbaiki", color: "#22c55e" },
  { value: "completed", label: "Tidak Perlu Perbaikan", color: "#3b82f6" },
];

function getStatusStyle(status: ReportStatus) {
  return STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];
}

function IPBar({ value }: { value: number }) {
  const color = getIPColor(value);
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">Indeks Prioritas</span>
        <span className="text-sm font-bold" style={{ color }}>
          {value} — {getIPLabel(value)}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function Admin() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ReportStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"ip" | "tanggal">("ip");

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("reports") || "[]");
    setReports(data);
  }, []);

  const updateStatus = (id: string, status: ReportStatus) => {
    const updated = reports.map((r) => (r.id === id ? { ...r, status } : r));
    setReports(updated);
    localStorage.setItem("reports", JSON.stringify(updated));
  };

  const filtered = reports
    .filter((r) => filterStatus === "all" || r.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === "ip") {
        const ipA = a.aiDetection?.indeksPrioritas ?? 0;
        const ipB = b.aiDetection?.indeksPrioritas ?? 0;
        return ipB - ipA;
      }
      return new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime();
    });

  const stats = {
    total: reports.length,
    pending: reports.filter((r) => r.status === "pending").length,
    in_progress: reports.filter((r) => r.status === "in_progress").length,
    darurat: reports.filter((r) => (r.aiDetection?.indeksPrioritas ?? 0) >= 80).length,
  };

  return (
    <div className="min-h-screen p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
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
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-7 h-7 text-primary" />
            <h1 className="text-3xl text-primary">Dashboard Admin</h1>
          </div>
          <p className="text-muted-foreground">
            Kelola laporan dan prioritaskan perbaikan berdasarkan Indeks Prioritas AI
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 bg-card border-border text-center">
            <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Laporan</p>
          </Card>
          <Card className="p-4 bg-card border-border text-center">
            <Clock className="w-5 h-5 text-[#6b7280] mx-auto mb-1" />
            <p className="text-2xl text-foreground">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Menunggu</p>
          </Card>
          <Card className="p-4 bg-card border-border text-center">
            <AlertTriangle className="w-5 h-5 text-[#f59e0b] mx-auto mb-1" />
            <p className="text-2xl text-foreground">{stats.in_progress}</p>
            <p className="text-xs text-muted-foreground">Sedang Ditinjau</p>
          </Card>
          <Card className="p-4 bg-card border-border text-center">
            <AlertTriangle className="w-5 h-5 text-[#ef4444] mx-auto mb-1" />
            <p className="text-2xl text-foreground">{stats.darurat}</p>
            <p className="text-xs text-muted-foreground">IP Darurat (≥80)</p>
          </Card>
        </div>

        {/* Filter & Sort */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${filterStatus === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}
            >
              Semua
            </button>
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => setFilterStatus(s.value)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${filterStatus === s.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setSortBy("ip")}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${sortBy === "ip" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}
            >
              Urutkan: IP
            </button>
            <button
              onClick={() => setSortBy("tanggal")}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${sortBy === "tanggal" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}
            >
              Urutkan: Terbaru
            </button>
          </div>
        </div>

        {/* Laporan List */}
        <div className="space-y-4">
          {filtered.length === 0 && (
            <Card className="p-8 bg-card border-border text-center">
              <p className="text-muted-foreground">Tidak ada laporan ditemukan</p>
            </Card>
          )}

          {filtered.map((report) => {
            const ip = report.aiDetection?.indeksPrioritas ?? null;
            const ipColor = ip !== null ? getIPColor(ip) : "#6b7280";
            const statusStyle = getStatusStyle(report.status);
            const isExpanded = expandedId === report.id;

            return (
              <Card
                key={report.id}
                className="bg-card border-border overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* IP Badge */}
                    <div
                      className="shrink-0 w-14 h-14 rounded-lg flex flex-col items-center justify-center border-2"
                      style={{ borderColor: ipColor }}
                    >
                      {ip !== null ? (
                        <>
                          <span className="text-lg font-bold" style={{ color: ipColor }}>
                            {ip}
                          </span>
                          <span className="text-xs" style={{ color: ipColor }}>
                            IP
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground text-center leading-tight">
                          No AI
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs text-muted-foreground font-mono">
                          {report.id}
                        </span>
                        <span
                          className="px-2 py-0.5 text-xs rounded-full"
                          style={{
                            backgroundColor: statusStyle.color + "20",
                            color: statusStyle.color,
                            border: `1px solid ${statusStyle.color}40`,
                          }}
                        >
                          {statusStyle.label}
                        </span>
                        {ip !== null && ip >= 80 && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/10 text-red-500 border border-red-500/30">
                            Darurat
                          </span>
                        )}
                      </div>
                      <p className="text-foreground truncate">{report.nama}</p>
                      <p className="text-sm text-muted-foreground truncate">{report.alamat}</p>
                      {report.aiDetection && report.aiDetection.labels.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {report.aiDetection.labels.map((l) => (
                            <span
                              key={l}
                              className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded border border-primary/20"
                            >
                              {DAMAGE_LABEL_ID[l] ?? l}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Expand button */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : report.id)}
                      className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* IP Bar */}
                  {ip !== null && (
                    <div className="mt-3">
                      <IPBar value={ip} />
                    </div>
                  )}
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-4 bg-muted/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Kontak</p>
                        <p className="text-foreground">{report.email}</p>
                        <p className="text-foreground">{report.telepon}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Tanggal</p>
                        <p className="text-foreground">
                          {new Date(report.tanggal).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-muted-foreground text-xs mb-1">Deskripsi</p>
                        <p className="text-foreground">{report.deskripsi}</p>
                      </div>
                    </div>

                    {/* Detail AI */}
                    {report.aiDetection && (
                      <div className="p-3 bg-card rounded-lg border border-border space-y-2">
                        <p className="text-xs text-muted-foreground">Detail Analisis AI</p>
                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Skor Kerusakan</p>
                            <p
                              className="font-bold"
                              style={{ color: getIPColor(report.aiDetection.damageScore) }}
                            >
                              {report.aiDetection.damageScore}/100
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Kepadatan Jalan</p>
                            <p className="text-foreground font-bold">
                              {report.aiDetection.kepadatanScore}/100
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Indeks Prioritas</p>
                            <p
                              className="font-bold"
                              style={{ color: getIPColor(report.aiDetection.indeksPrioritas) }}
                            >
                              {report.aiDetection.indeksPrioritas}/100
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          IP = 60% × {report.aiDetection.damageScore} + 40% ×{" "}
                          {report.aiDetection.kepadatanScore}
                        </p>
                      </div>
                    )}

                    {/* Foto */}
                    {report.images.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Foto</p>
                        <div className="flex gap-2 flex-wrap">
                          {report.images.map((src, i) => (
                            <img
                              key={i}
                              src={src}
                              alt={`Foto ${i + 1}`}
                              className="w-24 h-24 object-cover rounded-lg border border-border"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ubah Status */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Ubah Status</p>
                      <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map((s) => (
                          <button
                            key={s.value}
                            onClick={() => updateStatus(report.id, s.value)}
                            className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${report.status === s.value ? "opacity-100" : "opacity-50 hover:opacity-80"}`}
                            style={{
                              backgroundColor: report.status === s.value ? s.color + "20" : "transparent",
                              borderColor: s.color + "60",
                              color: s.color,
                            }}
                          >
                            {report.status === s.value && (
                              <CheckCircle2 className="w-3 h-3 inline mr-1" />
                            )}
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
