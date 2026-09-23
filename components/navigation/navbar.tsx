"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/context/app-context";
import { UserRole } from "@/lib/types";
import {
  ShoppingBag,
  Sun,
  Moon,
  UserCheck,
  ChevronDown,
  Sparkles,
  Menu as MenuIcon,
  X,
  LogIn,
  UserPlus,
  User,
  Languages,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FeedbackModal } from "@/components/messaging/feedback-modal";

export function Navbar() {
  const {
    currentUser,
    setCurrentUserRole,
    draftItems,
    isDarkMode,
    toggleTheme,
    language,
    setLanguage,
    country,
    setCountry,
    currencySymbol,
    messages,
    t,
  } = useApp();

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const totalDraftCount = draftItems.reduce((acc, item) => acc + item.quantity, 0);

  const isAdminOrSuper =
    currentUser.role === "admin" || currentUser.role === "super_admin";

  const unreadCount = messages.filter((m) => m.status === "unread").length;

  const rolesList: { role: UserRole; label: string; badge: string }[] = [
    { role: "visitor", label: "Visitor", badge: "No Prices / WhatsApp" },
    { role: "customer", label: "Customer", badge: "Account Approved" },
    { role: "professional", label: "Professional", badge: "Wholesale & Calculator" },
    { role: "editor", label: "Editor", badge: "CMS Content Manager" },
    { role: "manager", label: "Manager", badge: "Inventory & Quotes" },
    { role: "admin", label: "Administrator", badge: "Full Access" },
    { role: "super_admin", label: "Super Administrator", badge: "Platform Control" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full transition-all">
      {/* 1. TOP ANNOUNCEMENT BANNER (Amsterdam Deco Inspired) */}
      <div className="w-full bg-gradient-to-r from-coffeeBean via-toffeeBrown to-coffeeBean text-almondCream text-[11px] sm:text-xs font-semibold py-2 px-4 text-center tracking-wider shadow-inner flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-tan animate-pulse shrink-0" />
        <span className="truncate">{t.announcement}</span>
        <span className="hidden md:inline text-tan/70">•</span>
        <span className="hidden md:inline text-tan/90 font-medium">
          {country === "TN" ? "Devises en Dinars Tunisiens (TND DT)" : "Devises en Euros (EUR €)"}
        </span>
      </div>

      {/* 2. ADMIN ROLE SIMULATOR BAR */}
      {isAdminOrSuper && (
        <div className="bg-coffeeBean/95 text-tan text-xs px-4 py-1.5 border-b border-fadedCopper/30 backdrop-blur-md">
          <div className="flex items-center gap-2 max-w-[1200px] mx-auto w-full justify-between">
            <div className="flex items-center gap-2 text-[11px] sm:text-xs">
              <Sparkles className="w-3.5 h-3.5 text-tan animate-pulse" />
              <span>
                <strong>{t.nav.roleSimulator}:</strong>{" "}
                <strong className="text-white uppercase tracking-wider underline decoration-tan">
                  {currentUser.role.replace("_", " ")}
                </strong>{" "}
                ({currentUser.status})
              </span>
            </div>

            <div className="relative">
              <button
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-almondCream/10 hover:bg-almondCream/20 text-almondCream transition-colors text-[11px] font-semibold border border-tan/30 whitespace-nowrap apple-press"
              >
                <UserCheck className="w-3 h-3 text-tan" />
                <span>{t.nav.switchRole}</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              <AnimatePresence>
                {isRoleDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute right-0 mt-2 w-64 rounded-2xl bg-coffeeBean/95 backdrop-blur-2xl border border-fadedCopper/40 shadow-2xl p-2 z-50 text-almondCream space-y-1"
                  >
                    <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-tan tracking-wider">
                      {t.nav.roleSimulator}
                    </div>
                    {rolesList.map((r) => (
                      <button
                        key={r.role}
                        onClick={() => {
                          setCurrentUserRole(r.role);
                          setIsRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex flex-col transition-colors ${
                          currentUser.role === r.role
                            ? "bg-toffeeBrown text-white font-bold border border-tan/40"
                            : "hover:bg-darkSurface text-almondCream/90"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{r.label}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-darkBg text-tan">
                            {r.badge}
                          </span>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN NAVBAR HEADER (Standard 1140px-1200px layout container) */}
      <div className="w-full backdrop-blur-2xl bg-[#fcf8f4]/90 dark:bg-[#120e0b]/90 border-b border-tan/30 dark:border-fadedCopper/25 shadow-sm transition-colors">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-3 sm:gap-6">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-coffeeBean to-toffeeBrown flex items-center justify-center text-almondCream font-black text-xl shadow-md border border-tan/40 group-hover:scale-105 transition-transform duration-300">
              C
            </div>
            <div className="flex flex-col">
              <span className="font-black text-base sm:text-lg tracking-[0.2em] text-coffeeBean dark:text-almondCream uppercase font-serif whitespace-nowrap">
                CONCORDE
              </span>
              <span className="text-[9px] tracking-[0.3em] text-fadedCopper dark:text-tan uppercase font-semibold whitespace-nowrap">
                EVENTS ARCHITECTURE
              </span>
            </div>
          </Link>

          {/* Desktop Links (Apple-Style Floating Restraint) */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-coffeeBean/80 dark:text-almondCream/80">
            <Link href="/" className="hover:text-toffeeBrown dark:hover:text-tan transition-colors whitespace-nowrap">
              {t.nav.home}
            </Link>
            <Link href="/catalogue" className="hover:text-toffeeBrown dark:hover:text-tan transition-colors whitespace-nowrap">
              {t.nav.catalogue}
            </Link>
            <Link href="/about" className="hover:text-toffeeBrown dark:hover:text-tan transition-colors whitespace-nowrap">
              {t.nav.about}
            </Link>
            <Link href="/contact" className="hover:text-toffeeBrown dark:hover:text-tan transition-colors whitespace-nowrap">
              {t.nav.contact}
            </Link>

            {currentUser.role !== "visitor" && (
              <Link
                href="/dashboard"
                className="px-4 py-1.5 rounded-full bg-tan/20 dark:bg-fadedCopper/20 hover:bg-tan/30 text-coffeeBean dark:text-almondCream font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap border border-tan/30"
              >
                <span>{t.nav.dashboard}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </Link>
            )}
          </nav>

          {/* Right side controls wrapper */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* COUNTRY SELECTOR [ 🇫🇷 FR (€) | 🇹🇳 TN (DT) ] */}
            <div className="flex items-center p-1 rounded-full bg-desertSand/40 dark:bg-darkSurface border border-tan/40 shadow-inner">
              <button
                onClick={() => setCountry("FR")}
                title="France - Devises en Euros (€)"
                className={`relative px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                  country === "FR"
                    ? "text-white shadow-md"
                    : "text-coffeeBean dark:text-almondCream/70 hover:text-coffeeBean"
                }`}
              >
                {country === "FR" && (
                  <motion.div
                    layoutId="country-pill"
                    className="absolute inset-0 bg-coffeeBean rounded-full"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1">
                  <span>🇫🇷</span>
                  <span>EUR</span>
                </span>
              </button>

              <button
                onClick={() => setCountry("TN")}
                title="Tunisie - Devises en Dinars Tunisiens (DT)"
                className={`relative px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                  country === "TN"
                    ? "text-white shadow-md"
                    : "text-coffeeBean dark:text-almondCream/70 hover:text-coffeeBean"
                }`}
              >
                {country === "TN" && (
                  <motion.div
                    layoutId="country-pill"
                    className="absolute inset-0 bg-coffeeBean rounded-full"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1">
                  <span>🇹🇳</span>
                  <span>TND</span>
                </span>
              </button>
            </div>

            {/* APPLE-STYLE SEGMENTED LANGUAGE TOGGLE [ FR | العربية ] */}
            <div className="hidden sm:flex items-center p-1 rounded-full bg-desertSand/40 dark:bg-darkSurface border border-tan/40 shadow-inner">
              <button
                onClick={() => setLanguage("fr")}
                className={`relative px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  language === "fr"
                    ? "text-white shadow-md"
                    : "text-coffeeBean dark:text-almondCream/70 hover:text-coffeeBean"
                }`}
              >
                {language === "fr" && (
                  <motion.div
                    layoutId="lang-pill"
                    className="absolute inset-0 bg-toffeeBrown rounded-full"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10">FR</span>
              </button>

              <button
                onClick={() => setLanguage("ar")}
                className={`relative px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  language === "ar"
                    ? "text-white shadow-md"
                    : "text-coffeeBean dark:text-almondCream/70 hover:text-coffeeBean"
                }`}
              >
                {language === "ar" && (
                  <motion.div
                    layoutId="lang-pill"
                    className="absolute inset-0 bg-toffeeBrown rounded-full"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10 font-sans">العربية</span>
              </button>
            </div>

            {/* Messaging & Feedback Modal Trigger */}
            <button
              onClick={() => setIsFeedbackOpen(true)}
              className="relative p-2.5 rounded-2xl bg-desertSand/30 dark:bg-darkSurface text-coffeeBean dark:text-almondCream hover:text-toffeeBrown dark:hover:text-tan transition-colors border border-tan/25 apple-press"
              aria-label="Messages & Retours"
              title="Messagerie & Retours Expériences"
            >
              <MessageSquare className="w-4 h-4 text-toffeeBrown dark:text-tan" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-toffeeBrown text-white text-[9px] font-bold flex items-center justify-center shadow">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Theme Toggle (Apple style) */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-2xl bg-desertSand/30 dark:bg-darkSurface text-coffeeBean dark:text-almondCream hover:text-toffeeBrown dark:hover:text-tan transition-colors border border-tan/25 apple-press"
              aria-label="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-tan" /> : <Moon className="w-4 h-4 text-coffeeBean" />}
            </button>

            {/* Draft Request Drawer Trigger (Apple Capsule) */}
            <Link
              href="/catalogue#draft-summary"
              className="relative px-4 py-2.5 rounded-2xl bg-toffeeBrown text-white font-bold hover:bg-coffeeBean transition-all shadow-md shadow-toffeeBrown/20 flex items-center gap-2 whitespace-nowrap apple-press"
            >
              <ShoppingBag className="w-4 h-4 text-almondCream" />
              <span className="hidden sm:inline text-xs font-extrabold uppercase tracking-wider">
                {t.nav.requestDraft}
              </span>
              {totalDraftCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-coffeeBean text-almondCream text-[11px] font-black shadow">
                  {totalDraftCount}
                </span>
              )}
            </Link>

            {/* Auth Buttons */}
            <div className="hidden sm:flex items-center gap-2 border-l border-tan/30 dark:border-fadedCopper/30 pl-3">
              {currentUser.role === "visitor" ? (
                <>
                  <Link
                    href="/login"
                    className="px-4 py-2 rounded-full bg-desertSand/30 dark:bg-darkSurface text-coffeeBean dark:text-almondCream text-xs font-bold hover:bg-desertSand/50 transition-colors flex items-center gap-1.5 whitespace-nowrap border border-tan/30 apple-press"
                  >
                    <LogIn className="w-3.5 h-3.5 text-fadedCopper" />
                    <span>{t.nav.logIn}</span>
                  </Link>

                  <Link
                    href="/register"
                    className="px-4 py-2 rounded-full bg-coffeeBean text-almondCream text-xs font-extrabold uppercase tracking-wider hover:bg-toffeeBrown transition-colors shadow-sm flex items-center gap-1.5 whitespace-nowrap apple-press"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-tan" />
                    <span>{t.nav.signUp}</span>
                  </Link>
                </>
              ) : (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-tan/20 text-coffeeBean dark:text-almondCream border border-tan/40 text-xs font-bold whitespace-nowrap apple-press"
                >
                  <User className="w-3.5 h-3.5 text-toffeeBrown" />
                  <span className="truncate max-w-[110px]">{currentUser.full_name}</span>
                </Link>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2.5 rounded-2xl bg-desertSand/30 dark:bg-darkSurface text-coffeeBean dark:text-almondCream border border-tan/30 apple-press"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* 4. MOBILE DRAWER MENU */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#fcf8f4]/95 dark:bg-[#120e0b]/95 border-b border-tan/30 px-6 py-6 space-y-4 text-base font-semibold backdrop-blur-2xl"
          >
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-coffeeBean dark:text-almondCream hover:text-toffeeBrown"
            >
              {t.nav.home}
            </Link>
            <Link
              href="/catalogue"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-coffeeBean dark:text-almondCream hover:text-toffeeBrown"
            >
              {t.nav.catalogue}
            </Link>
            <Link
              href="/about"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-coffeeBean dark:text-almondCream hover:text-toffeeBrown"
            >
              {t.nav.about}
            </Link>
            <Link
              href="/contact"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-coffeeBean dark:text-almondCream hover:text-toffeeBrown"
            >
              {t.nav.contact}
            </Link>

            {currentUser.role !== "visitor" && (
              <Link
                href="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-toffeeBrown font-bold"
              >
                {t.nav.dashboard}
              </Link>
            )}

            <div className="pt-4 border-t border-tan/20 flex items-center justify-between">
              <span className="text-xs text-coffeeBean/70 dark:text-almondCream/70 font-bold">
                Langue / اللغة:
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setLanguage("fr")}
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    language === "fr" ? "bg-toffeeBrown text-white" : "bg-desertSand/40 text-coffeeBean"
                  }`}
                >
                  Français
                </button>
                <button
                  onClick={() => setLanguage("ar")}
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    language === "ar" ? "bg-toffeeBrown text-white" : "bg-desertSand/40 text-coffeeBean"
                  }`}
                >
                  العربية
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. USER MESSAGING & FEEDBACK MODAL */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
    </header>
  );
}
