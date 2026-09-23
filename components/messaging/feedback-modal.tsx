"use client";

import React, { useState } from "react";
import { useApp } from "@/lib/context/app-context";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  X,
  Send,
  Star,
  CheckCircle2,
  Clock,
  ShieldCheck,
  User,
  Sparkles,
  MessageCircle,
} from "lucide-react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const {
    currentUser,
    country,
    currencySymbol,
    messages,
    sendMessage,
    replyMessage,
  } = useApp();

  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<
    "feedback" | "note" | "experience" | "quote_help" | "other"
  >("experience");
  const [rating, setRating] = useState(5);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Active expanded message thread for viewing replies and replying
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  // Filter messages: Users only see their own messages. Admins/Managers see all.
  const isStaff =
    currentUser.role === "admin" ||
    currentUser.role === "super_admin" ||
    currentUser.role === "manager";

  const myMessages = isStaff
    ? messages
    : messages.filter((m) => m.user_id === currentUser.id || m.user_email === currentUser.email);

  const activeThread = messages.find((m) => m.id === selectedThreadId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !content.trim()) return;

    sendMessage({
      subject,
      content,
      category,
      rating,
    });

    setSubmittedSuccess(true);
    setSubject("");
    setContent("");
    setTimeout(() => {
      setSubmittedSuccess(false);
      setActiveTab("history");
    }, 1500);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThreadId || !replyContent.trim()) return;

    replyMessage(selectedThreadId, replyContent);
    setReplyContent("");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md"
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="bg-[#fcf8f4] dark:bg-[#1a1511] text-coffeeBean dark:text-almondCream border border-tan/40 dark:border-fadedCopper/40 rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl relative overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-tan/30 dark:border-fadedCopper/30 flex items-center justify-between bg-desertSand/20 dark:bg-darkSurface/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-toffeeBrown/15 dark:bg-toffeeBrown/30 border border-toffeeBrown/30 flex items-center justify-center text-toffeeBrown dark:text-tan">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold font-serif leading-tight">
                  Espace Retours & Expériences
                </h3>
                <p className="text-[11px] text-coffeeBean/70 dark:text-almondCream/70">
                  {isStaff
                    ? "Vue Conciergerie (Tous les messages clients)"
                    : `Vos échanges confidentiels avec notre direction (${country === "TN" ? "Tunisie" : "France"})`}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-desertSand/40 dark:bg-darkSurface text-coffeeBean dark:text-almondCream hover:bg-desertSand/70 transition-colors apple-press"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-tan/30 dark:border-fadedCopper/30 bg-almondCream/30 dark:bg-darkBg/40 px-5 sm:px-6 gap-3">
            <button
              onClick={() => {
                setActiveTab("new");
                setSelectedThreadId(null);
              }}
              className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === "new" && !selectedThreadId
                  ? "border-toffeeBrown text-toffeeBrown dark:text-tan"
                  : "border-transparent text-coffeeBean/60 dark:text-almondCream/60 hover:text-coffeeBean dark:hover:text-almondCream"
              }`}
            >
              Nouveau Message
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "history" || selectedThreadId
                  ? "border-toffeeBrown text-toffeeBrown dark:text-tan"
                  : "border-transparent text-coffeeBean/60 dark:text-almondCream/60 hover:text-coffeeBean dark:hover:text-almondCream"
              }`}
            >
              <span>Historique ({myMessages.length})</span>
              {myMessages.some((m) => m.status === "unread") && (
                <span className="w-2 h-2 rounded-full bg-toffeeBrown animate-ping" />
              )}
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {/* TAB 1: NEW MESSAGE */}
            {activeTab === "new" && !selectedThreadId && (
              <div>
                {submittedSuccess ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-8 text-center space-y-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl"
                  >
                    <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
                    <h4 className="text-lg font-bold font-serif text-emerald-800 dark:text-emerald-300">
                      Message envoyé avec succès !
                    </h4>
                    <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 max-w-md mx-auto">
                      Notre conciergerie a bien reçu votre note. Vous recevrez une réponse dans votre espace sous peu.
                    </p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-coffeeBean/80 dark:text-tan mb-1">
                          Catégorie
                        </label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value as any)}
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-darkBg border border-tan/40 dark:border-fadedCopper/40 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-toffeeBrown"
                        >
                          <option value="experience">Retour d'expérience (Gala / Réception)</option>
                          <option value="feedback">Avis sur la scénographie / mobilier</option>
                          <option value="quote_help">Demande d'accompagnement sur devis</option>
                          <option value="note">Note ou suggestion interne</option>
                          <option value="other">Autre demande</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-coffeeBean/80 dark:text-tan mb-1">
                          Évaluation de votre expérience
                        </label>
                        <div className="flex items-center gap-1.5 pt-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setRating(s)}
                              className="p-1 text-toffeeBrown dark:text-tan hover:scale-110 transition-transform"
                            >
                              <Star
                                className={`w-5 h-5 ${
                                  s <= rating ? "fill-toffeeBrown text-toffeeBrown dark:fill-tan dark:text-tan" : "text-tan/40"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-coffeeBean/80 dark:text-tan mb-1">
                        Sujet de votre message
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Qualité des canapés Kasaya lors de notre réception privée..."
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-white dark:bg-darkBg border border-tan/40 dark:border-fadedCopper/40 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-toffeeBrown"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-coffeeBean/80 dark:text-tan mb-1">
                        Votre message ou note détaillée
                      </label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Partagez vos impressions, suggestions ou besoins logistiques avec notre équipe..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full p-3 rounded-xl bg-white dark:bg-darkBg border border-tan/40 dark:border-fadedCopper/40 text-xs focus:outline-none focus:ring-2 focus:ring-toffeeBrown"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="text-[11px] text-coffeeBean/60 dark:text-almondCream/60 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-toffeeBrown dark:text-tan" />
                        <span>
                          Posté en tant que: <strong>{currentUser.full_name}</strong> ({currentUser.role})
                        </span>
                      </div>

                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-full bg-toffeeBrown hover:bg-coffeeBean text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-toffeeBrown/25 flex items-center gap-2 apple-press"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Transmettre</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* TAB 2: HISTORY & THREAD VIEW */}
            {(activeTab === "history" || selectedThreadId) && (
              <div className="space-y-4">
                {selectedThreadId && activeThread ? (
                  <div className="space-y-4">
                    {/* Back button */}
                    <button
                      onClick={() => setSelectedThreadId(null)}
                      className="text-xs font-bold text-toffeeBrown dark:text-tan hover:underline flex items-center gap-1"
                    >
                      ← Revenir à tous mes messages
                    </button>

                    {/* Main thread starter */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-darkBg border border-tan/40 dark:border-fadedCopper/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-tan/20 px-2 py-0.5 rounded-full text-toffeeBrown dark:text-tan">
                          {activeThread.category}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          {new Date(activeThread.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-base">{activeThread.subject}</h4>
                      <p className="text-xs leading-relaxed text-coffeeBean/90 dark:text-almondCream/90 whitespace-pre-wrap">
                        {activeThread.content}
                      </p>
                      <div className="pt-1 flex items-center gap-2 text-[11px] text-coffeeBean/70 dark:text-almondCream/70">
                        <span>Par {activeThread.user_name}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          {Array.from({ length: activeThread.rating || 5 }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-toffeeBrown text-toffeeBrown dark:fill-tan dark:text-tan" />
                          ))}
                        </span>
                      </div>
                    </div>

                    {/* Replies List */}
                    <div className="space-y-3 pl-4 border-l-2 border-tan/40 dark:border-fadedCopper/40">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-toffeeBrown dark:text-tan block">
                        Réponses de la conciergerie ({activeThread.replies.length})
                      </span>

                      {activeThread.replies.length === 0 ? (
                        <p className="text-xs text-neutral-400 italic">
                          En cours de traitement par notre concierge de permanence...
                        </p>
                      ) : (
                        activeThread.replies.map((rep) => (
                          <div
                            key={rep.id}
                            className="p-3.5 rounded-xl bg-desertSand/20 dark:bg-darkSurface border border-tan/30 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between font-bold text-[11px]">
                              <span className="flex items-center gap-1.5 text-toffeeBrown dark:text-tan">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                {rep.sender_name} ({rep.sender_role})
                              </span>
                              <span className="text-[10px] text-neutral-400 font-normal">
                                {new Date(rep.created_at).toLocaleDateString("fr-FR", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="text-coffeeBean/90 dark:text-almondCream/90 whitespace-pre-wrap">
                              {rep.content}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Reply input */}
                    <form onSubmit={handleSendReply} className="pt-2 flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Répondre à ce fil de discussion..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="flex-1 p-2.5 rounded-xl bg-white dark:bg-darkBg border border-tan/40 text-xs focus:outline-none focus:ring-2 focus:ring-toffeeBrown"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 rounded-xl bg-toffeeBrown hover:bg-coffeeBean text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md apple-press flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Envoyer</span>
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myMessages.length === 0 ? (
                      <div className="text-center py-8 space-y-2">
                        <MessageSquare className="w-8 h-8 text-tan/50 mx-auto" />
                        <p className="text-xs text-neutral-400">
                          Vous n'avez aucun message pour l'instant.
                        </p>
                        <button
                          onClick={() => setActiveTab("new")}
                          className="text-xs font-bold text-toffeeBrown dark:text-tan hover:underline"
                        >
                          Créer votre premier message →
                        </button>
                      </div>
                    ) : (
                      myMessages.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => setSelectedThreadId(m.id)}
                          className="p-4 rounded-2xl bg-white dark:bg-darkBg border border-tan/40 dark:border-fadedCopper/30 hover:border-toffeeBrown transition-all cursor-pointer space-y-1.5 apple-press shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-toffeeBrown dark:text-tan">
                              {m.category}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                m.status === "resolved"
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                  : m.status === "in_review"
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                  : "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                              }`}
                            >
                              {m.status === "resolved"
                                ? "Répondu / Traité"
                                : m.status === "in_review"
                                ? "En cours d'examen"
                                : "Nouveau message"}
                            </span>
                          </div>

                          <h5 className="font-bold text-sm text-coffeeBean dark:text-white line-clamp-1">
                            {m.subject}
                          </h5>
                          <p className="text-xs text-coffeeBean/70 dark:text-almondCream/70 line-clamp-2">
                            {m.content}
                          </p>

                          <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                            <span>
                              {m.replies.length} réponse(s) • {m.country === "TN" ? "🇹🇳 Tunisie" : "🇫🇷 France"}
                            </span>
                            <span className="text-toffeeBrown dark:text-tan font-bold">
                              Ouvrir la discussion →
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
