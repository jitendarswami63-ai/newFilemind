'use client'

import React, { useState, useEffect } from 'react'
import {
  Globe,
  Save,
  Send,
  RotateCcw,
  Sparkles,
  Megaphone,
  CreditCard,
  Settings,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { CMSData, DEFAULT_CMS_DATA } from '@/lib/admin/types'

export default function AdminCMSPage() {
  const [data, setData] = useState<CMSData>(DEFAULT_CMS_DATA)
  const [hasChanges, setHasChanges] = useState(false)
  const [publishedAt, setPublishedAt] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'hero' | 'announcement' | 'pricing' | 'settings'>('hero')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetchCMS()
  }, [])

  const fetchCMS = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/cms')
      const json = await res.json()
      if (json && !json.error) {
        setData(json.draft || DEFAULT_CMS_DATA)
        setHasChanges(Boolean(json.hasUnpublishedChanges))
        setPublishedAt(json.publishedAt)
      }
    } catch {
      setStatusMessage({ text: 'Failed to load CMS content', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFieldChange = (section: keyof CMSData, field: string, value: any) => {
    setData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }))
    setHasChanges(true)
  }

  const handleSaveDraft = async () => {
    setIsSaving(true)
    setStatusMessage(null)
    try {
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_draft', draft: data }),
      })
      const result = await res.json()
      if (result.success) {
        setStatusMessage({ text: 'Draft saved securely. Ready for publishing.', type: 'success' })
        setHasChanges(true)
      } else {
        setStatusMessage({ text: result.error || 'Failed to save draft', type: 'error' })
      }
    } catch {
      setStatusMessage({ text: 'Error saving draft', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!confirm('Are you sure you want to publish these changes live to all website visitors?')) {
      return
    }

    setIsPublishing(true)
    setStatusMessage(null)
    try {
      // First save draft
      await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_draft', draft: data }),
      })

      // Then publish
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      })
      const result = await res.json()
      if (result.success) {
        setStatusMessage({ text: '🎉 Content successfully published to live website!', type: 'success' })
        setPublishedAt(result.publishedAt || new Date().toISOString())
        setHasChanges(false)
      } else {
        setStatusMessage({ text: result.error || 'Failed to publish content', type: 'error' })
      }
    } catch {
      setStatusMessage({ text: 'Error publishing content', type: 'error' })
    } finally {
      setIsPublishing(false)
    }
  }

  const handleDiscard = async () => {
    if (!confirm('Discard all unpublished changes and revert to the live published state?')) {
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'discard_draft' }),
      })
      const result = await res.json()
      if (result.success) {
        setStatusMessage({ text: 'Draft discarded. Reverted to live content.', type: 'success' })
        await fetchCMS()
      }
    } catch {
      setStatusMessage({ text: 'Error discarding draft', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-8 w-8 text-[#9C7D47] animate-spin" />
        <p className="text-xs text-[#777064] font-medium">Loading Website CMS Editor...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5DED1]">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-[#9C7D47]" />
            <h1 className="text-xl font-extrabold text-[#292720] tracking-tight">Website CMS & Copy Editor</h1>
          </div>
          <p className="text-xs text-[#777064] mt-1">
            Edit live Landing Page copy, announcements, plan descriptions, and global application settings.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {hasChanges ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAB308]/15 border border-[#EAB308]/30 text-xs font-semibold text-[#854D0E]">
              <AlertTriangle className="h-3.5 w-3.5 text-[#EAB308]" />
              Unpublished Draft
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 text-xs font-semibold text-[#065F46]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
              Live & Synced
            </span>
          )}

          {hasChanges && (
            <button
              onClick={handleDiscard}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#D8D0C2] bg-[#FAF5EC] hover:bg-[#F3EFE5] text-xs font-semibold text-[#777064] hover:text-[#292720] transition-colors"
              title="Revert draft changes"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Discard</span>
            </button>
          )}

          <button
            onClick={handleSaveDraft}
            disabled={isSaving || isPublishing}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#D8D0C2] bg-[#FFFCF5] hover:bg-[#FAF5EC] text-xs font-semibold text-[#292720] transition-colors shadow-2xs disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9C7D47]" /> : <Save className="h-3.5 w-3.5 text-[#9C7D47]" />}
            <span>Save Draft</span>
          </button>

          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#9C7D47] hover:bg-[#856837] text-xs font-bold text-[#FFFCF5] transition-colors shadow-xs disabled:opacity-50"
          >
            {isPublishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            <span>Publish Live</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-[#10B981]/10 text-[#065F46] border border-[#10B981]/30'
              : 'bg-[#E07A7A]/15 text-[#991B1B] border border-[#E07A7A]/30'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-xs opacity-60 hover:opacity-100 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#E5DED1] gap-2 overflow-x-auto">
        {[
          { id: 'hero', label: 'Hero Section', icon: Sparkles },
          { id: 'announcement', label: 'Announcement Banner', icon: Megaphone },
          { id: 'pricing', label: 'Pricing Copy', icon: CreditCard },
          { id: 'settings', label: 'App Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                active
                  ? 'border-[#9C7D47] text-[#9C7D47] bg-[#FAF5EC]/50'
                  : 'border-transparent text-[#777064] hover:text-[#292720] hover:border-[#D8D0C2]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content Form Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {activeTab === 'hero' && (
            <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-6 space-y-4 shadow-2xs">
              <h2 className="text-sm font-bold text-[#292720] flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#9C7D47]" />
                Hero Section Copy & Calls to Action
              </h2>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#777064]">Top Pill Badge Text</label>
                <input
                  type="text"
                  value={data.hero.badge}
                  onChange={(e) => handleFieldChange('hero', 'badge', e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#777064]">Main Headline</label>
                  <input
                    type="text"
                    value={data.hero.headline}
                    onChange={(e) => handleFieldChange('hero', 'headline', e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#777064]">Gold Highlight Text</label>
                  <input
                    type="text"
                    value={data.hero.highlightText}
                    onChange={(e) => handleFieldChange('hero', 'highlightText', e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none font-bold text-[#9C7D47]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#777064]">Subheadline Paragraph</label>
                <textarea
                  rows={3}
                  value={data.hero.subheadline}
                  onChange={(e) => handleFieldChange('hero', 'subheadline', e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#777064]">Primary CTA Button Text</label>
                  <input
                    type="text"
                    value={data.hero.primaryCtaText}
                    onChange={(e) => handleFieldChange('hero', 'primaryCtaText', e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#777064]">Secondary CTA Button Text</label>
                  <input
                    type="text"
                    value={data.hero.secondaryCtaText}
                    onChange={(e) => handleFieldChange('hero', 'secondaryCtaText', e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'announcement' && (
            <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#292720] flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-[#9C7D47]" />
                  Global Announcement Banner
                </h2>

                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs font-semibold text-[#777064]">Show on Homepage</span>
                  <input
                    type="checkbox"
                    checked={data.announcement.enabled}
                    onChange={(e) => handleFieldChange('announcement', 'enabled', e.target.checked)}
                    className="h-4 w-4 text-[#9C7D47] rounded-md border-[#D8D0C2] focus:ring-[#9C7D47]"
                  />
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#777064]">Banner Announcement Message</label>
                <input
                  type="text"
                  value={data.announcement.text}
                  onChange={(e) => handleFieldChange('announcement', 'text', e.target.value)}
                  placeholder="e.g. 🚀 Introducing Dual-Engine Vector Search..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#777064]">Link Text (Optional)</label>
                  <input
                    type="text"
                    value={data.announcement.linkText}
                    onChange={(e) => handleFieldChange('announcement', 'linkText', e.target.value)}
                    placeholder="e.g. Read Changelog"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#777064]">Link Target URL</label>
                  <input
                    type="text"
                    value={data.announcement.linkUrl}
                    onChange={(e) => handleFieldChange('announcement', 'linkUrl', e.target.value)}
                    placeholder="e.g. /about or https://..."
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#777064]">Visual Color Accent</label>
                <select
                  value={data.announcement.variant}
                  onChange={(e) => handleFieldChange('announcement', 'variant', e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
                >
                  <option value="gold">Gold Theme (Default SaaS)</option>
                  <option value="emerald">Emerald Theme (Product Launch / Feature)</option>
                  <option value="amber">Amber Theme (Maintenance / Notice)</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-6 space-y-4 shadow-2xs">
              <h2 className="text-sm font-bold text-[#292720] flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#9C7D47]" />
                Pricing Card Descriptions & Badges
              </h2>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#777064]">Free Plan Subheading</label>
                <input
                  type="text"
                  value={data.pricing.freeSubheading}
                  onChange={(e) => handleFieldChange('pricing', 'freeSubheading', e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#777064]">Pro Plan Subheading (₹249/mo)</label>
                <input
                  type="text"
                  value={data.pricing.proSubheading}
                  onChange={(e) => handleFieldChange('pricing', 'proSubheading', e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#777064]">Elite Plan Subheading (₹499/mo)</label>
                <input
                  type="text"
                  value={data.pricing.eliteSubheading}
                  onChange={(e) => handleFieldChange('pricing', 'eliteSubheading', e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#777064]">Pro Plan Ribbon Badge</label>
                  <input
                    type="text"
                    value={data.pricing.proBadge}
                    onChange={(e) => handleFieldChange('pricing', 'proBadge', e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#777064]">Elite Plan Ribbon Badge</label>
                  <input
                    type="text"
                    value={data.pricing.eliteBadge}
                    onChange={(e) => handleFieldChange('pricing', 'eliteBadge', e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-6 space-y-4 shadow-2xs">
              <h2 className="text-sm font-bold text-[#292720] flex items-center gap-2">
                <Settings className="h-4 w-4 text-[#9C7D47]" />
                Platform Application Controls
              </h2>

              <div className="p-4 rounded-xl border border-[#E5DED1] bg-[#FAF5EC] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#292720] block">Maintenance Mode</span>
                  <span className="text-[11px] text-[#777064] block">
                    Temporarily shows a maintenance banner to non-admin visitors.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={data.settings.maintenanceMode}
                  onChange={(e) => handleFieldChange('settings', 'maintenanceMode', e.target.checked)}
                  className="h-5 w-5 text-[#9C7D47] rounded-md border-[#D8D0C2] focus:ring-[#9C7D47]"
                />
              </div>

              <div className="p-4 rounded-xl border border-[#E5DED1] bg-[#FAF5EC] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#292720] block">Allow New User Signups</span>
                  <span className="text-[11px] text-[#777064] block">
                    Allow new accounts to register via email or OAuth.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={data.settings.allowNewSignups}
                  onChange={(e) => handleFieldChange('settings', 'allowNewSignups', e.target.checked)}
                  className="h-5 w-5 text-[#9C7D47] rounded-md border-[#D8D0C2] focus:ring-[#9C7D47]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#777064]">Official Support Email</label>
                <input
                  type="email"
                  value={data.settings.supportEmail}
                  onChange={(e) => handleFieldChange('settings', 'supportEmail', e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#777064]">Support Response Notice</label>
                <input
                  type="text"
                  value={data.settings.contactNotice}
                  onChange={(e) => handleFieldChange('settings', 'contactNotice', e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Live Preview Panel */}
        <div className="space-y-4">
          <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-5 shadow-2xs space-y-4 sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5DED1]">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-[#9C7D47]" />
                <span className="text-xs font-bold text-[#292720]">Live Content Preview</span>
              </div>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#9C7D47] hover:underline"
              >
                <span>Open Site</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Announcement Banner Preview */}
            {data.announcement.enabled && (
              <div className="p-2.5 rounded-xl bg-[#9C7D47]/15 border border-[#9C7D47]/30 text-center text-[11px] font-medium text-[#292720]">
                {data.announcement.text}{' '}
                {data.announcement.linkText && (
                  <span className="font-bold underline text-[#9C7D47]">{data.announcement.linkText}</span>
                )}
              </div>
            )}

            {/* Hero Preview */}
            <div className="p-4 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] space-y-2 text-center">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-white border border-[#D8D0C2] text-[10px] font-bold text-[#9C7D47]">
                {data.hero.badge}
              </span>
              <h3 className="text-base font-extrabold text-[#292720] leading-tight">
                {data.hero.headline} <span className="text-[#9C7D47]">{data.hero.highlightText}</span>
              </h3>
              <p className="text-[11px] text-[#777064] line-clamp-3 leading-relaxed">
                {data.hero.subheadline}
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-[#9C7D47] text-white text-[10px] font-bold">
                  {data.hero.primaryCtaText}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-[#D8D0C2] text-[#292720] text-[10px] font-semibold">
                  {data.hero.secondaryCtaText}
                </span>
              </div>
            </div>

            {/* Publishing Metadata Card */}
            <div className="pt-2 border-t border-[#E5DED1] text-[11px] text-[#777064] space-y-1">
              <div className="flex justify-between">
                <span>Last Published:</span>
                <span className="font-semibold text-[#292720]">
                  {publishedAt ? new Date(publishedAt).toLocaleString() : 'Using Default System Copy'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Draft Status:</span>
                <span className={hasChanges ? 'font-bold text-[#EAB308]' : 'font-semibold text-[#10B981]'}>
                  {hasChanges ? 'Unpublished Edits Pending' : 'In Sync with Live'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
