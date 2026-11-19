"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Lock,
  User,
  Plus,
  ClipboardList,
  UserCircle,
  Send,
  CheckCircle2,
  Clock,
  ArrowLeft,
  RefreshCw,
  LogOut,
  Eye,
  EyeOff,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const LOGO_URL =
  "https://raw.githubusercontent.com/fauzanbunz/ifabeauty/main/fdfdfdfd.png";

interface AppUser {
  id: string;
  username: string;
  password?: string;
  full_name: string;
  role: "dokter" | "spesialis" | "admin";
  specialty?: string;
}

interface Consultation {
  id: string;
  patient_name: string;
  patient_age: string;
  patient_gender: string;
  target_specialty: string;
  complaint: string;
  initial_treatment?: string;
  status: "Menunggu" | "Dijawab" | "Selesai";
  created_by: string;
  created_at: string;
}

interface MessageItem {
  id: string;
  consultation_id: string;
  sender_name: string;
  sender_role: string;
  message: string;
  created_at: string;
}

const STORAGE_KEY = "ifa_medical_session_user";

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  // State Login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // State Navigasi & Data
  const [activeTab, setActiveTab] = useState<"antrean" | "baru" | "akun">("antrean");
  const [filterStatus, setFilterStatus] = useState<string>("Semua");
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // State Detail Konsultasi
  const [selectedConsult, setSelectedConsult] = useState<Consultation | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // State Form Konsultasi Baru
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("Perempuan");
  const [targetSpecialty, setTargetSpecialty] = useState("Sp.DV (Kulit & Kelamin)");
  const [complaint, setComplaint] = useState("");
  const [initialTreatment, setInitialTreatment] = useState("");
  const [submittingNew, setSubmittingNew] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setCurrentUser(JSON.parse(saved));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setInitializing(false);
    }
  }, []);

  const fetchConsultations = useCallback(async () => {
    setLoadingData(true);
    const { data, error } = await supabase
      .from("ifa_consultations")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setConsultations(data as Consultation[]);
    }
    setLoadingData(false);
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchConsultations();
    }
  }, [currentUser, fetchConsultations]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    const { data, error } = await supabase
      .from("app_users")
      .select("id, username, password, full_name, role, specialty")
      .ilike("username", cleanUsername);

    setLoginLoading(false);

    if (error) {
      setLoginError("Gagal akses database: " + error.message);
      return;
    }

    if (!data || data.length === 0) {
      setLoginError(
        "Username tidak ditemukan atau akses tabel app_users belum dibuka di SQL Editor."
      );
      return;
    }

    const matchedUser = data.find(
      (row) => String(row.password ?? "").trim() === cleanPassword
    );

    if (!matchedUser) {
      setLoginError("Password salah. Periksa kolom password di tabel app_users.");
      return;
    }

    const userObj: AppUser = {
      id: matchedUser.id,
      username: matchedUser.username,
      full_name: matchedUser.full_name,
      role: matchedUser.role,
      specialty: matchedUser.specialty,
    };

    setCurrentUser(userObj);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userObj));
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentUser(null);
    setSelectedConsult(null);
    setActiveTab("antrean");
    setUsername("");
    setPassword("");
  };

  const openConsultation = async (item: Consultation) => {
    setSelectedConsult(item);
    const { data } = await supabase
      .from("ifa_messages")
      .select("*")
      .eq("consultation_id", item.id)
      .order("created_at", { ascending: true });

    setMessages((data as MessageItem[]) || []);
  };

  const handleCreateConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !patientName.trim() || !complaint.trim()) return;

    setSubmittingNew(true);
    const { error } = await supabase.from("ifa_consultations").insert({
      patient_name: patientName.trim(),
      patient_age: patientAge.trim() || "-",
      patient_gender: patientGender,
      target_specialty: targetSpecialty,
      complaint: complaint.trim(),
      initial_treatment: initialTreatment.trim(),
      status: "Menunggu",
      created_by: currentUser.full_name,
    });

    setSubmittingNew(false);

    if (!error) {
      setPatientName("");
      setPatientAge("");
      setComplaint("");
      setInitialTreatment("");
      await fetchConsultations();
      setActiveTab("antrean");
    } else {
      alert("Gagal menyimpan konsultasi: " + error.message);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedConsult || !replyText.trim()) return;

    setSendingReply(true);
    const { error } = await supabase.from("ifa_messages").insert({
      consultation_id: selectedConsult.id,
      sender_name: currentUser.full_name,
      sender_role: currentUser.specialty || currentUser.role,
      message: replyText.trim(),
    });

    if (!error) {
      if (selectedConsult.status === "Menunggu" && currentUser.role === "spesialis") {
        await supabase
          .from("ifa_consultations")
          .update({ status: "Dijawab" })
          .eq("id", selectedConsult.id);
        setSelectedConsult({ ...selectedConsult, status: "Dijawab" });
      }
      setReplyText("");
      await openConsultation(selectedConsult);
      await fetchConsultations();
    }
    setSendingReply(false);
  };

  const handleMarkDone = async () => {
    if (!selectedConsult) return;
    await supabase
      .from("ifa_consultations")
      .update({ status: "Selesai" })
      .eq("id", selectedConsult.id);
    setSelectedConsult({ ...selectedConsult, status: "Selesai" });
    await fetchConsultations();
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pink-50 text-pink-700 font-medium">
        Memuat IFA Medical...
      </div>
    );
  }

  // ==================== HALAMAN LOGIN ====================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex justify-center">
        <div className="w-full max-w-md min-h-screen bg-white flex flex-col justify-between shadow-xl overflow-hidden">
          {/* Banner Atas Pink dengan Logo Full */}
          <div className="w-full bg-gradient-to-br from-pink-600 to-pink-800 text-white pt-8 pb-6 px-5 rounded-b-[2rem] shadow-md text-center space-y-2">
            <img
              src={LOGO_URL}
              alt="IFA Medical Consult Logo"
              className="w-full max-h-36 object-contain mx-auto block"
            />
            <p className="text-pink-100 text-xs">
              Kolaborasi Klinis Dokter &amp; Spesialis • Ifa Beauty
            </p>
          </div>

          <div className="px-6 py-6 flex-1 flex flex-col justify-center space-y-5">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    placeholder="Contoh: dokter.ifa"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-pink-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 pl-10 pr-11 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-pink-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full h-12 bg-pink-700 active:bg-pink-800 text-white font-semibold rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Lock className="w-4 h-4" />
                {loginLoading ? "Memeriksa Akun..." : "Masuk Aplikasi"}
              </button>
            </form>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <p className="text-[11px] font-medium text-slate-400 text-center">
                Isi Cepat Akun Demo:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Dokter Ifa", user: "dokter.ifa" },
                  { label: "Spesialis Sp.DV", user: "spesialis.dv" },
                  { label: "Spesialis Sp.OG", user: "spesialis.og" },
                  { label: "Admin Klinik", user: "admin" },
                ].map((preset) => (
                  <button
                    key={preset.user}
                    type="button"
                    onClick={() => {
                      setUsername(preset.user);
                      setPassword("123456");
                      setLoginError("");
                    }}
                    className="py-2 px-3 rounded-lg border border-pink-100 bg-pink-50/60 hover:bg-pink-100 text-pink-800 text-xs font-medium transition"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 text-center text-[11px] text-slate-400">
            Kelola daftar user &amp; password langsung di Supabase Table Editor.
          </div>
        </div>
      </div>
    );
  }

  // ==================== DETAIL KONSULTASI ====================
  if (selectedConsult) {
    return (
      <div className="min-h-screen bg-slate-100 flex justify-center">
        <div className="w-full max-w-md min-h-screen bg-slate-50 flex flex-col shadow-xl">
          <div className="bg-gradient-to-r from-pink-700 to-pink-800 text-white px-4 py-3.5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
            <button
              onClick={() => setSelectedConsult(null)}
              className="flex items-center gap-1.5 text-white font-semibold text-sm"
            >
              <ArrowLeft className="w-5 h-5 text-pink-100" />
              Kembali
            </button>
            {selectedConsult.status !== "Selesai" && (
              <button
                onClick={handleMarkDone}
                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white text-emerald-700 shadow-sm flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Tandai Selesai
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-bold text-slate-900 text-base">
                    {selectedConsult.patient_name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedConsult.patient_gender} • {selectedConsult.patient_age} th • Tujuan:{" "}
                    <span className="font-semibold text-pink-700">
                      {selectedConsult.target_specialty}
                    </span>
                  </p>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                    selectedConsult.status === "Selesai"
                      ? "bg-emerald-100 text-emerald-700"
                      : selectedConsult.status === "Dijawab"
                      ? "bg-sky-100 text-sky-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {selectedConsult.status}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-500 block">Keluhan Klinis:</span>
                  <p className="text-slate-800 mt-0.5 leading-relaxed">
                    {selectedConsult.complaint}
                  </p>
                </div>
                {selectedConsult.initial_treatment && (
                  <div>
                    <span className="font-semibold text-slate-500 block">Tindakan Awal:</span>
                    <p className="text-slate-700 mt-0.5">{selectedConsult.initial_treatment}</p>
                  </div>
                )}
                <p className="text-[11px] text-slate-400 pt-1">
                  Diajukan oleh {selectedConsult.created_by}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                Diskusi &amp; Rekomendasi Medis
              </h3>

              {messages.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200">
                  Belum ada catatan balasan dari spesialis.
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-sm space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-pink-700">
                        {msg.sender_name}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {msg.sender_role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                      {msg.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <form
            onSubmit={handleSendReply}
            className="bg-white border-t border-slate-200 p-3 flex items-center gap-2 sticky bottom-0"
          >
            <input
              type="text"
              placeholder="Tulis rekomendasi / catatan..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-pink-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sendingReply || !replyText.trim()}
              className="h-11 w-11 rounded-xl bg-pink-700 text-white flex items-center justify-center disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filteredList =
    filterStatus === "Semua"
      ? consultations
      : consultations.filter((c) => c.status === filterStatus);

  // ==================== HALAMAN UTAMA (3 TAB) ====================
  return (
    <div className="min-h-screen bg-slate-100 flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-slate-50 flex flex-col shadow-xl relative">
        {/* Header Atas Berwarna Pink dengan Logo Full */}
        <div className="bg-gradient-to-br from-pink-600 via-pink-700 to-pink-800 text-white sticky top-0 z-10 shadow-md">
          <div className="w-full px-4 pt-3 pb-1.5">
            <img
              src={LOGO_URL}
              alt="IFA Medical Logo"
              className="w-full max-h-20 object-contain mx-auto block"
            />
          </div>
          <div className="px-4 py-2 border-t border-white/15 flex items-center justify-between">
            <p className="text-[11px] text-pink-100 font-medium truncate">
              {currentUser.full_name} • {currentUser.specialty || currentUser.role}
            </p>
            <button
              onClick={fetchConsultations}
              className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition shrink-0"
              title="Segarkan Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Konten Tab */}
        <div className="flex-1 overflow-y-auto p-4 pb-24">
          {activeTab === "antrean" && (
            <div className="space-y-4">
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {["Semua", "Menunggu", "Dijawab", "Selesai"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                      filterStatus === st
                        ? "bg-pink-700 text-white shadow-sm"
                        : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {filteredList.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/80 space-y-2">
                  <Clock className="w-8 h-8 text-pink-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">
                    Belum ada data konsultasi
                  </p>
                  <p className="text-xs text-slate-400">
                    Ketuk tombol + di bawah untuk membuat konsultasi pasien baru.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => openConsultation(item)}
                      className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm active:scale-[0.99] transition cursor-pointer space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">
                            {item.patient_name}
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            {item.patient_gender} ({item.patient_age} th) •{" "}
                            <span className="text-pink-700 font-semibold">
                              {item.target_specialty}
                            </span>
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            item.status === "Selesai"
                              ? "bg-emerald-100 text-emerald-700"
                              : item.status === "Dijawab"
                              ? "bg-sky-100 text-sky-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">{item.complaint}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "baru" && (
            <form
              onSubmit={handleCreateConsultation}
              className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-4"
            >
              <h2 className="font-bold text-slate-900 text-base">
                Konsultasi Pasien Baru
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nama / Inisial Pasien
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ny. Sari / RM-014"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-pink-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Usia (Tahun)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 29"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-pink-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-pink-600 focus:outline-none"
                  >
                    <option value="Perempuan">Perempuan</option>
                    <option value="Laki-laki">Laki-laki</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Konsultasi ke Spesialis
                </label>
                <select
                  value={targetSpecialty}
                  onChange={(e) => setTargetSpecialty(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-pink-600 focus:outline-none"
                >
                  <option value="Sp.DV (Kulit & Kelamin)">Sp.DV (Kulit &amp; Kelamin)</option>
                  <option value="Sp.OG (Kandungan)">Sp.OG (Kandungan)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Keluhan &amp; Kondisi Klinis
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Jelaskan keluhan utama, durasi, dan kondisi kulit/klinis pasien..."
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-pink-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Terapi / Tindakan Awal (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Sudah diberikan krim pelembap dasar"
                  value={initialTreatment}
                  onChange={(e) => setInitialTreatment(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-pink-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingNew}
                className="w-full h-12 bg-pink-700 active:bg-pink-800 text-white font-semibold rounded-xl shadow-md transition disabled:opacity-60"
              >
                {submittingNew ? "Mengirim..." : "Kirim Konsultasi"}
              </button>
            </form>
          )}

          {activeTab === "akun" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm text-center space-y-2">
                <div className="w-16 h-16 mx-auto rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-extrabold text-xl">
                  {currentUser.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-base">
                    {currentUser.full_name}
                  </h2>
                  <p className="text-xs text-slate-500">@{currentUser.username}</p>
                </div>
                <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-200">
                  {currentUser.specialty || currentUser.role}
                </span>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">Manajemen Akun</p>
                <p>
                  Tambah atau ubah username &amp; password langsung dari{" "}
                  <span className="font-semibold text-pink-700">
                    Supabase → Table Editor → app_users
                  </span>
                  .
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="w-full h-12 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-sm flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Keluar Aplikasi
              </button>
            </div>
          )}
        </div>

        {/* Navigasi Bawah Mobile */}
        <div className="bg-white border-t border-slate-200 px-6 py-2 flex items-center justify-between sticky bottom-0 z-10">
          <button
            onClick={() => setActiveTab("antrean")}
            className={`flex flex-col items-center gap-0.5 py-1 ${
              activeTab === "antrean" ? "text-pink-700" : "text-slate-400"
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            <span className="text-[11px] font-semibold">Antrean</span>
          </button>

          <button
            onClick={() => setActiveTab("baru")}
            className="w-12 h-12 -mt-6 rounded-full bg-pink-700 text-white shadow-lg flex items-center justify-center active:scale-95 transition"
            title="Konsultasi Baru"
          >
            <Plus className="w-6 h-6" />
          </button>

          <button
            onClick={() => setActiveTab("akun")}
            className={`flex flex-col items-center gap-0.5 py-1 ${
              activeTab === "akun" ? "text-pink-700" : "text-slate-400"
            }`}
          >
            <UserCircle className="w-5 h-5" />
            <span className="text-[11px] font-semibold">Akun</span>
          </button>
        </div>
      </div>
    </div>
  );
}
