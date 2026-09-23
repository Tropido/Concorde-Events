"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context/app-context";
import { UserRole } from "@/lib/types";
import { ShieldAlert, CheckCircle2, Lock, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, setCurrentUserRole, setCurrentUserStatus } = useApp();

  const [email, setEmail] = useState(currentUser.email);
  const [password, setPassword] = useState("••••••••••••");
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentUser.role);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentUserRole(selectedRole);

    if (currentUser.status === "pending") {
      // Show pending status block screen
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-neutral-200 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-luxury-500 text-neutral-950 font-black text-2xl mx-auto flex items-center justify-center shadow-lg font-serif">
            C
          </div>
          <h1 className="text-2xl font-bold font-serif text-neutral-900 dark:text-white">
            Client & Professional Portal
          </h1>
          <p className="text-xs text-neutral-500 dark:text-zinc-400">
            Sign in to access wholesale quotations, calculator, and inventory controls.
          </p>
        </div>

        {/* PENDING ACCOUNT APPROVAL SCREEN TRAP */}
        {currentUser.status === "pending" ? (
          <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 space-y-4 text-center">
            <ShieldAlert className="w-10 h-10 mx-auto text-amber-500 animate-bounce" />
            <div>
              <h3 className="font-bold text-base">Your account is awaiting approval.</h3>
              <p className="text-xs text-neutral-600 dark:text-zinc-300 mt-1">
                Our platform administrators have been notified of your registration. You will receive access once your business credentials (VAT / Company) are manually verified.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => setCurrentUserStatus("approved")}
                className="w-full py-2.5 rounded-xl bg-luxury-500 text-neutral-950 font-bold text-xs"
              >
                [Sandbox Admin Override]: Approve Account Now
              </button>
              <Link href="/" className="text-xs text-neutral-400 hover:text-white underline">
                Return to Public Catalogue
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4 text-xs font-semibold">
            {/* Persona Simulator Dropdown */}
            <div className="p-3 rounded-2xl bg-luxury-500/10 border border-luxury-500/30 space-y-1">
              <label className="text-[10px] uppercase font-bold text-luxury-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Select Persona to Test Login:
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full py-2 px-3 rounded-xl bg-neutral-900 text-white text-xs font-bold focus:outline-none"
              >
                <option value="professional">Professional (Approved - Wholesale & PDF Quotes)</option>
                <option value="customer">Customer (Approved - Favorites & Requests)</option>
                <option value="manager">Manager (Inventory & Quotations Approval)</option>
                <option value="admin">Administrator (Full System Control)</option>
                <option value="super_admin">Super Administrator (Full Master Controls)</option>
                <option value="editor">Editor (CMS Content Only)</option>
                <option value="visitor">Visitor (Public Browser)</option>
              </select>
            </div>

            <div>
              <label className="block text-neutral-600 dark:text-zinc-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-neutral-600 dark:text-zinc-300">Password</label>
                <Link href="/forgot-password" className="text-luxury-500 hover:underline text-[11px]">
                  Forgot Password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-full bg-luxury-500 text-neutral-950 font-extrabold text-xs uppercase tracking-wider hover:bg-luxury-400 transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <span>Sign In to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="text-center text-xs text-neutral-500 border-t border-neutral-100 dark:border-zinc-800 pt-4">
          Don't have an account?{" "}
          <Link href="/register" className="text-luxury-500 font-bold hover:underline">
            Register Business Account
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
