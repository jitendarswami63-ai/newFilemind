'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  User,
  Briefcase,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Save,
  Loader2,
  Lock,
  Mail,
  Building,
  GraduationCap,
  Volume2,
  FileText,
  Key,
  Info,
} from 'lucide-react'
import { UserProfileData, ProfileCompletionStatus, calculateProfileCompletion } from '@/lib/profile/types'

interface ProfileFormProps {
  initialProfile: UserProfileData
  initialCompletion: ProfileCompletionStatus
}

export function ProfileForm({ initialProfile, initialCompletion }: ProfileFormProps) {
  const [profile, setProfile] = useState<UserProfileData>(initialProfile)
  const [completion, setCompletion] = useState<ProfileCompletionStatus>(initialCompletion)
  const [activeStep, setActiveStep] = useState<number>(() => {
    // Default to the first incomplete step
    if (!initialCompletion.section2) return 2
    if (!initialCompletion.section3) return 3
    if (!initialCompletion.section4) return 4
    return 1
  })

  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const steps = [
    {
      id: 1,
      title: 'Identity & Account',
      subtitle: 'Basic details & verified email',
      icon: User,
      isComplete: completion.section1,
      weight: '25%',
    },
    {
      id: 2,
      title: 'Professional Role',
      subtitle: 'Institution & research domain',
      icon: Briefcase,
      isComplete: completion.section2,
      weight: '25%',
    },
    {
      id: 3,
      title: 'AI Engine Preferences',
      subtitle: 'Model routing & citation style',
      icon: Cpu,
      isComplete: completion.section3,
      weight: '25%',
    },
    {
      id: 4,
      title: 'Vault Security',
      subtitle: 'Biometrics & zero-knowledge keys',
      icon: ShieldCheck,
      isComplete: completion.section4,
      weight: '25%',
    },
  ]

  const handleChange = (field: keyof UserProfileData, value: any) => {
    const updated = { ...profile, [field]: value }
    setProfile(updated)
    const newComp = calculateProfileCompletion(updated)
    setCompletion(newComp)
  }

  const handleSave = async (advanceNext = false) => {
    setSaving(true)
    setErrorMsg(null)
    setSaveSuccess(null)

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save profile')
      }

      setProfile(data.profile)
      setCompletion(data.completion)
      setSaveSuccess('Profile saved and updated in system!')

      if (advanceNext && activeStep < 4) {
        setActiveStep(activeStep + 1)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving changes')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveSuccess(null), 4000)
    }
  }

  return (
    <div className="space-y-8 w-full max-w-5xl mx-auto">
      {/* SaaS Progress Card with Circular & Linear Indicators */}
      <div className="relative overflow-hidden rounded-3xl bg-[#FFFCF5] border border-[#E5DED1] p-6 sm:p-8 shadow-sm">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-[#9C7D47]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            {/* Circular Progress Ring */}
            <div className="relative flex-shrink-0 h-20 w-20 flex items-center justify-center">
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 72 72">
                <circle
                  cx="36"
                  cy="36"
                  r="30"
                  stroke="#EFE8DA"
                  strokeWidth="5"
                  fill="transparent"
                />
                <circle
                  cx="36"
                  cy="36"
                  r="30"
                  stroke="#9C7D47"
                  strokeWidth="5"
                  strokeDasharray={2 * Math.PI * 30}
                  strokeDashoffset={2 * Math.PI * 30 * (1 - completion.percentage / 100)}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-lg font-black text-[#292720] leading-none">
                  {completion.percentage}%
                </span>
                <span className="text-[9px] font-bold text-[#777064] uppercase tracking-wider mt-0.5">
                  Done
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#292720]">
                  Profile Onboarding
                </h1>
                {completion.percentage === 100 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#EBF7EE] border border-[#C3E6CB] text-xs font-bold text-[#1E7E34] shadow-xs">
                    <Sparkles className="h-3 w-3" />
                    <span>100% Completed</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#FAF5EC] border border-[#E5DED1] text-xs font-semibold text-[#9C7D47]">
                    <span>Step {activeStep} of 4</span>
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[#777064] max-w-xl">
                Complete all 4 sections to optimize AI document synthesis, hardware vault verification, and citation styling.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global Linear Progress Bar */}
        <div className="mt-6 pt-5 border-t border-[#E5DED1]/70">
          <div className="flex justify-between items-center text-xs font-bold text-[#777064] mb-2">
            <span>Overall Profile Readiness</span>
            <span className="text-[#9C7D47] font-black">{completion.percentage}% Complete</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#EFE8DA] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#9C7D47] to-[#D4AF37] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${completion.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4 Interactive Step Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {steps.map((step) => {
          const isActive = activeStep === step.id
          const StepIcon = step.icon

          return (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between select-none ${
                isActive
                  ? 'bg-[#FFFCF5] border-[#9C7D47] ring-2 ring-[#9C7D47]/20 shadow-sm'
                  : 'bg-[#FAF5EC]/70 hover:bg-[#FFFCF5] border-[#E5DED1]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center border transition-colors ${
                    step.isComplete
                      ? 'bg-[#EBF7EE] border-[#C3E6CB] text-[#1E7E34]'
                      : isActive
                      ? 'bg-[#9C7D47] border-[#856837] text-[#FFFCF5]'
                      : 'bg-[#FFFCF5] border-[#E5DED1] text-[#777064]'
                  }`}
                >
                  {step.isComplete ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <StepIcon className="h-4 w-4" />
                  )}
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    step.isComplete
                      ? 'bg-[#EBF7EE] text-[#1E7E34] border border-[#C3E6CB]'
                      : isActive
                      ? 'bg-[#FAF5EC] text-[#9C7D47] border border-[#E5DED1]'
                      : 'bg-[#EFE8DA] text-[#777064]'
                  }`}
                >
                  {step.isComplete ? 'Complete' : `+${step.weight}`}
                </span>
              </div>

              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[#292720] leading-tight">
                  {step.id}. {step.title}
                </h3>
                <p className="text-[11px] text-[#777064] mt-0.5 leading-snug line-clamp-1">
                  {step.subtitle}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-[#EBF7EE] border border-[#C3E6CB] text-xs font-semibold text-[#1E7E34] flex items-center gap-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-600 flex items-center gap-2.5 animate-in fade-in duration-200">
          <Info className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step Content Card */}
      <div className="bg-[#FFFCF5] rounded-3xl border border-[#E5DED1] p-6 sm:p-8 shadow-sm space-y-6">
        {/* Step 1: Basic Account & Identity */}
        {activeStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-[#E5DED1] pb-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#9C7D47] uppercase tracking-wider">
                <span>Section 1 of 4 • 25% Baseline</span>
              </div>
              <h2 className="text-xl font-bold text-[#292720] mt-1">
                Basic Account & Identity
              </h2>
              <p className="text-xs text-[#777064] mt-0.5">
                Your authenticated account email and personal profile identity.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#292720]">
                  Full Name <span className="text-[#9C7D47]">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#777064]" />
                  <input
                    type="text"
                    value={profile.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    placeholder="e.g. Jitendar Swami"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-xs sm:text-sm text-[#292720] placeholder-[#777064]/50 focus:outline-none focus:border-[#9C7D47] focus:bg-[#FFFCF5] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#292720]">
                  Email Address <span className="text-[10px] text-[#1E7E34] font-semibold">(Verified)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#777064]" />
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#EFE8DA]/50 border border-[#E5DED1] text-xs sm:text-sm text-[#777064] cursor-not-allowed select-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#292720]">
                  Display Handle / Username
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#777064]">@</span>
                  <input
                    type="text"
                    value={profile.username}
                    onChange={(e) => handleChange('username', e.target.value)}
                    placeholder="username"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-xs sm:text-sm text-[#292720] placeholder-[#777064]/50 focus:outline-none focus:border-[#9C7D47] focus:bg-[#FFFCF5] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#292720]">
                  Professional Bio / Research Focus
                </label>
                <input
                  type="text"
                  value={profile.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="e.g. Legal AI researcher & constitutional analyst"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-xs sm:text-sm text-[#292720] placeholder-[#777064]/50 focus:outline-none focus:border-[#9C7D47] focus:bg-[#FFFCF5] transition-colors"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-[#1E7E34]" />
                <span className="text-xs font-medium text-[#292720]">
                  Initial 25% completed from your authenticated login session.
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] transition-colors cursor-pointer"
              >
                <span>Continue to Step 2</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Professional & Academic Role */}
        {activeStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-[#E5DED1] pb-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#9C7D47] uppercase tracking-wider">
                <span>Section 2 of 4 • +25% Completion</span>
              </div>
              <h2 className="text-xl font-bold text-[#292720] mt-1">
                Professional & Academic Role
              </h2>
              <p className="text-xs text-[#777064] mt-0.5">
                Help FileMind tailor document categorization, table extraction, and legal/financial terminology.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#292720]">
                  Primary Role / Title <span className="text-[#9C7D47]">*</span>
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#777064]" />
                  <select
                    value={profile.occupation_role}
                    onChange={(e) => handleChange('occupation_role', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-xs sm:text-sm text-[#292720] focus:outline-none focus:border-[#9C7D47] focus:bg-[#FFFCF5] transition-colors cursor-pointer"
                  >
                    <option value="">Select your occupation...</option>
                    <option value="Legal Counsel / Lawyer">Legal Counsel / Lawyer</option>
                    <option value="Research Scholar / PhD Candidate">Research Scholar / PhD Candidate</option>
                    <option value="Academic Faculty / Professor">Academic Faculty / Professor</option>
                    <option value="Financial Analyst / Auditor">Financial Analyst / Auditor</option>
                    <option value="Software Engineer / AI Developer">Software Engineer / AI Developer</option>
                    <option value="Medical / Clinical Researcher">Medical / Clinical Researcher</option>
                    <option value="University Student">University Student</option>
                    <option value="Independent Consultant">Independent Consultant</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#292720]">
                  Institution / University / Company <span className="text-[#9C7D47]">*</span>
                </label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#777064]" />
                  <input
                    type="text"
                    value={profile.institution}
                    onChange={(e) => handleChange('institution', e.target.value)}
                    placeholder="e.g. YMCA University / High Court / Tech Corp"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-xs sm:text-sm text-[#292720] placeholder-[#777064]/50 focus:outline-none focus:border-[#9C7D47] focus:bg-[#FFFCF5] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#292720]">
                  Primary Domain / Field <span className="text-[#9C7D47]">*</span>
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#777064]" />
                  <select
                    value={profile.primary_domain}
                    onChange={(e) => handleChange('primary_domain', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-xs sm:text-sm text-[#292720] focus:outline-none focus:border-[#9C7D47] focus:bg-[#FFFCF5] transition-colors cursor-pointer"
                  >
                    <option value="">Select primary field...</option>
                    <option value="Law, Contracts & Regulatory Compliance">Law, Contracts & Regulatory Compliance</option>
                    <option value="Computer Science, AI & Engineering">Computer Science, AI & Engineering</option>
                    <option value="Economics, Banking & Financial Reports">Economics, Banking & Financial Reports</option>
                    <option value="Medicine, Pharmaceuticals & Health">Medicine, Pharmaceuticals & Health</option>
                    <option value="Higher Education & Academic Papers">Higher Education & Academic Papers</option>
                    <option value="Interdisciplinary & General Research">Interdisciplinary & General Research</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#292720]">
                  Expected Document Volume
                </label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#777064]" />
                  <select
                    value={profile.document_volume}
                    onChange={(e) => handleChange('document_volume', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-xs sm:text-sm text-[#292720] focus:outline-none focus:border-[#9C7D47] focus:bg-[#FFFCF5] transition-colors cursor-pointer"
                  >
                    <option value="1–15 documents/week">1–15 documents/week (Standard Research)</option>
                    <option value="15–50 documents/week">15–50 documents/week (Active Workspace)</option>
                    <option value="50+ large dossiers/enterprise">50+ large dossiers/enterprise (High Volume)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#777064] hover:text-[#292720] transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] transition-colors cursor-pointer"
              >
                <span>Save & Go to Step 3</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: AI Engine Preferences */}
        {activeStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-[#E5DED1] pb-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#9C7D47] uppercase tracking-wider">
                <span>Section 3 of 4 • +25% Completion</span>
              </div>
              <h2 className="text-xl font-bold text-[#292720] mt-1">
                AI Engine & Workspace Preferences
              </h2>
              <p className="text-xs text-[#777064] mt-0.5">
                Configure your preferred LLM provider cascade, grounded citation formatting, and voice synthesis.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#292720]">
                  Preferred AI Engine
                </label>
                <select
                  value={profile.preferred_ai_provider}
                  onChange={(e) => handleChange('preferred_ai_provider', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-xs sm:text-sm text-[#292720] focus:outline-none focus:border-[#9C7D47] focus:bg-[#FFFCF5] transition-colors cursor-pointer"
                >
                  <option value="Dual-Engine (Gemini 3.8 + NVIDIA NIM)">Dual-Engine (Gemini 3.8 + NVIDIA NIM Fast Lane)</option>
                  <option value="Google Gemini 3.8 Flash">Google Gemini 3.8 Flash (High Throughput)</option>
                  <option value="NVIDIA NIM Llama 3.3">NVIDIA NIM Llama 3.3 70B (Complex Reasoning)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#292720]">
                  Grounded Citation Precision
                </label>
                <select
                  value={profile.citation_precision}
                  onChange={(e) => handleChange('citation_precision', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-xs sm:text-sm text-[#292720] focus:outline-none focus:border-[#9C7D47] focus:bg-[#FFFCF5] transition-colors cursor-pointer"
                >
                  <option value="Page-Precise Academic Quotes">Page-Precise Academic Quotes ([Doc: Title, p. 12])</option>
                  <option value="Concise Executive Summaries">Concise Executive Summaries (Key takeaways first)</option>
                  <option value="Deep Synthesis with Full Excerpts">Deep Synthesis with Full Excerpts</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#292720]">
                  Deepgram Neural Audio Speed
                </label>
                <select
                  value={profile.audio_voice_speed}
                  onChange={(e) => handleChange('audio_voice_speed', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-xs sm:text-sm text-[#292720] focus:outline-none focus:border-[#9C7D47] focus:bg-[#FFFCF5] transition-colors cursor-pointer"
                >
                  <option value="Deepgram Neural (1.0x Normal)">Deepgram Neural (1.0x Normal Playback)</option>
                  <option value="Fast Scan (1.25x)">Fast Scan (1.25x Speed)</option>
                  <option value="Deep Focus (0.9x)">Deep Focus (0.9x Clear Enunciation)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#292720]">
                  Research Digest & Activity Alerts
                </label>
                <label className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] cursor-pointer hover:bg-[#FFFCF5] transition-colors">
                  <input
                    type="checkbox"
                    checked={profile.email_digest}
                    onChange={(e) => handleChange('email_digest', e.target.checked)}
                    className="h-4 w-4 rounded text-[#9C7D47] focus:ring-[#9C7D47] border-[#E5DED1] cursor-pointer"
                  />
                  <span className="text-xs text-[#292720] font-medium">
                    Send weekly synthesis summaries of newly indexed documents
                  </span>
                </label>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#777064] hover:text-[#292720] transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] transition-colors cursor-pointer"
              >
                <span>Save & Go to Step 4</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Vault Security & Biometrics */}
        {activeStep === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-[#E5DED1] pb-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#9C7D47] uppercase tracking-wider">
                <span>Section 4 of 4 • +25% Final Step</span>
              </div>
              <h2 className="text-xl font-bold text-[#292720] mt-1">
                Security & Biometric Vault Configuration
              </h2>
              <p className="text-xs text-[#777064] mt-0.5">
                Set up hardware-bound FIDO2 WebAuthn encryption, emergency recovery passphrase hint, and auto-lock timeouts.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#292720]">
                  Biometric Vault Method
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#777064]" />
                  <select
                    value={profile.biometric_hardware_vault}
                    onChange={(e) => handleChange('biometric_hardware_vault', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-xs sm:text-sm text-[#292720] focus:outline-none focus:border-[#9C7D47] focus:bg-[#FFFCF5] transition-colors cursor-pointer"
                  >
                    <option value="FIDO2 WebAuthn Hardware Passkey">FIDO2 WebAuthn Hardware Passkey (TouchID / Windows Hello)</option>
                    <option value="YubiKey / Hardware Security Key">YubiKey / Hardware Security Key (FIDO2 L2)</option>
                    <option value="Standard Session Lock">Standard Session Lock</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#292720]">
                  Auto-Lock Timeout
                </label>
                <select
                  value={profile.auto_lock_interval}
                  onChange={(e) => handleChange('auto_lock_interval', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-xs sm:text-sm text-[#292720] focus:outline-none focus:border-[#9C7D47] focus:bg-[#FFFCF5] transition-colors cursor-pointer"
                >
                  <option value="15 minutes">15 minutes of inactivity (High Security)</option>
                  <option value="1 hour">1 hour of inactivity (Balanced)</option>
                  <option value="4 hours">4 hours of inactivity</option>
                  <option value="Manual lock only">Manual lock only</option>
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-[#292720]">
                  Emergency Vault Recovery Hint <span className="text-[#9C7D47]">*</span>
                </label>
                <input
                  type="text"
                  value={profile.vault_recovery_hint}
                  onChange={(e) => handleChange('vault_recovery_hint', e.target.value)}
                  placeholder="e.g. Memory of first university robotics lab or favorite childhood mentor"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-xs sm:text-sm text-[#292720] placeholder-[#777064]/50 focus:outline-none focus:border-[#9C7D47] focus:bg-[#FFFCF5] transition-colors"
                />
                <p className="text-[11px] text-[#777064]">
                  Used to verify your identity if your physical biometric authenticator device is unavailable.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-start gap-3 p-4 rounded-2xl bg-[#FAF5EC] border border-[#E5DED1] cursor-pointer hover:bg-[#FFFCF5] transition-colors">
                  <input
                    type="checkbox"
                    checked={profile.zero_knowledge_ack}
                    onChange={(e) => handleChange('zero_knowledge_ack', e.target.checked)}
                    className="h-4 w-4 rounded text-[#9C7D47] focus:ring-[#9C7D47] border-[#E5DED1] mt-0.5 cursor-pointer"
                  />
                  <div className="text-xs text-[#292720]">
                    <span className="font-bold block mb-0.5">
                      Confirm Zero-Knowledge Encryption Compliance <span className="text-[#9C7D47]">*</span>
                    </span>
                    <span className="text-[#777064] text-[11px] leading-relaxed block">
                      I acknowledge that FileMind uses client-side AES-256-GCM envelope encryption and hardware-bound WebAuthn keys. Documents in private vaults cannot be decrypted without my authorized passkey.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveStep(3)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#777064] hover:text-[#292720] transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] transition-colors cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Save & Finalize Profile</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Completion Banner if 100% */}
      {completion.percentage === 100 && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-[#2D281E] via-[#1B1D21] to-[#252015] border border-[#D4AF37]/50 text-[#F5F1E9] shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#AA771C] flex items-center justify-center text-[#1C180A] shadow-xs flex-shrink-0">
              <Sparkles className="h-5 w-5 fill-[#1C180A]" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-[#F3E5AB]">
                Profile 100% Complete & Verified!
              </div>
              <p className="text-xs text-[#C5A878] mt-0.5">
                All 4 onboarding sections are active. Your customized AI retrieval and biometric vault parameters are fully configured.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-[#1C180A] bg-gradient-to-r from-[#D4AF37] via-[#F6E27A] to-[#AA771C] hover:opacity-95 shadow-sm transition-opacity flex-shrink-0"
          >
            <span>Go to Workspace</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  )
}
