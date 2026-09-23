"use client";

import React, { useState } from "react";
import { MessageCircle, Mail, MapPin, Phone, Send, CheckCircle2 } from "lucide-react";
import { openWhatsAppQuotation } from "@/lib/utils/whatsapp";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <span className="text-xs font-bold text-luxury-500 uppercase tracking-widest">
          Concierge Direct
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold font-serif text-neutral-900 dark:text-white">
          Contact Scenography Team
        </h1>
        <p className="text-sm text-neutral-500 dark:text-zinc-400">
          Have custom venue questions or need custom quotation validation? Contact our dedicated concierge.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Info Cards */}
        <div className="space-y-6">
          <div className="p-8 rounded-3xl bg-neutral-900 text-white border border-neutral-800 space-y-4 shadow-xl">
            <h3 className="text-xl font-bold font-serif text-luxury-400">
              Instant WhatsApp Concierge
            </h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Launch direct chat with our rental managers to send floor plans, date requests, or high-priority changes.
            </p>
            <button
              onClick={() =>
                openWhatsAppQuotation({
                  customerName: "Website Visitor",
                  phone: "+44 7700 900123",
                  startDate: "2026-08-15",
                  endDate: "2026-08-18",
                  items: [],
                  notes: "General concierge enquiry from contact page.",
                })
              }
              className="w-full py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Launch WhatsApp Chat</span>
            </button>
          </div>

          <div className="p-6 rounded-3xl bg-white/80 dark:bg-zinc-900/80 border border-neutral-200 dark:border-zinc-800 space-y-4 text-xs font-semibold">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-luxury-500" />
              <div>
                <div className="text-neutral-400">Main Atelier & Showroom</div>
                <div className="text-neutral-900 dark:text-white">12 Berkeley Square, Mayfair, London W1J 6BD</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-luxury-500" />
              <div>
                <div className="text-neutral-400">Email Enquiries</div>
                <div className="text-neutral-900 dark:text-white">concierge@concorde-events.com</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-luxury-500" />
              <div>
                <div className="text-neutral-400">VIP Phone Line</div>
                <div className="text-neutral-900 dark:text-white">+44 20 7946 0999</div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-neutral-200 dark:border-zinc-800 p-8 sm:p-10 rounded-3xl shadow-xl space-y-6">
          <h3 className="text-2xl font-bold font-serif text-neutral-900 dark:text-white">
            Send an Enquiry
          </h3>

          {submitted ? (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm space-y-2">
              <div className="flex items-center gap-2 font-bold text-base">
                <CheckCircle2 className="w-5 h-5" />
                <span>Message Received!</span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-zinc-300">
                Thank you for contacting Concorde Events. Our lead scenographer will reply within 2 business hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-neutral-600 dark:text-zinc-300 mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 dark:text-zinc-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-600 dark:text-zinc-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                />
              </div>

              <div>
                <label className="block text-neutral-600 dark:text-zinc-300 mb-1">Message / Venue Details</label>
                <textarea
                  rows={5}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-full bg-luxury-500 text-neutral-950 font-extrabold text-xs uppercase tracking-wider hover:bg-luxury-400 transition-colors shadow-lg flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Send Message</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
