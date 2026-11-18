'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Plus, Clock, CheckCircle2, AlertCircle, FileText,
  ShieldAlert, Send, FolderOpen, LogOut, Lock, Download,
  MessageSquare, CheckSquare, UserCheck, Activity, ArrowLeft,
  ChevronRight, User, Stethoscope, Paperclip, RefreshCw
} from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: 'super_admin' | 'dokter_ifa' | 'spesialis' | 'admin_klinik';
  specialization: string | null;
  str_sip_number: string | null;
  is_verified: boolean;
}

interface Patient {
  id: string;
  patient_code: string;
  initials: string;
  birth_date: string;
  gender: string;
}

interface Consultation {
  id: string;
  case_code: string;
  patient_id: string;
  requester_id: string;
  specialist_id: string;
  chief_complaint: string;
  onset: string | null;
  medical_history: string | null;
  allergies: string | null;
  current_medications: string | null;
  vital_signs: { td?: string; nadi?: string } | null;
  clinical_question: string;
  priority: 'Normal' | 'Urgent';
  status: string;
  created_at: string;
}

interface CaseEntry {
  id: string;
  case_id: string;
  author_id: string;
  entry_type: 'chat' | 'info_request' | 'clinical_response';
  message: string | null;
  assessment: string | null;
  recommendation: string | null;
  red_flags: string | null;
  needs_in_person_exam: boolean;
  follow_up_plan: string | null;
  signed_at: string | null;
  created_at: string;
}

interface Attachment {
  id: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
}

interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  resource_id: string | null;
  details: any;
  created_at: string;
}

export default function MobileIfaMedicalConsult() {
  // Auth & Profile State
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('dokter.ifa@simulasi.local');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Data State
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});
  const [specialists, setSpecialists] = useState<Profile[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [cases, setCases] = useState<Consultation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Mobile Navigation State
  const [activeTab, setActiveTab] = useState<'home' | 'create' | 'directory' | 'profile'>('home');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedCase, setSelectedCase] = useState<Consultation | null>(null);
  const [caseEntries, setCaseEntries] = useState<CaseEntry[]>([]);
  const [caseAttachments, setCaseAttachments] = useState<Attachment[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form Konsultasi Baru
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

  // Form Chat & Respons Spesialis
  const [chatMessage, setChatMessage] = useState('');
  const [showResponseSheet, setShowResponseSheet] = useState(false);
  const [assessment, setAssessment] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [redFlags, setRedFlags] = useState('');
  const [needsInPerson, setNeedsInPerson] = useState(false);
  const [followUpPlan, setFollowUpPlan] = useState('');
  const [signConfirmed, setSignConfirmed] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    setAuthLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setSessionUser(session.user);
      await loadUserData(session.user.id);
    }
    setAuthLoading(false);
  }

  async function loadUserData(userId: string) {
    const { data: allProfiles } = await supabase.from('profiles').select('*');
    if (allProfiles) {
      const map: Record<string, Profile> = {};
      allProfiles.forEach((p: Profile) => { map[p.id] = p; });
      setProfilesMap(map);
      setCurrentProfile(map[userId] || null);

      const verifiedSpecs = allProfiles.filter(
        (p: Profile) => p.role === 'spesialis' && p.is_verified
      );
      setSpecialists(verifiedSpecs);
      if (verifiedSpecs.length > 0) setSpecialistId(verifiedSpecs[0].id);

      const userRole = map[userId]?.role;

      if (userRole === 'dokter_ifa' || userRole === 'spesialis') {
        const { data: patData } = await supabase.from('patients').select('*');
        if (patData) {
          setPatients(patData);
          if (patData.length > 0) setPatientId(patData[0].id);
        }
        await fetchCases();
      }

      if (userRole === 'admin_klinik' || userRole === 'super_admin') {
        const { data: logsData } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (logsData) setAuditLogs(logsData);
      }
    }
  }

  async function fetchCases() {
    const { data } = await supabase
      .from('consultations')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setCases(data);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    setAuthLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      setLoginError(error.message);
      setAuthLoading(false);
      return;
    }

    if (data.user) {
      setSessionUser(data.user);
      await supabase.from('audit_logs').insert({
        actor_id: data.user.id,
        action: 'LOGIN',
        details: { email: loginEmail, platform: 'mobile' }
      });
      await loadUserData(data.user.id);
    }
    setAuthLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSessionUser(null);
    setCurrentProfile(null);
    setSelectedCase(null);
    setActiveTab('home');
    setCases([]);
  }

  async function handleCreateConsultation(e: React.FormEvent) {
    e.preventDefault();
    if (!consentChecked) {
      alert('Persetujuan pasien (consent) wajib dicentang.');
      return;
    }

    setSubmitting(true);
    try {
      const generatedCode = `IFA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const { data: newCase, error: caseError } = await supabase
        .from('consultations')
        .insert({
          case_code: generatedCode,
          patient_id: patientId,
          requester_id: sessionUser.id,
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

      if (file && newCase) {
        const filePath = `${newCase.id}/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage
          .from('medical-attachments')
          .upload(filePath, file);

        if (!uploadErr) {
          await supabase.from('attachments').insert({
            case_id: newCase.id,
            uploader_id: sessionUser.id,
            storage_path: filePath,
            file_name: file.name,
            mime_type: file.type || 'application/octet-stream',
            file_size_bytes: file.size
          });
        }
      }

      await supabase.from('audit_logs').insert({
        actor_id: sessionUser.id,
        action: 'CREATE_CASE',
        resource_id: newCase.id,
        details: { case_code: generatedCode, priority }
      });

      setComplaint('');
      setOnset('');
      setHistory('');
      setAllergies('');
      setMedications('');
      setVitalTd('');
      setVitalNadi('');
      setQuestion('');
      setConsentChecked(false);
      setFile(null);

      await fetchCases();
      setActiveTab('home');
      alert(`Konsultasi ${generatedCode} terkirim.`);
    } catch (err: any) {
      alert(`Gagal: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function openCaseDetail(item: Consultation) {
    setSelectedCase(item);
    setShowResponseSheet(false);

    if (currentProfile?.role === 'spesialis' && item.status === 'Submitted') {
      await supabase
        .from('consultations')
        .update({ status: 'In Review', updated_at: new Date().toISOString() })
        .eq('id', item.id);
      item.status = 'In Review';
      fetchCases();
    }

    await supabase.from('audit_logs').insert({
      actor_id: sessionUser.id,
      action: 'VIEW_CASE',
      resource_id: item.id,
      details: { case_code: item.case_code }
    });

    const { data: entries } = await supabase
      .from('case_entries')
      .select('*')
      .eq('case_id', item.id)
      .order('created_at', { ascending: true });
    setCaseEntries(entries || []);

    const { data: atts } = await supabase
      .from('attachments')
      .select('*')
      .eq('case_id', item.id);
    setCaseAttachments(atts || []);
  }

  async function handleDownloadAttachment(att: Attachment) {
    const { data, error } = await supabase.storage
      .from('medical-attachments')
      .createSignedUrl(att.storage_path, 60);

    if (error || !data?.signedUrl) {
      alert('Gagal membuat tautan sementara.');
      return;
    }

    await supabase.from('audit_logs').insert({
      actor_id: sessionUser.id,
      action: 'DOWNLOAD_FILE',
      resource_id: selectedCase?.id,
      details: { file_name: att.file_name }
    });

    window.open(data.signedUrl, '_blank');
  }

  async function handleSendChat(e: React.FormEvent, isInfoRequest = false) {
    e.preventDefault();
    if (!selectedCase || !chatMessage.trim()) return;
    setSubmitting(true);

    await supabase.from('case_entries').insert({
      case_id: selectedCase.id,
      author_id: sessionUser.id,
      entry_type: isInfoRequest ? 'info_request' : 'chat',
      message: chatMessage
    });

    if (isInfoRequest) {
      await supabase
        .from('consultations')
        .update({ status: 'Need Information', updated_at: new Date().toISOString() })
        .eq('id', selectedCase.id);
      setSelectedCase({ ...selectedCase, status: 'Need Information' });
      fetchCases();
    }

    setChatMessage('');
    await openCaseDetail(selectedCase);
    setSubmitting(false);
  }

  async function handleSubmitClinicalResponse(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCase || !signConfirmed) {
      alert('Centang konfirmasi tanda tangan klinis.');
      return;
    }

    setSubmitting(true);
    const now = new Date().toISOString();

    const { error } = await supabase.from('case_entries').insert({
      case_id: selectedCase.id,
      author_id: sessionUser.id,
      entry_type: 'clinical_response',
      assessment,
      recommendation,
      red_flags: redFlags,
      needs_in_person_exam: needsInPerson,
      follow_up_plan: followUpPlan,
      signed_at: now
    });

    if (!error) {
      await supabase
        .from('consultations')
        .update({ status: 'Responded', updated_at: now })
        .eq('id', selectedCase.id);

      await supabase.from('audit_logs').insert({
        actor_id: sessionUser.id,
        action: 'SUBMIT_RESPONSE',
        resource_id: selectedCase.id,
        details: { case_code: selectedCase.case_code }
      });

      setAssessment('');
      setRecommendation('');
      setRedFlags('');
      setNeedsInPerson(false);
      setFollowUpPlan('');
      setSignConfirmed(false);
      setShowResponseSheet(false);

      const updated = { ...selectedCase, status: 'Responded' };
      setSelectedCase(updated);
      await openCaseDetail(updated);
      await fetchCases();
      alert('Respons spesialis tersimpan & ditandatangani.');
    }
    setSubmitting(false);
  }

  async function handleCloseCase() {
    if (!selectedCase) return;
    if (!confirm('Tutup kasus ini? Setelah ditutup status menjadi Read-Only.')) return;

    await supabase
      .from('consultations')
      .update({ status: 'Closed', updated_at: new Date().toISOString() })
      .eq('id', selectedCase.id);

    await supabase.from('audit_logs').insert({
      actor_id: sessionUser.id,
      action: 'CLOSE_CASE',
      resource_id: selectedCase.id,
      details: { case_code: selectedCase.case_code }
    });

    const updated = { ...selectedCase, status: 'Closed' };
    setSelectedCase(updated);
    await fetchCases();
  }

  // Filter kasus berdasarkan tab status mobile
  const filteredCases = cases.filter((c) =>
    statusFilter === 'ALL' ? true : c.status === statusFilter
  );

  // ==========================================
  // 1. LAYAR LOGIN MOBILE (APP-LIKE)
  // ==========================================
  if (!sessionUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex justify-center">
        <div className="w-full max-w-md min-h-screen bg-white flex flex-col justify-between shadow-xl">
          {/* Header Pink Lengkungan Mobile */}
          <div className="bg-gradient-to-br from-pink-700 to-pink-900 text-white pt-12 pb-10 px-6 rounded-b-[2rem] shadow-md text-center space-y-2">
            <div className="w-14 h-14 mx-auto bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/25 mb-3">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">IFA MEDICAL CONSULT</h1>
            <p className="text-xs text-pink-100">
              Kolaborasi Klinis Dokter & Spesialis • Ifa Beauty
            </p>
          </div>

          {/* Form Login Touch-Friendly */}
          <div className="px-6 py-6 flex-1 flex flex-col justify-center space-y-5">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Akun
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full h-12 border border-slate-300 rounded-xl px-4 text-sm text-slate-900 focus:outline-none focus:border-pink-700 focus:ring-2 focus:ring-pink-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kata Sandi
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full h-12 border border-slate-300 rounded-xl px-4 text-sm text-slate-900 focus:outline-none focus:border-pink-700 focus:ring-2 focus:ring-pink-100"
                />
              </div>

              {loginError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 p-3 rounded-xl">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full h-12 bg-pink-700 active:bg-pink-800 text-white font-semibold rounded-xl text-sm shadow-sm transition flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                {authLoading ? 'Memverifikasi...' : 'Masuk Aplikasi'}
              </button>
            </form>

            {/* Quick Select Akun Uji Coba */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Akun Simulasi Cepat:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Dokter Ifa', email: 'dokter.ifa@simulasi.local' },
                  { label: 'Spesialis Sp.DV', email: 'spesialis.dv@simulasi.local' },
                  { label: 'Spesialis Sp.OG', email: 'spesialis.og@simulasi.local' },
                  { label: 'Admin Klinik', email: 'admin@simulasi.local' },
                ].map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => setLoginEmail(acc.email)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-medium text-left transition ${
                      loginEmail === acc.email
                        ? 'border-pink-700 bg-pink-50 text-pink-900 font-semibold'
                        : 'border-slate-200 bg-white text-slate-700 active:bg-slate-50'
                    }`}
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 text-center">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Mode Simulasi Data Sintetis • Seluruh aktivitas tercatat di audit log.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // GUARD: PROFIL BELUM TERSINKRONISASI
  // ==========================================
  if (!authLoading && !currentProfile) {
    return (
      <div className="min-h-screen bg-slate-100 flex justify-center">
        <div className="w-full max-w-md min-h-screen bg-white p-6 flex flex-col items-center justify-center text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-pink-700" />
          <h2 className="text-base font-bold text-slate-900">Profil Peran Belum Terhubung</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Akun <strong>{sessionUser.email}</strong> sudah login, tetapi belum memiliki peran di tabel <code>profiles</code> Supabase. Jalankan SQL sinkronisasi akun terlebih dahulu.
          </p>
          <div className="flex gap-3 w-full pt-2">
            <button
              onClick={() => checkSession()}
              className="flex-1 h-11 bg-pink-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" /> Muat Ulang
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 h-11 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Keluar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. LAYAR DETAIL KASUS FULL-SCREEN MOBILE
  // ==========================================
  if (selectedCase) {
    return (
      <div className="min-h-screen bg-slate-100 flex justify-center">
        <div className="w-full max-w-md min-h-screen bg-pink-50/40 flex flex-col shadow-xl">
          {/* Sticky Top App Bar */}
          <header className="sticky top-0 z-20 bg-white border-b border-pink-100 px-4 h-14 flex items-center justify-between">
            <button
              onClick={() => setSelectedCase(null)}
              className="flex items-center gap-1.5 text-pink-800 font-semibold text-sm py-2 pr-3"
            >
              <ArrowLeft className="w-5 h-5" /> Kembali
            </button>
            <span className="font-mono text-xs font-bold bg-pink-100 text-pink-900 px-2.5 py-1 rounded-lg">
              {selectedCase.case_code}
            </span>
          </header>

          {/* Konten Detail Kasus Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 pb-28 space-y-4">
            {/* Kartu Ringkasan Klinis */}
            <div className="bg-white rounded-2xl border border-pink-100 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-pink-100 text-pink-900">
                  {selectedCase.status}
                </span>
                {selectedCase.priority === 'Urgent' && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Urgent
                  </span>
                )}
              </div>

              <h2 className="text-base font-bold text-slate-900 leading-snug">
                {selectedCase.chief_complaint}
              </h2>

              <div className="text-xs text-slate-600 space-y-1 border-t border-slate-100 pt-2.5">
                <p>Dari: <strong className="text-slate-800">{profilesMap[selectedCase.requester_id]?.full_name}</strong></p>
                <p>Ke: <strong className="text-slate-800">{profilesMap[selectedCase.specialist_id]?.full_name}</strong></p>
              </div>

              <div className="bg-pink-50/70 rounded-xl p-3 text-xs space-y-1.5 text-slate-800">
                <p><strong>Riwayat:</strong> {selectedCase.medical_history || '-'}</p>
                <p><strong>Alergi:</strong> {selectedCase.allergies || 'Tidak ada'}</p>
                <p><strong>Obat:</strong> {selectedCase.current_medications || '-'}</p>
                <p><strong>Vital:</strong> TD {selectedCase.vital_signs?.td || '-'} • Nadi {selectedCase.vital_signs?.nadi || '-'}</p>
                <div className="pt-1.5 border-t border-pink-200/70">
                  <strong className="text-pink-950">Pertanyaan Klinis:</strong>
                  <p className="mt-0.5 text-slate-900">{selectedCase.clinical_question}</p>
                </div>
              </div>

              {/* Lampiran */}
              {caseAttachments.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-semibold text-slate-500">Lampiran Dokumen:</p>
                  {caseAttachments.map((att) => (
                    <button
                      key={att.id}
                      onClick={() => handleDownloadAttachment(att)}
                      className="w-full flex items-center justify-between bg-slate-50 active:bg-pink-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-pink-900"
                    >
                      <span className="truncate pr-2">{att.file_name}</span>
                      <Download className="w-4 h-4 shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Tombol Tutup Kasus untuk Dokter Ifa */}
              {currentProfile?.role === 'dokter_ifa' && selectedCase.status === 'Responded' && (
                <button
                  onClick={handleCloseCase}
                  className="w-full h-11 bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 mt-2"
                >
                  <CheckSquare className="w-4 h-4" /> Tandai Selesai & Tutup Kasus
                </button>
              )}
            </div>

            {/* Thread Percakapan & Respons Klinis */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold text-slate-700 px-1">Riwayat Diskusi & Respons</p>

              {caseEntries.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4 bg-white rounded-2xl border border-slate-100">
                  Belum ada catatan diskusi atau respons spesialis.
                </p>
              )}

              {caseEntries.map((entry) => (
                <div
                  key={entry.id}
                  className={`rounded-2xl p-3.5 text-xs space-y-1.5 shadow-sm ${
                    entry.entry_type === 'clinical_response'
                      ? 'bg-emerald-50 border border-emerald-300'
                      : 'bg-white border border-pink-100'
                  }`}
                >
                  <div className="flex justify-between items-center text-[11px] text-slate-500">
                    <strong className="text-slate-800">{profilesMap[entry.author_id]?.full_name}</strong>
                    <span>{new Date(entry.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {entry.entry_type === 'clinical_response' ? (
                    <div className="space-y-1.5 text-slate-900 pt-1">
                      <span className="inline-block bg-emerald-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                        RESPONS RESMI SPESIALIS
                      </span>
                      <p><strong>Penilaian:</strong> {entry.assessment}</p>
                      <p><strong>Rekomendasi:</strong> {entry.recommendation}</p>
                      <p><strong>Red Flags:</strong> {entry.red_flags || '-'}</p>
                      <p><strong>Tatap Muka:</strong> {entry.needs_in_person_exam ? 'Ya, wajib periksa langsung' : 'Tidak'}</p>
                      <p><strong>Follow-Up:</strong> {entry.follow_up_plan || '-'}</p>
                      <p className="text-[10px] text-emerald-900 font-mono pt-1 border-t border-emerald-200">
                        Signed: {entry.signed_at ? new Date(entry.signed_at).toLocaleString('id-ID') : '-'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-800 leading-relaxed">
                      {entry.entry_type === 'info_request' && (
                        <span className="font-bold text-amber-800 mr-1">[Minta Data]</span>
                      )}
                      {entry.message}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Form Respons Spesialis (Muncul saat tombol dibuka) */}
            {currentProfile?.role === 'spesialis' && selectedCase.status !== 'Closed' && (
              <div className="pt-2">
                {!showResponseSheet ? (
                  <button
                    onClick={() => setShowResponseSheet(true)}
                    className="w-full h-12 bg-pink-700 active:bg-pink-800 text-white font-semibold rounded-xl text-xs shadow-md flex items-center justify-center gap-2"
                  >
                    <Stethoscope className="w-4 h-4" /> Isi Respons Klinis Resmi
                  </button>
                ) : (
                  <form onSubmit={handleSubmitClinicalResponse} className="bg-white border-2 border-pink-600 rounded-2xl p-4 space-y-3 shadow-md">
                    <div className="flex justify-between items-center border-b border-pink-100 pb-2">
                      <h3 className="text-xs font-bold text-pink-900">Respons Klinis Spesialis</h3>
                      <button type="button" onClick={() => setShowResponseSheet(false)} className="text-xs text-slate-500">
                        Batal
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Penilaian (Assessment) *</label>
                      <textarea required rows={2} value={assessment} onChange={(e) => setAssessment(e.target.value)} className="w-full border border-slate-300 rounded-xl p-2.5 text-xs" />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Rekomendasi Terapi *</label>
                      <textarea required rows={2} value={recommendation} onChange={(e) => setRecommendation(e.target.value)} className="w-full border border-slate-300 rounded-xl p-2.5 text-xs" />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Red Flags (Tanda Bahaya)</label>
                      <input type="text" value={redFlags} onChange={(e) => setRedFlags(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 h-10 text-xs" />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Rencana Follow-Up</label>
                      <input type="text" value={followUpPlan} onChange={(e) => setFollowUpPlan(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 h-10 text-xs" />
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-800 py-1">
                      <input type="checkbox" checked={needsInPerson} onChange={(e) => setNeedsInPerson(e.target.checked)} className="w-4 h-4 accent-pink-700" />
                      Perlu pemeriksaan langsung tatap muka
                    </label>

                    <label className="flex items-start gap-2 bg-pink-50 p-2.5 rounded-xl text-[11px] text-slate-800">
                      <input type="checkbox" required checked={signConfirmed} onChange={(e) => setSignConfirmed(e.target.checked)} className="mt-0.5 w-4 h-4 accent-pink-700" />
                      <span>Konfirmasi tanda tangan klinis sesuai STR/SIP ({currentProfile.str_sip_number}).</span>
                    </label>

                    <button type="submit" disabled={submitting} className="w-full h-11 bg-pink-700 text-white font-semibold rounded-xl text-xs">
                      {submitting ? 'Menyimpan...' : 'Tandatangani & Kirim Respons'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Sticky Bottom Chat Input Bar */}
          {selectedCase.status !== 'Closed' && (
            <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-pink-100 p-3 space-y-2">
              <form onSubmit={(e) => handleSendChat(e, false)} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Tulis pesan kasus..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="flex-1 h-11 bg-slate-100 rounded-full px-4 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-pink-600"
                />
                {currentProfile?.role === 'spesialis' && chatMessage.trim() && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={(e) => handleSendChat(e, true)}
                    className="h-11 px-3 bg-amber-600 text-white rounded-full text-[11px] font-semibold shrink-0"
                  >
                    +Info
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting || !chatMessage.trim()}
                  className="w-11 h-11 bg-pink-700 disabled:opacity-40 text-white rounded-full flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. SHELL APLIKASI MOBILE UTAMA + BOTTOM NAV
  // ==========================================
  const isAdmin = currentProfile?.role === 'admin_klinik' || currentProfile?.role === 'super_admin';

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-pink-50/40 flex flex-col shadow-xl relative">
        {/* Top Mobile Status Banner */}
        <div className="bg-pink-900 text-white text-[10px] py-1.5 px-3 text-center flex items-center justify-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-pink-200 shrink-0" />
          <span>SIMULASI DATA SINTETIS • Emergensi wajib rujuk langsung</span>
        </div>

        {/* Sticky App Header */}
        <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-pink-100 px-4 h-14 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-pink-800 leading-none">IFA MEDICAL</h1>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[220px]">
              {currentProfile?.full_name}
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-pink-100 text-pink-900">
            {currentProfile?.specialization || currentProfile?.role}
          </span>
        </header>

        {/* Konten Utama Berdasarkan Tab Aktif */}
        <main className="flex-1 p-4 pb-24 space-y-4 overflow-y-auto">
          {/* TAB 1: BERANDA (ANTREAN DOKTER ATAU AUDIT LOG ADMIN) */}
          {activeTab === 'home' && !isAdmin && (
            <>
              {/* Ringkasan Angka 2 Kolom */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3.5 rounded-2xl border border-pink-100 shadow-sm">
                  <p className="text-[11px] text-slate-500">Total Kasus</p>
                  <p className="text-2xl font-bold text-pink-800 mt-0.5">{cases.length}</p>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-pink-100 shadow-sm">
                  <p className="text-[11px] text-slate-500">Perlu Tindak Lanjut</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">
                    {cases.filter((c) => c.status !== 'Closed').length}
                  </p>
                </div>
              </div>

              {/* Filter Chips Scroll Horizontal */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {['ALL', 'Submitted', 'In Review', 'Need Information', 'Responded', 'Closed'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                      statusFilter === st
                        ? 'bg-pink-700 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'Semua' : st}
                  </button>
                ))}
              </div>

              {/* Daftar Kartu Kasus Mobile */}
              <div className="space-y-2.5">
                {filteredCases.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-pink-100 p-8 text-center space-y-2">
                    <FolderOpen className="w-8 h-8 text-pink-300 mx-auto" />
                    <p className="text-xs text-slate-500">Belum ada kasus pada filter ini.</p>
                  </div>
                ) : (
                  filteredCases.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => openCaseDetail(item)}
                      className="w-full text-left bg-white active:bg-pink-50/70 rounded-2xl border border-pink-100 p-4 shadow-sm flex items-center justify-between gap-3 transition"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-pink-800 bg-pink-100 px-2 py-0.5 rounded-md">
                            {item.case_code}
                          </span>
                          {item.priority === 'Urgent' && (
                            <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                              URGENT
                            </span>
                          )}
                          <span className="text-[11px] font-medium text-slate-500">
                            • {profilesMap[item.specialist_id]?.specialization}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {item.chief_complaint}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-pink-900">
                          {item.status === 'Responded' || item.status === 'Closed' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-pink-700" />
                          )}
                          <span>{item.status}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          {/* TAB 1 (KHUSUS ADMIN): AUDIT LOG CARDS */}
          {activeTab === 'home' && isAdmin && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-950">
                <strong>Privasi Klinis Aktif:</strong> Admin hanya dapat memantau jejak audit tanpa membuka isi medis pasien.
              </div>
              <h2 className="text-xs font-bold text-slate-700 px-1 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-pink-700" /> Jejak Audit Terbaru
              </h2>
              {auditLogs.map((log) => (
                <div key={log.id} className="bg-white rounded-2xl border border-pink-100 p-3.5 text-xs space-y-1 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-pink-800 bg-pink-50 px-2 py-0.5 rounded">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.created_at).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p className="font-medium text-slate-800">
                    {log.actor_id ? profilesMap[log.actor_id]?.full_name : 'Sistem'}
                  </p>
                  <p className="font-mono text-[11px] text-slate-500 break-all">
                    {JSON.stringify(log.details)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2 (DOKTER IFA): FORM BUAT KONSULTASI MOBILE */}
          {activeTab === 'create' && currentProfile?.role === 'dokter_ifa' && (
            <form onSubmit={handleCreateConsultation} className="bg-white rounded-2xl border border-pink-100 p-4 shadow-sm space-y-3.5">
              <h2 className="text-base font-bold text-pink-900 border-b border-pink-100 pb-2">
                Pengajuan Konsultasi Baru
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pasien Sintetis *</label>
                <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-full h-11 border border-slate-300 rounded-xl px-3 text-sm bg-white">
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.patient_code} — {p.initials} ({p.gender})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dokter Spesialis Tujuan *</label>
                <select value={specialistId} onChange={(e) => setSpecialistId(e.target.value)} className="w-full h-11 border border-slate-300 rounded-xl px-3 text-sm bg-white">
                  {specialists.map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name} ({s.specialization})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Prioritas *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Normal', 'Urgent'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`h-10 rounded-xl text-xs font-semibold border ${
                        priority === p
                          ? 'bg-pink-700 text-white border-pink-700'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keluhan Utama *</label>
                <textarea required rows={2} value={complaint} onChange={(e) => setComplaint(e.target.value)} className="w-full border border-slate-300 rounded-xl p-3 text-sm" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Riwayat & Alergi</label>
                <input type="text" placeholder="Riwayat singkat..." value={history} onChange={(e) => setHistory(e.target.value)} className="w-full h-11 border border-slate-300 rounded-xl px-3 text-sm mb-2" />
                <input type="text" placeholder="Alergi obat/makanan..." value={allergies} onChange={(e) => setAllergies(e.target.value)} className="w-full h-11 border border-slate-300 rounded-xl px-3 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tekanan Darah</label>
                  <input type="text" placeholder="120/80" value={vitalTd} onChange={(e) => setVitalTd(e.target.value)} className="w-full h-11 border border-slate-300 rounded-xl px-3 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nadi (x/mnt)</label>
                  <input type="text" placeholder="80" value={vitalNadi} onChange={(e) => setVitalNadi(e.target.value)} className="w-full h-11 border border-slate-300 rounded-xl px-3 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pertanyaan Klinis *</label>
                <textarea required rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} className="w-full border border-slate-300 rounded-xl p-3 text-sm" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lampiran (PDF / Foto)</label>
                <label className="flex items-center justify-center gap-2 w-full h-11 border border-dashed border-pink-300 bg-pink-50/50 rounded-xl text-xs font-medium text-pink-900 cursor-pointer">
                  <Paperclip className="w-4 h-4" />
                  <span className="truncate max-w-[240px]">{file ? file.name : 'Pilih File Lampiran'}</span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
                </label>
              </div>

              <label className="flex items-start gap-2.5 bg-pink-50 p-3 rounded-xl border border-pink-200 text-xs text-slate-800">
                <input type="checkbox" required checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} className="mt-0.5 w-4 h-4 accent-pink-700" />
                <span>Persetujuan pasien (consent) telah diperoleh sesuai SOP klinik.</span>
              </label>

              <button type="submit" disabled={submitting} className="w-full h-12 bg-pink-700 active:bg-pink-800 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm">
                <Send className="w-4 h-4" />
                {submitting ? 'Mengirim...' : 'Kirim Konsultasi'}
              </button>
            </form>
          )}

          {/* TAB 2 (ADMIN): DIREKTORI DOKTER */}
          {activeTab === 'directory' && isAdmin && (
            <div className="space-y-2.5">
              <h2 className="text-xs font-bold text-slate-700 px-1 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-pink-700" /> Direktori Dokter Mitra
              </h2>
              {Object.values(profilesMap).map((prof) => (
                <div key={prof.id} className="bg-white rounded-2xl border border-pink-100 p-4 shadow-sm space-y-1">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-bold text-slate-900">{prof.full_name}</p>
                    <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {prof.is_verified ? 'Aktif' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{prof.email}</p>
                  <p className="text-[11px] font-mono text-pink-800">
                    Role: {prof.role} {prof.specialization ? `• ${prof.specialization}` : ''} {prof.str_sip_number ? `• ${prof.str_sip_number}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: PROFIL & KELUAR */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-pink-100 p-5 shadow-sm text-center space-y-2">
                <div className="w-16 h-16 mx-auto rounded-full bg-pink-100 text-pink-800 flex items-center justify-center">
                  <User className="w-8 h-8" />
                </div>
                <h2 className="text-base font-bold text-slate-900">{currentProfile?.full_name}</h2>
                <p className="text-xs text-slate-500">{currentProfile?.email}</p>
                <div className="pt-2 flex justify-center gap-2">
                  <span className="text-[11px] font-semibold bg-pink-50 text-pink-900 border border-pink-200 px-3 py-1 rounded-full">
                    {currentProfile?.role}
                  </span>
                  {currentProfile?.str_sip_number && (
                    <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                      {currentProfile.str_sip_number}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full h-12 bg-white border border-red-200 text-red-700 active:bg-red-50 font-semibold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                <LogOut className="w-4 h-4" /> Keluar dari Akun
              </button>
            </div>
          )}
        </main>

        {/* Bottom Navigation Bar (Fixed Mobile App Tab Bar) */}
        <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-pink-100 h-16 px-4 flex items-center justify-around z-20">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl ${
              activeTab === 'home' ? 'text-pink-700 font-bold' : 'text-slate-400'
            }`}
          >
            <FolderOpen className="w-5 h-5" />
            <span className="text-[10px]">{isAdmin ? 'Audit Log' : 'Antrean'}</span>
          </button>

          {currentProfile?.role === 'dokter_ifa' && (
            <button
              onClick={() => setActiveTab('create')}
              className="flex flex-col items-center justify-center -mt-5"
            >
              <div className="w-12 h-12 rounded-full bg-pink-700 text-white shadow-lg flex items-center justify-center border-4 border-white">
                <Plus className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-semibold text-pink-800 mt-0.5">Konsultasi</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setActiveTab('directory')}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl ${
                activeTab === 'directory' ? 'text-pink-700 font-bold' : 'text-slate-400'
              }`}
            >
              <UserCheck className="w-5 h-5" />
              <span className="text-[10px]">Direktori</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl ${
              activeTab === 'profile' ? 'text-pink-700 font-bold' : 'text-slate-400'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px]">Akun</span>
          </button>
        </nav>
      </div>
    </div>
  );
}