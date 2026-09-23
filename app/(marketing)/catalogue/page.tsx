"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useApp } from "@/lib/context/app-context";
import { FurnitureItem } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { calculateRangeAvailability } from "@/lib/utils/availability";
import { openWhatsAppQuotation } from "@/lib/utils/whatsapp";
import { DateSelectionModal } from "@/components/catalogue/date-selection-modal";
import {
  Search,
  Grid,
  List,
  Eye,
  CalendarCheck,
  ShieldCheck,
  ShoppingBag,
  MessageCircle,
  X,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CataloguePage() {
  const {
    furniture,
    categories,
    currentUser,
    draftItems,
    addToDraft,
    removeFromDraft,
    updateDraftQuantity,
    submitRentalRequest,
    setActivePreviewItem,
    activeDateModalItem,
    setActiveDateModalItem,
    startDate,
    endDate,
    setDates,
  } = useApp();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedMaterial, setSelectedMaterial] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Contact form modal for final request submission
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState(currentUser.full_name || "");
  const [customerPhone, setCustomerPhone] = useState(currentUser.phone_number || "");
  const [customerEmail, setCustomerEmail] = useState(currentUser.email || "");
  const [companyName, setCompanyName] = useState(currentUser.company_name || "");
  const [notes, setNotes] = useState("");
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  // Materials list
  const materialsList = useMemo(() => {
    const set = new Set<string>();
    furniture.forEach((f) => set.add(f.material));
    return Array.from(set);
  }, [furniture]);

  // Filtered Furniture
  const filteredFurniture = useMemo(() => {
    return furniture.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategory === "all" || item.category_id === selectedCategory;

      const matchesMat =
        selectedMaterial === "all" || item.material === selectedMaterial;

      return matchesSearch && matchesCat && matchesMat;
    });
  }, [furniture, searchQuery, selectedCategory, selectedMaterial]);

  const totalDraftSubtotal = draftItems.reduce((sum, item) => {
    const rate =
      currentUser.role === "professional"
        ? item.professional_price
        : item.rental_price;
    return sum + rate * item.quantity * (item.totalDays || 1);
  }, 0);

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const req = submitRentalRequest({
      customerName,
      phone: customerPhone,
      email: customerEmail,
      companyName,
      notes,
    });
    setRequestSuccess(req.reference_code);
    setIsSubmitModalOpen(false);

    // Trigger WhatsApp redirect automatically
    openWhatsAppQuotation({
      customerName,
      phone: customerPhone,
      companyName,
      startDate,
      endDate,
      items: req.items,
      notes,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header Title */}
      <div className="space-y-4 text-center max-w-3xl mx-auto">
        <span className="text-xs font-bold text-luxury-500 uppercase tracking-widest">
          Digital Rental Catalogue
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold font-serif text-neutral-900 dark:text-white">
          Curated Architectural Collection
        </h1>
        <p className="text-sm text-neutral-500 dark:text-zinc-400">
          Select items and customize dates for each piece. Rent for as many days as you need — stock is verified daily.
        </p>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-neutral-200 dark:border-zinc-800 p-6 rounded-3xl shadow-xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by title, material or tag (e.g. Bouclé, Teak, Sofa)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-neutral-100 dark:bg-zinc-800 text-neutral-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-luxury-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-3 px-4 rounded-2xl bg-neutral-100 dark:bg-zinc-800 text-neutral-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-luxury-500"
            >
              <option value="all">All Categories ({furniture.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Material Filter */}
          <div>
            <select
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
              className="w-full py-3 px-4 rounded-2xl bg-neutral-100 dark:bg-zinc-800 text-neutral-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-luxury-500"
            >
              <option value="all">All Materials</option>
              {materialsList.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Global Date Defaults & View Toggle */}
        <div className="pt-4 border-t border-neutral-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-bold text-neutral-600 dark:text-zinc-300 flex items-center gap-1.5">
              <CalendarCheck className="w-4 h-4 text-luxury-500" />
              <span>Global Event Window:</span>
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setDates(e.target.value, endDate)}
              className="py-1.5 px-3 rounded-xl bg-neutral-100 dark:bg-zinc-800 text-xs font-bold text-neutral-900 dark:text-white border border-neutral-200 dark:border-zinc-700"
            />
            <span className="text-xs text-neutral-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setDates(startDate, e.target.value)}
              className="py-1.5 px-3 rounded-xl bg-neutral-100 dark:bg-zinc-800 text-xs font-bold text-neutral-900 dark:text-white border border-neutral-200 dark:border-zinc-700"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2.5 rounded-xl border transition-colors ${
                viewMode === "grid"
                  ? "bg-luxury-500 text-neutral-950 border-luxury-500"
                  : "bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300 border-neutral-200 dark:border-zinc-700"
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2.5 rounded-xl border transition-colors ${
                viewMode === "list"
                  ? "bg-luxury-500 text-neutral-950 border-luxury-500"
                  : "bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300 border-neutral-200 dark:border-zinc-700"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Catalogue Items Grid / List */}
      {filteredFurniture.length === 0 ? (
        <div className="text-center py-20 bg-white/50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-neutral-300 dark:border-zinc-800 space-y-3">
          <p className="text-base font-bold text-neutral-700 dark:text-zinc-300">
            No furniture matching your exact search filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setSelectedMaterial("all");
            }}
            className="px-4 py-2 rounded-xl bg-luxury-500 text-neutral-950 font-bold text-xs"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredFurniture.map((item) => {
            const avail = calculateRangeAvailability(item, startDate, endDate);
            return (
              <motion.div
                key={item.id}
                whileHover={{ y: -6 }}
                className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-neutral-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between group"
              >
                <div className="relative h-64 w-full overflow-hidden bg-neutral-100 dark:bg-zinc-800">
                  <Image
                    src={item.images[0]}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button
                      onClick={() => setActivePreviewItem(item)}
                      className="p-2.5 rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-luxury-500 hover:text-neutral-950 transition-colors shadow-lg"
                      title="Quick Preview Modal"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="absolute bottom-4 left-4 flex gap-2">
                    <span className="bg-black/60 text-white backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold">
                      Stock Available: {avail.minAvailableInPeriod} units
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div>
                    <Link
                      href={`/catalogue/${item.slug}`}
                      className="text-xl font-bold font-serif text-neutral-900 dark:text-white hover:text-luxury-500 transition-colors"
                    >
                      {item.title}
                    </Link>
                    <p className="text-xs text-neutral-500 dark:text-zinc-400 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-neutral-100 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                      {currentUser.role === "professional" ||
                      currentUser.role === "admin" ||
                      currentUser.role === "super_admin" ||
                      currentUser.role === "manager" ? (
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase font-bold text-luxury-500">
                            Pro Rate
                          </span>
                          <span className="text-lg font-bold text-neutral-900 dark:text-white">
                            {formatCurrency(item.professional_price)}{" "}
                            <span className="text-xs font-normal text-neutral-400">/ day</span>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-luxury-600 dark:text-luxury-400 font-bold">
                          <ShieldCheck className="w-4 h-4" />
                          <span>Request Quote Only</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setActiveDateModalItem(item)}
                      disabled={avail.minAvailableInPeriod <= 0}
                      className="px-4 py-2 rounded-xl bg-luxury-500 text-neutral-950 font-extrabold text-xs hover:bg-luxury-400 disabled:opacity-50 transition-colors shadow-md flex items-center gap-1.5"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Select Dates & Rent</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFurniture.map((item) => {
            const avail = calculateRangeAvailability(item, startDate, endDate);
            return (
              <div
                key={item.id}
                className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-neutral-200 dark:border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6"
              >
                <div className="flex items-center gap-6 w-full sm:w-auto">
                  <div className="relative w-28 h-28 rounded-2xl overflow-hidden flex-shrink-0 bg-neutral-100 dark:bg-zinc-800">
                    <Image src={item.images[0]} alt={item.title} fill className="object-cover" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-serif text-neutral-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                      {item.material} • {item.color}
                    </p>
                    <span className="text-[11px] font-bold text-luxury-500 mt-2 block">
                      {avail.minAvailableInPeriod} units available
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  {currentUser.role === "professional" && (
                    <span className="text-lg font-bold text-neutral-900 dark:text-white">
                      {formatCurrency(item.professional_price)} / day
                    </span>
                  )}
                  <button
                    onClick={() => setActiveDateModalItem(item)}
                    className="px-5 py-2.5 rounded-xl bg-luxury-500 text-neutral-950 font-extrabold text-xs hover:bg-luxury-400 transition-colors shadow-md flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Select Dates & Rent</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ITEM-SPECIFIC DATE SELECTION MODAL */}
      {activeDateModalItem && (
        <DateSelectionModal
          item={activeDateModalItem}
          currentUserRole={currentUser.role}
          onClose={() => setActiveDateModalItem(null)}
          onConfirmAdd={(item, itemStart, itemEnd, qty) => {
            addToDraft(item, qty, itemStart, itemEnd);
          }}
        />
      )}

      {/* RENTAL REQUEST DRAFT SUMMARY DRAWER SECTION */}
      <div
        id="draft-summary"
        className="bg-neutral-900 text-white p-8 sm:p-12 rounded-3xl border border-luxury-500/30 shadow-2xl space-y-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
          <div>
            <span className="text-xs font-bold text-luxury-400 uppercase tracking-widest">
              Review Your Event Request Draft
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-serif">
              Current Rental Quotation Draft
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">
              {draftItems.length} item types selected
            </span>
          </div>
        </div>

        {requestSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>
                Rental Request <strong>{requestSuccess}</strong> submitted! WhatsApp concierge opened.
              </span>
            </div>
            <button onClick={() => setRequestSuccess(null)} className="text-xs text-emerald-400 underline">
              Dismiss
            </button>
          </div>
        )}

        {draftItems.length === 0 ? (
          <p className="text-sm text-neutral-400 italic text-center py-8">
            Your rental request draft is empty. Click "Select Dates & Rent" on any item above.
          </p>
        ) : (
          <div className="space-y-6">
            <div className="divide-y divide-neutral-800">
              {draftItems.map((item) => (
                <div key={item.furniture_id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-neutral-800 flex-shrink-0">
                      <Image src={item.image} alt={item.title} fill className="object-cover" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-serif">{item.title}</h4>
                      <div className="text-xs text-luxury-400 mt-0.5">
                        🗓 Dates: <strong>{item.startDate || startDate}</strong> → <strong>{item.endDate || endDate}</strong> ({item.totalDays || 1} Days)
                      </div>
                      {currentUser.role === "professional" && (
                        <span className="text-xs text-neutral-400 block mt-0.5">
                          Rate: {formatCurrency(item.professional_price)} / day
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-neutral-800 rounded-xl px-3 py-1 border border-neutral-700">
                      <button
                        onClick={() => updateDraftQuantity(item.furniture_id, item.quantity - 1)}
                        className="text-neutral-400 hover:text-white font-bold text-sm"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateDraftQuantity(item.furniture_id, item.quantity + 1)}
                        className="text-neutral-400 hover:text-white font-bold text-sm"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromDraft(item.furniture_id)}
                      className="text-neutral-500 hover:text-rose-400 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Price notice or estimated total */}
            <div className="pt-6 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                {currentUser.role === "professional" ? (
                  <div className="flex flex-col">
                    <span className="text-xs text-neutral-400">Estimated Professional Subtotal</span>
                    <span className="text-2xl font-black text-luxury-400 font-serif">
                      {formatCurrency(totalDraftSubtotal)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-luxury-400 text-xs font-bold bg-luxury-500/10 px-4 py-2 rounded-xl border border-luxury-500/20">
                    <ShieldCheck className="w-4 h-4" />
                    <span>No online prices displayed for retail customers. Quotation calculated by concierge.</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="px-8 py-4 rounded-full bg-luxury-500 text-neutral-950 font-extrabold text-xs uppercase tracking-wider hover:bg-luxury-400 transition-all shadow-xl shadow-luxury-500/20 flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4 text-neutral-950" />
                  <span>Request Quotation on WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FINAL REQUEST CONTACT MODAL */}
      <AnimatePresence>
        {isSubmitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-luxury-500/30 rounded-3xl p-8 max-w-lg w-full text-white space-y-6 shadow-2xl relative"
            >
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="absolute top-6 right-6 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <h3 className="text-2xl font-bold font-serif">Submit Rental Quotation Request</h3>
                <p className="text-xs text-neutral-400">
                  Enter your details to generate your official quote reference and launch WhatsApp concierge.
                </p>
              </div>

              <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-neutral-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full p-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-neutral-300 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full p-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-300 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full p-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1">Company / Event Agency (Optional)</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full p-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1">Special Setup Notes</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="E.g. VIP stage setup required by 9 AM..."
                    className="w-full p-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-full bg-luxury-500 text-neutral-950 font-extrabold text-xs uppercase tracking-wider hover:bg-luxury-400 transition-colors shadow-lg"
                >
                  Submit & Open WhatsApp
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
