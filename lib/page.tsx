'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  PlusCircle, Clock, CheckCircle2, AlertCircle, 
  FileText, ShieldAlert, Send, FolderOpen 
} from 'lucide-react';

interface Consultation {
  id: string;
  case_code: string;
  chief_complaint: string;
  priority: 'Normal' | 'Urgent';
  status: string;
  created_at: string;
}

export default function DashboardKonsultasi() {
  const [cases, setCases] = useState<Consultation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // State Form Konsultasi Baru
  const [patientId, setPatientId] = useState('');
  const [specialistId, setSpecialistId] = useState('');
  const [complaint, setComplaint] = useState('');
  const [onset, setOnset] = useState('');
  const [history, setHistory] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');
  const [vitalTd, setVitalTd] = useState('');
  const [vitalNadi, setVitalNadi] = useState('');
  const [question, setQuestion] = useState('');
  const [priority, setPriority] = useState<'Normal' | 'Urgent'>('Normal');
  const [consentChecked, setConsentChecked] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchCases();
  }, []);

  async function fetchCases() {
    const { data } = await supabase
      .from('consultations')
      .select('id, case_code, chief_complaint, priority, status, created_at')
      .order('created_at', { ascending: false });
    if (data) setCases(data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consentChecked) {
      alert('Persetujuan pasien (consent) wajib dikonfirmasi sebelum mengirim konsultasi.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesi tidak valid. Silakan login kembali.');

      const generatedCode = `IFA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Simpan data konsultasi
      const { data: newCase, error: caseError } = await supabase
        .from('consultations')
        .insert({
          case_code: generatedCode,
          patient_id: patientId,
          requester_id: user.id,
          specialist_id: specialistId,
          chief_complaint: complaint,
          onset,
          medical_history: history,
          allergies,
          current_medications: medications,
          vital_signs: { td: vitalTd, nadi: vitalNadi },
          clinical_question: question,
          priority,
          status: 'Submitted',
          patient_consent_confirmed: consentChecked
        })
        .select()
        .single();

      if (caseError) throw caseError;

      // 2. Unggah lampiran ke Private Bucket jika ada
      if (file && newCase) {
        const filePath = `${newCase.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('medical-attachments')
          .upload(filePath, file);

        if (!uploadError) {
          await supabase.from('attachments').insert({
            case_id: newCase.id,
            uploader_id: user.id,
            storage_path: filePath,
            file_name: file.name,
            mime_type: file.type,
            file_size_bytes: file.size
          });
        }
      }

      // 3. Catat ke Audit Log (Append-Only)
      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        action: 'CREATE_CASE',
        resource_id: newCase.id,
        details: { case_code: generatedCode, priority }
      });

      setShowForm(false);
      fetchCases();
      alert(`Konsultasi ${generatedCode} berhasil dikirim.`);
    } catch (err: any) {
      alert(`Gagal mengirim: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-pink-50/60 text-slate-900">
      {/* Banner Peringatan Data Sintetis & Emergensi */}
      <div className="bg-pink-900 text-white px-4 py-2 text-xs flex items-center justify-center gap-2 text-center">
        <ShieldAlert className="w-4 h-4 shrink-0 text-pink-200" />
        <span>
          MODE SIMULASI: Gunakan data sintetis (bukan data pasien nyata). Kasus gawat darurat wajib dirujuk langsung.
        </span>
      </div>

      {/* Header Navigasi */}
      <header className="bg-white border-b border-pink-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-pink-800 tracking-tight">IFA MEDICAL CONSULT</h1>
          <p className="text-xs text-slate-600">Kolaborasi Klinis Dokter Ifa Beauty & Spesialis Mitra</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-pink-700 hover:bg-pink-800 text-white font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm shadow-sm transition"
        >
          <PlusCircle className="w-4 h-4" />
          {showForm ? 'Tutup Form' : 'Buat Konsultasi Baru'}
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Form Pengajuan Konsultasi */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white border border-pink-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-pink-900 border-b border-pink-100 pb-2">
              Pengajuan Second Opinion / Konsultasi Baru
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ID Pasien Sintetis *</label>
                <input
                  type="text" required placeholder="UUID Pasien Dummy"
                  value={patientId} onChange={(e) => setPatientId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-pink-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ID Dokter Spesialis Tujuan *</label>
                <input
                  type="text" required placeholder="UUID Spesialis (Sp.DV / Sp.PD / dll)"
                  value={specialistId} onChange={(e) => setSpecialistId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-pink-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Prioritas *</label>
                <select
                  value={priority} onChange={(e) => setPriority(e.target.value as 'Normal' | 'Urgent')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="Normal">Normal</option>
                  <option value="Urgent">Urgent (Non-Emergensi)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keluhan Utama *</label>
                <textarea
                  required rows={2} value={complaint} onChange={(e) => setComplaint(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Onset & Riwayat Penyakit</label>
                <textarea
                  rows={2} placeholder="Sejak kapan keluhan muncul & riwayat terkait..."
                  value={history} onChange={(e) => setHistory(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alergi</label>
                <input
                  type="text" placeholder="Tidak ada / sebutkan"
                  value={allergies} onChange={(e) => setAllergies(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Obat Saat Ini</label>
                <input
                  type="text" value={medications} onChange={(e) => setMedications(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tekanan Darah</label>
                <input
                  type="text" placeholder="120/80 mmHg"
                  value={vitalTd} onChange={(e) => setVitalTd(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nadi (x/menit)</label>
                <input
                  type="text" placeholder="80"
                  value={vitalNadi} onChange={(e) => setVitalNadi(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pertanyaan Klinis untuk Spesialis *</label>
              <textarea
                required rows={2} value={question} onChange={(e) => setQuestion(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lampiran Pendukung (PDF / JPG / PNG)</label>
              <input
                type="file" accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-sm text-slate-700 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-pink-100 file:text-pink-800 hover:file:bg-pink-200"
              />
            </div>

            <label className="flex items-start gap-2.5 bg-pink-50 p-3 rounded-lg border border-pink-200 cursor-pointer">
              <input
                type="checkbox" required checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-1 accent-pink-700"
              />
              <span className="text-xs text-slate-800">
                Saya mengonfirmasi bahwa persetujuan pasien (patient consent) untuk konsultasi antar-dokter telah diperoleh dan dicatat sesuai SOP klinik.
              </span>
            </label>

            <div className="flex justify-end">
              <button
                type="submit" disabled={loading}
                className="bg-pink-700 hover:bg-pink-800 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Mengirim...' : 'Kirim Konsultasi'}
              </button>
            </div>
          </form>
        )}

        {/* Daftar Antrean Kasus */}
        <section className="bg-white border border-pink-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-pink-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-pink-700" />
              Antrean & Riwayat Kasus Saya
            </h2>
            <span className="text-xs font-medium bg-pink-100 text-pink-900 px-2.5 py-1 rounded-full">
              Total: {cases.length} Kasus
            </span>
          </div>

          <div className="divide-y divide-pink-100">
            {cases.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                Belum ada kasus konsultasi. Klik tombol &ldquo;Buat Konsultasi Baru&rdquo; untuk memulai simulasi.
              </p>
            ) : (
              cases.map((item) => (
                <div key={item.id} className="p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-pink-50/40">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-pink-800 bg-pink-100 px-2 py-0.5 rounded">
                        {item.case_code}
                      </span>
                      {item.priority === 'Urgent' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                          <AlertCircle className="w-3.5 h-3.5" /> Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-900">{item.chief_complaint}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border border-pink-300 bg-white text-pink-900">
                      {item.status === 'Responded' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-pink-700" />
                      )}
                      Status: {item.status}
                    </span>
                    <button className="text-xs font-semibold text-pink-800 hover:underline flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> Buka Detail
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}