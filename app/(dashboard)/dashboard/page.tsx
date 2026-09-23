"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useApp } from "@/lib/context/app-context";
import { FurnitureItem, AccountStatus, UserRole, RequestStatus, ItemCondition, RentalRequest } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { downloadQuotationPDF } from "@/lib/utils/pdf";
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  TrendingUp,
  Award,
  Settings,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Calculator,
  ShieldCheck,
  Edit,
  Trash2,
  BarChart3,
  RefreshCw,
  Sparkles,
  Search,
  Truck,
  RotateCcw,
  Wrench,
  ShieldAlert,
  Eye,
  Calendar,
  AlertTriangle,
  DollarSign,
  Layers,
  Activity,
  FileSpreadsheet,
  PieChart,
  ArrowDownRight,
  ArrowUpRight,
  Upload,
  X,
  MessageSquare,
  Star,
  Send,
  Tag,
  Bookmark,
  Check,
  Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UserFlag, UserLevel } from "@/lib/types";

export default function DashboardPage() {
  const {
    currentUser,
    allUsers,
    updateUserStatus,
    updateUserFlags,
    updateUserLevel,
    updateUserNotes,
    updateUserBenefits,
    messages,
    replyMessage,
    updateMessageStatus,
    country,
    currency,
    currencySymbol,
    formatPrice,
    furniture,
    addFurnitureItem,
    updateFurnitureItem,
    deleteFurnitureItem,
    adjustFurnitureStock,
    activeRentedItems,
    returnRentedItem,
    updateRentedItemCondition,
    rentalRequests,
    updateRequestStatus,
    reprogramRequestDates,
    cms,
    updateCMS,
    startDate,
    endDate,
    language,
    t,
  } = useApp();

  const [activeTab, setActiveTab] = useState<string>("overview");

  // Currency Filter for Profits & Data (Consolidated / EUR / TND)
  const [currencyFilter, setCurrencyFilter] = useState<"all" | "EUR" | "TND">("all");

  // Messages Filter & Reply States
  const [msgCategoryFilter, setMsgCategoryFilter] = useState<string>("all");
  const [msgCountryFilter, setMsgCountryFilter] = useState<string>("all");
  const [adminReplyTexts, setAdminReplyTexts] = useState<{ [msgId: string]: string }>({});
  const [userNotesDrafts, setUserNotesDrafts] = useState<{ [userId: string]: string }>({});
  const [userSavedFeedback, setUserSavedFeedback] = useState<{ [userId: string]: boolean }>({});

  // ERP Intelligence States
  const [erpPeriod, setErpPeriod] = useState<"monthly" | "quarterly">("monthly");
  const [roiSearchQuery, setRoiSearchQuery] = useState("");
  const [roiCategoryFilter, setRoiCategoryFilter] = useState("all");

  // User Management Search & Filter
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedUserRoleFilter, setSelectedUserRoleFilter] = useState<string>("all");

  // Add Item Modal State (supports multiple images & local file uploads)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState("Honey Gold");
  const [newMaterial, setNewMaterial] = useState("Teak Wood");
  const [newRentalPrice, setNewRentalPrice] = useState(150);
  const [newProPrice, setNewProPrice] = useState(120);
  const [newQtyOwned, setNewQtyOwned] = useState(10);
  const [newImagesList, setNewImagesList] = useState<string[]>([
    "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
  ]);
  const [newImageUrlInput, setNewImageUrlInput] = useState("");

  // Edit Furniture Modal State
  const [editingItem, setEditingItem] = useState<FurnitureItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editMaterial, setEditMaterial] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editRentalPrice, setEditRentalPrice] = useState(0);
  const [editProPrice, setEditProPrice] = useState(0);
  const [editQtyOwned, setEditQtyOwned] = useState(0);
  const [editImagesList, setEditImagesList] = useState<string[]>([]);
  const [editImageUrlInput, setEditImageUrlInput] = useState("");

  // Custom Quantity Adjuster Input state for inventory table
  const [customStockInputs, setCustomStockInputs] = useState<{ [key: string]: number }>({});

  // Request Preview Modal State
  const [previewRequest, setPreviewRequest] = useState<RentalRequest | null>(null);

  // Reprogram Request Dates Modal State
  const [reprogramRequest, setReprogramRequest] = useState<RentalRequest | null>(null);
  const [reprogramStart, setReprogramStart] = useState("2026-09-01");
  const [reprogramEnd, setReprogramEnd] = useState("2026-09-05");

  // Pro Calculator State
  const [calcSelectedId, setCalcSelectedId] = useState<string>(furniture[0]?.id || "");
  const [calcQty, setCalcQty] = useState<number>(2);
  const [calcDays, setCalcDays] = useState<number>(3);

  // CMS Editor State
  const [cmsHeroTitle, setCmsHeroTitle] = useState(cms.hero.title);
  const [cmsHeroSub, setCmsHeroSub] = useState(cms.hero.subtitle);

  // Active Rented Items State (Track currently dispatched inventory)
  const [localRentedItems, setLocalRentedItems] = useState([...activeRentedItems]);

  // Handle Local Image File Uploads (Add Modal)
  const handleAddFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setNewImagesList((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle Local Image File Uploads (Edit Modal)
  const handleEditFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setEditImagesList((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Open Edit Furniture Modal
  const openEditModal = (item: FurnitureItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditDesc(item.description);
    setEditMaterial(item.material);
    setEditColor(item.color);
    setEditRentalPrice(item.rental_price);
    setEditProPrice(item.professional_price);
    setEditQtyOwned(item.quantity_owned);
    setEditImagesList([...item.images]);
    setEditImageUrlInput("");
  };

  // Save Edit Furniture
  const handleSaveEditFurniture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    let finalImages = [...editImagesList];
    if (editImageUrlInput.trim().length > 0) {
      finalImages.push(editImageUrlInput.trim());
    }

    updateFurnitureItem(editingItem.id, {
      title: editTitle,
      description: editDesc,
      material: editMaterial,
      color: editColor,
      rental_price: Number(editRentalPrice),
      professional_price: Number(editProPrice),
      quantity_owned: Number(editQtyOwned),
      images: finalImages.length > 0 ? finalImages : editingItem.images,
    });
    setEditingItem(null);
  };

  // Add Furniture Submit
  const handleAddFurniture = (e: React.FormEvent) => {
    e.preventDefault();
    let finalImages = [...newImagesList];
    if (newImageUrlInput.trim().length > 0) {
      finalImages.push(newImageUrlInput.trim());
    }

    addFurnitureItem({
      category_id: "cat-1",
      category_name: "Seating & Lounges",
      title: newTitle,
      slug: newSlug || newTitle.toLowerCase().replace(/\s+/g, "-"),
      description: newDesc,
      dimensions: { width: 120, height: 80, depth: 60, unit: "cm" },
      color: newColor,
      material: newMaterial,
      tags: ["New Arrival", "Architectural"],
      rental_price: Number(newRentalPrice),
      professional_price: Number(newProPrice),
      quantity_owned: Number(newQtyOwned),
      quantity_reserved: 0,
      minimum_rental_days: 1,
      featured: true,
      status: "active",
      images:
        finalImages.length > 0
          ? finalImages
          : ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"],
    });
    setIsAddModalOpen(false);
  };

  // Metrics
  const totalFurnitureTypes = furniture.length;
  const totalUnitsOwned = furniture.reduce((sum, f) => sum + f.quantity_owned, 0);
  const totalUnitsReserved = furniture.reduce((sum, f) => sum + f.quantity_reserved, 0);
  const availableUnitsToday = totalUnitsOwned - totalUnitsReserved;
  const pendingUserApprovals = allUsers.filter((u) => u.status === "pending");

  // Filtered Users List for Admin User Manager
  const filteredUsers = allUsers.filter((u) => {
    const nameMatch = u.full_name ? u.full_name.toLowerCase().includes(userSearchQuery.toLowerCase()) : false;
    const emailMatch = u.email ? u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) : false;
    const companyMatch = u.company_name ? u.company_name.toLowerCase().includes(userSearchQuery.toLowerCase()) : false;

    const matchesSearch = userSearchQuery === "" || nameMatch || emailMatch || companyMatch;
    const matchesRole = selectedUserRoleFilter === "all" || u.role === selectedUserRoleFilter;
    return matchesSearch && matchesRole;
  });

  // ERP Intelligence Asset ROI Breakdown Ledger
  const assetRoiList = [
    {
      id: "roi-1",
      model: "The Kasaya Curved Sofa",
      category: "Seating & Lounges",
      purchaseCost: 1200,
      totalEarned: 14700,
      trips: 42,
      condition: "perfect" as ItemCondition,
      paybackMonths: 2.1,
      roiPercent: 1125,
      image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "roi-2",
      model: "Prasaja Teak Armchair",
      category: "Seating & Lounges",
      purchaseCost: 350,
      totalEarned: 3990,
      trips: 42,
      condition: "good" as ItemCondition,
      paybackMonths: 2.3,
      roiPercent: 1040,
      image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "roi-3",
      model: "Scagliola Italian Banquet Table",
      category: "Tables & Dining",
      purchaseCost: 1800,
      totalEarned: 11600,
      trips: 28,
      condition: "good" as ItemCondition,
      paybackMonths: 3.4,
      roiPercent: 544,
      image: "https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "roi-4",
      model: "Travertine Fluted Bar Console",
      category: "Bars & Reception Consoles",
      purchaseCost: 2400,
      totalEarned: 9600,
      trips: 16,
      condition: "perfect" as ItemCondition,
      paybackMonths: 4.2,
      roiPercent: 300,
      image: "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "roi-5",
      model: "Alabaster Architectural Lamp",
      category: "Architectural Lighting",
      purchaseCost: 450,
      totalEarned: 3850,
      trips: 35,
      condition: "perfect" as ItemCondition,
      paybackMonths: 1.8,
      roiPercent: 755,
      image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "roi-6",
      model: "Teak Cabana Outdoor Daybed",
      category: "Outdoor Luxury",
      purchaseCost: 1600,
      totalEarned: 7200,
      trips: 18,
      condition: "bad" as ItemCondition,
      paybackMonths: 3.9,
      roiPercent: 350,
      image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=400&q=80",
    },
  ];

  const filteredRoiItems = assetRoiList.filter((item) => {
    const matchesSearch =
      item.model.toLowerCase().includes(roiSearchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(roiSearchQuery.toLowerCase());
    const matchesCat = roiCategoryFilter === "all" || item.category === roiCategoryFilter;
    return matchesSearch && matchesCat;
  });

  const exportERPCsv = () => {
    const headers = [
      "Model",
      "Category",
      "Acquisition Cost (EUR)",
      "Cumulative Revenue (EUR)",
      "Trips",
      "Condition",
      "Payback (Months)",
      "Net ROI (%)",
    ];
    const rows = assetRoiList.map((item) => [
      `"${item.model}"`,
      `"${item.category}"`,
      item.purchaseCost,
      item.totalEarned,
      item.trips,
      `"${item.condition}"`,
      item.paybackMonths,
      `"+${item.roiPercent}%"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `concorde-erp-profits-report-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pro Calculator
  const calcItem = furniture.find((f) => f.id === calcSelectedId) || furniture[0];
  const calcTotal = calcItem ? calcItem.professional_price * calcQty * calcDays : 0;

  // Condition Badge Color Mapper
  const getConditionBadge = (cond: ItemCondition) => {
    switch (cond) {
      case "perfect":
        return { label: "Perfect Condition", bg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" };
      case "good":
        return { label: "Good Condition", bg: "bg-blue-500/10 text-blue-400 border-blue-500/30" };
      case "bad":
        return { label: "Bad Condition", bg: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
      case "broken":
        return { label: "Broken / Defective", bg: "bg-rose-500/10 text-rose-400 border-rose-500/30 font-extrabold" };
      default:
        return { label: "Perfect Condition", bg: "bg-emerald-500/10 text-emerald-500" };
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header & Role Banner */}
      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-neutral-200 dark:border-zinc-800 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-luxury-500 text-neutral-950 font-black text-2xl flex items-center justify-center font-serif shadow-lg">
            {currentUser.full_name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-serif text-neutral-900 dark:text-white">
                Welcome back, {currentUser.full_name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-luxury-500/20 text-luxury-500 border border-luxury-500/30">
                {currentUser.role.replace("_", " ")}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-zinc-400 mt-0.5">
              {currentUser.company_name ? `${currentUser.company_name} • ` : ""}
              Account Status: <strong className="text-emerald-500 uppercase">{currentUser.status}</strong>
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          {currentUser.role === "professional" && (
            <div className="px-4 py-2 rounded-2xl bg-luxury-500/10 border border-luxury-500/30 text-xs font-bold text-luxury-400 flex items-center gap-2">
              <Award className="w-4 h-4 text-luxury-500" />
              <span>{currentUser.pro_tier.toUpperCase()} TIER ({currentUser.reward_points} PTS)</span>
            </div>
          )}

          <Link
            href="/catalogue"
            className="px-5 py-2.5 rounded-2xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition-colors"
          >
            Browse Catalogue
          </Link>
        </div>
      </div>

      {/* DASHBOARD TAB NAVIGATION BAR (Apple Segmented Style) */}
      <div className="flex overflow-x-auto gap-2 p-1.5 rounded-2xl bg-desertSand/25 dark:bg-darkSurface border border-tan/35 text-xs font-bold text-coffeeBean/70 dark:text-almondCream/70">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 apple-press ${
            activeTab === "overview"
              ? "bg-toffeeBrown text-white shadow-md font-extrabold"
              : "hover:text-toffeeBrown dark:hover:text-white"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>{t.erp.tabs.overview}</span>
        </button>

        {(currentUser.role === "admin" ||
          currentUser.role === "super_admin" ||
          currentUser.role === "manager") && (
          <>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 apple-press ${
                activeTab === "analytics"
                  ? "bg-toffeeBrown text-white shadow-md font-extrabold"
                  : "hover:text-toffeeBrown dark:hover:text-white"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>{t.erp.tabs.analytics} (P&L / ROI)</span>
            </button>

            <button
              onClick={() => setActiveTab("rented_items")}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 apple-press ${
                activeTab === "rented_items"
                  ? "bg-toffeeBrown text-white shadow-md font-extrabold"
                  : "hover:text-toffeeBrown dark:hover:text-white"
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>{t.erp.tabs.rentedItems} ({activeRentedItems.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("inventory")}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 apple-press ${
                activeTab === "inventory"
                  ? "bg-toffeeBrown text-white shadow-md font-extrabold"
                  : "hover:text-toffeeBrown dark:hover:text-white"
              }`}
            >
              <Package className="w-4 h-4" />
              <span>{t.erp.tabs.inventory} ({totalFurnitureTypes})</span>
            </button>

            <button
              onClick={() => setActiveTab("users_manager")}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 apple-press ${
                activeTab === "users_manager"
                  ? "bg-toffeeBrown text-white shadow-md font-extrabold"
                  : "hover:text-toffeeBrown dark:hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{t.erp.tabs.users} ({allUsers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("requests")}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 apple-press ${
                activeTab === "requests"
                  ? "bg-toffeeBrown text-white shadow-md font-extrabold"
                  : "hover:text-toffeeBrown dark:hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{t.erp.tabs.requests} ({rentalRequests.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("messages")}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 apple-press ${
                activeTab === "messages"
                  ? "bg-toffeeBrown text-white shadow-md font-extrabold"
                  : "hover:text-toffeeBrown dark:hover:text-white"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Messages & Retours ({messages.length})</span>
              {messages.some((m) => m.status === "unread") && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("cms")}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 apple-press ${
                activeTab === "cms"
                  ? "bg-toffeeBrown text-white shadow-md font-extrabold"
                  : "hover:text-toffeeBrown dark:hover:text-white"
              }`}
            >
              <Edit className="w-4 h-4" />
              <span>{t.erp.tabs.cms}</span>
            </button>
          </>
        )}

        {currentUser.role === "professional" && (
          <>
            <button
              onClick={() => setActiveTab("calculator")}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 apple-press ${
                activeTab === "calculator"
                  ? "bg-toffeeBrown text-white shadow-md font-extrabold"
                  : "hover:text-toffeeBrown dark:hover:text-white"
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>{t.erp.tabs.calculator}</span>
            </button>

            <button
              onClick={() => setActiveTab("quotations")}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 apple-press ${
                activeTab === "quotations"
                  ? "bg-toffeeBrown text-white shadow-md font-extrabold"
                  : "hover:text-toffeeBrown dark:hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{t.erp.tabs.quotations}</span>
            </button>
          </>
        )}
      </div>

      {/* TAB 1: OVERVIEW METRICS */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-neutral-200 dark:border-zinc-800 shadow-xl space-y-2">
              <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider block">
                Total Inventory Owned
              </span>
              <div className="text-3xl font-black text-neutral-900 dark:text-white font-serif">
                {totalUnitsOwned} Units
              </div>
              <span className="text-[11px] text-emerald-500 font-bold block">
                Across {totalFurnitureTypes} models
              </span>
            </div>

            <div className="p-6 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-neutral-200 dark:border-zinc-800 shadow-xl space-y-2">
              <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider block">
                Available Stock Today
              </span>
              <div className="text-3xl font-black text-emerald-500 font-serif">
                {availableUnitsToday} Units
              </div>
              <span className="text-[11px] text-neutral-400 block">
                {totalUnitsReserved} units reserved in requests
              </span>
            </div>

            <div className="p-6 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-neutral-200 dark:border-zinc-800 shadow-xl space-y-2">
              <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider block">
                Pending Approvals
              </span>
              <div className="text-3xl font-black text-amber-500 font-serif">
                {pendingUserApprovals.length} Accounts
              </div>
              <span className="text-[11px] text-neutral-400 block">
                Awaiting VAT verification
              </span>
            </div>

            <div className="p-6 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-neutral-200 dark:border-zinc-800 shadow-xl space-y-2">
              <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider block">
                Active Dispatches
              </span>
              <div className="text-3xl font-black text-luxury-500 font-serif">
                {activeRentedItems.length} Batches
              </div>
              <span className="text-[11px] text-neutral-400 block">
                Currently on venue
              </span>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-neutral-200 dark:border-zinc-800 shadow-xl space-y-4">
            <h3 className="text-xl font-bold font-serif text-neutral-900 dark:text-white">
              Recent Rental Request Pipeline
            </h3>

            <div className="divide-y divide-neutral-100 dark:divide-zinc-800">
              {rentalRequests.map((req) => (
                <div key={req.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-bold text-neutral-900 dark:text-white">
                        {req.reference_code}
                      </strong>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-luxury-500/20 text-luxury-500">
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-zinc-400 mt-1">
                      Client: {req.customer_name} ({req.company_name || "Private Host"}) • Dates: {formatDate(req.start_date)} to {formatDate(req.end_date)} ({req.total_days} days)
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setPreviewRequest(req)}
                      className="px-3.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-zinc-800 text-neutral-900 dark:text-white text-xs font-bold flex items-center gap-1.5 hover:bg-luxury-500 hover:text-neutral-950 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                    <button
                      onClick={() => downloadQuotationPDF(req)}
                      className="px-3.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-zinc-800 text-neutral-900 dark:text-white text-xs font-bold flex items-center gap-1.5 hover:bg-luxury-500 hover:text-neutral-950 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE RENTED ITEMS & MAINTENANCE INSPECTION */}
      {activeTab === "rented_items" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold font-serif text-neutral-900 dark:text-white">
                Active Rented Items & Maintenance Inspection
              </h2>
              <p className="text-xs text-neutral-500 dark:text-zinc-400 mt-1">
                Set item condition inspection states, flag broken units, and return items to active stock persistently.
              </p>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-neutral-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-100 dark:bg-zinc-800 text-neutral-500 dark:text-zinc-400 font-bold uppercase tracking-wider border-b border-neutral-200 dark:border-zinc-700">
                    <th className="p-4">Rented Item</th>
                    <th className="p-4">Client / Agency</th>
                    <th className="p-4">Quantity</th>
                    <th className="p-4">Rental Window</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Maintenance Condition</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-zinc-800">
                  {activeRentedItems.map((item) => {
                    const condBadge = getConditionBadge(item.condition);
                    return (
                      <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="p-4 font-bold text-neutral-900 dark:text-white">
                          {item.title}
                        </td>
                        <td className="p-4 text-neutral-600 dark:text-zinc-300 font-medium">
                          <div>{item.customer_name}</div>
                          <div className="text-[10px] text-neutral-400">{item.company_name}</div>
                        </td>
                        <td className="p-4 font-bold text-neutral-900 dark:text-white">{item.quantity} Units</td>
                        <td className="p-4 text-neutral-600 dark:text-zinc-300">
                          {formatDate(item.start_date)} → {formatDate(item.end_date)}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              item.status === "returned"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : item.status === "inspection"
                                ? "bg-rose-500/20 text-rose-400 animate-pulse"
                                : "bg-luxury-500/10 text-luxury-500"
                            }`}
                          >
                            {item.status.replace("_", " ")}
                          </span>
                        </td>

                        {/* MAINTENANCE CONDITION COLUMN */}
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] border ${condBadge.bg}`}>
                              {condBadge.label}
                            </span>
                            <select
                              value={item.condition}
                              onChange={(e) =>
                                updateRentedItemCondition(item.id, e.target.value as ItemCondition)
                              }
                              className="py-1 px-2 rounded-lg bg-neutral-100 dark:bg-zinc-800 text-[10px] font-bold border border-neutral-200 dark:border-zinc-700"
                            >
                              <option value="perfect">Perfect</option>
                              <option value="good">Good</option>
                              <option value="bad">Bad Condition</option>
                              <option value="broken">Broken / Defective</option>
                            </select>
                          </div>
                        </td>

                        <td className="p-4 text-right space-x-2">
                          {item.status !== "returned" ? (
                            <button
                              onClick={() => returnRentedItem(item.id)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500 text-neutral-950 text-[10px] font-extrabold flex items-center gap-1 inline-flex hover:bg-emerald-400"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Return to Stock</span>
                            </button>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-400 flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              Returned & Stock Restored
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USER & CLIENT ACCOUNT MANAGER */}
      {activeTab === "users_manager" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold font-serif text-neutral-900 dark:text-white">
                Client & User Account Manager
              </h2>
              <p className="text-xs text-neutral-500 dark:text-zinc-400 mt-1">
                Manage all registered client profiles, view VAT numbers, adjust roles, and approve or suspend user access.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search user by name or email..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-2xl bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-luxury-500"
                />
              </div>

              <select
                value={selectedUserRoleFilter}
                onChange={(e) => setSelectedUserRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-2xl bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-xs font-semibold"
              >
                <option value="all">All Roles ({allUsers.length})</option>
                <option value="professional">Professional</option>
                <option value="customer">Customer</option>
                <option value="manager">Manager</option>
                <option value="admin">Administrator</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-neutral-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-xs text-neutral-400">
                No user profiles match your filter criteria.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-zinc-800">
                {filteredUsers.map((usr) => {
                  const currentLevel: UserLevel = usr.level || "Argent";
                  const currentFlags: UserFlag[] = usr.flags || [];
                  const userBenefits: string[] = usr.benefits || [
                    "Remise -15% Mobilier",
                    "Régisseur Dédié",
                    "Paiement 30 jours",
                  ];
                  const draftNote = userNotesDrafts[usr.id] ?? (usr.admin_notes || "");
                  const isNoteSaved = userSavedFeedback[usr.id];

                  const availableLevels: UserLevel[] = [
                    "Royal Elite",
                    "Diamant",
                    "Platine",
                    "Or",
                    "Argent",
                    "Bronze",
                  ];

                  const availableFlags: { name: UserFlag; color: string }[] = [
                    { name: "VIP", color: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40" },
                    { name: "Grand Compte", color: "bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/40" },
                    { name: "Paiement Fiable", color: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/40" },
                    { name: "À Surveiller", color: "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/40" },
                    { name: "Nouveau Partenaire", color: "bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/40" },
                    { name: "Litige Résolu", color: "bg-zinc-500/15 text-zinc-800 dark:text-zinc-300 border-zinc-500/40" },
                  ];

                  return (
                    <div key={usr.id} className="py-6 space-y-4">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-desertSand/40 dark:bg-darkSurface border border-tan/30 flex items-center justify-center font-bold text-coffeeBean dark:text-white text-lg font-serif">
                            {usr.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <strong className="text-base font-bold text-coffeeBean dark:text-white font-serif">
                                {usr.full_name}
                              </strong>
                              <span className="text-xs text-coffeeBean/70 dark:text-almondCream/70">
                                ({usr.email})
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-desertSand/40 dark:bg-darkSurface border border-tan/30 text-coffeeBean dark:text-almondCream">
                                {usr.country === "TN" ? "🇹🇳 Tunisie" : "🇫🇷 France"}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                  usr.status === "approved"
                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                                    : usr.status === "pending"
                                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse"
                                    : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30"
                                }`}
                              >
                                {usr.status}
                              </span>
                            </div>

                            <p className="text-xs text-coffeeBean/70 dark:text-almondCream/70 mt-1">
                              Rôle: <strong className="uppercase">{usr.role}</strong> • Entreprise: {usr.company_name || "Client Privé"} • TVA: {usr.vat_number || "N/A"} • Tél: {usr.phone_number || "N/A"}
                            </p>
                          </div>
                        </div>

                        {/* Account Approval/Suspension Buttons */}
                        <div className="flex items-center gap-2 self-start md:self-auto">
                          {usr.status !== "approved" && (
                            <button
                              onClick={() => updateUserStatus(usr.id, "approved")}
                              className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors shadow-sm"
                            >
                              Approuver Compte
                            </button>
                          )}
                          {usr.status !== "suspended" && (
                            <button
                              onClick={() => updateUserStatus(usr.id, "suspended")}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-400 text-xs font-bold hover:bg-rose-500/25 border border-rose-500/30 transition-colors"
                            >
                              Suspendre
                            </button>
                          )}
                        </div>
                      </div>

                      {/* LEVEL, FLAGS, BENEFITS & NOTES GRID */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
                        {/* 1. LEVEL / TIER & REWARDS */}
                        <div className="p-4 rounded-2xl bg-desertSand/20 dark:bg-darkSurface border border-tan/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-coffeeBean/70 dark:text-tan flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5 text-toffeeBrown" /> Niveau & Récompenses
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-toffeeBrown text-white">
                              {usr.reward_points || 240} pts
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] text-coffeeBean/60 dark:text-almondCream/60 font-semibold block">
                              Changer le Rang VIP :
                            </label>
                            <select
                              value={currentLevel}
                              onChange={(e) => updateUserLevel(usr.id, e.target.value as UserLevel)}
                              className="w-full py-2 px-3 rounded-xl bg-white dark:bg-zinc-800 border border-tan/40 text-xs font-bold text-coffeeBean dark:text-white"
                            >
                              {availableLevels.map((lvl) => (
                                <option key={lvl} value={lvl}>
                                  Rang {lvl} {lvl === "Royal Elite" ? "👑" : lvl === "Diamant" ? "💎" : "⭐"}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] text-coffeeBean/60 dark:text-almondCream/60 font-semibold block">
                              Avantages Actifs :
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {userBenefits.map((b, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-tan/25 text-coffeeBean dark:text-tan border border-tan/40"
                                >
                                  {b}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* 2. USER FLAGS & TAGS */}
                        <div className="p-4 rounded-2xl bg-desertSand/20 dark:bg-darkSurface border border-tan/30 space-y-3">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-coffeeBean/70 dark:text-tan flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-toffeeBrown" /> Badges & Flags Profil
                          </span>
                          <p className="text-[10px] text-coffeeBean/60 dark:text-almondCream/60">
                            Cliquez sur un badge pour l'assigner ou le retirer instantanément.
                          </p>

                          <div className="flex flex-wrap gap-2 pt-1">
                            {availableFlags.map((flg) => {
                              const isActive = currentFlags.includes(flg.name);
                              return (
                                <button
                                  key={flg.name}
                                  type="button"
                                  onClick={() => {
                                    const nextFlags = isActive
                                      ? currentFlags.filter((f) => f !== flg.name)
                                      : [...currentFlags, flg.name];
                                    updateUserFlags(usr.id, nextFlags);
                                  }}
                                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1.5 ${
                                    isActive
                                      ? `${flg.color} ring-2 ring-toffeeBrown/50 font-black shadow-sm`
                                      : "bg-white/60 dark:bg-zinc-800/60 text-coffeeBean/50 dark:text-zinc-400 border-dashed border-tan/30 hover:border-tan"
                                  }`}
                                >
                                  {isActive ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3 opacity-60" />}
                                  <span>{flg.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 3. INTERNAL ADMIN NOTES */}
                        <div className="p-4 rounded-2xl bg-desertSand/20 dark:bg-darkSurface border border-tan/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-coffeeBean/70 dark:text-tan flex items-center gap-1.5">
                              <Bookmark className="w-3.5 h-3.5 text-toffeeBrown" /> Note Confidentielle Admin
                            </span>
                            {isNoteSaved && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Enregistrée
                              </span>
                            )}
                          </div>

                          <textarea
                            rows={3}
                            placeholder="Ex: Client prioritaire pour les défilés. Négociation tarifs pour 2027..."
                            value={draftNote}
                            onChange={(e) =>
                              setUserNotesDrafts({ ...userNotesDrafts, [usr.id]: e.target.value })
                            }
                            className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-tan/40 text-xs text-coffeeBean dark:text-white placeholder:text-coffeeBean/40 focus:outline-none focus:ring-2 focus:ring-toffeeBrown resize-none"
                          />

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                updateUserNotes(usr.id, draftNote);
                                setUserSavedFeedback({ ...userSavedFeedback, [usr.id]: true });
                                setTimeout(() => {
                                  setUserSavedFeedback((prev) => ({ ...prev, [usr.id]: false }));
                                }, 3000);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-coffeeBean hover:bg-toffeeBrown text-white text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-sm"
                            >
                              <span>Enregistrer Note</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: INVENTORY STOCK MANAGEMENT & FILE UPLOAD */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold font-serif text-neutral-900 dark:text-white">
              Furniture Catalog & Stock Management
            </h2>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2.5 rounded-full bg-luxury-500 text-neutral-950 font-extrabold text-xs uppercase tracking-wider hover:bg-luxury-400 transition-colors flex items-center gap-2 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Furniture Piece</span>
            </button>
          </div>

          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-neutral-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-100 dark:bg-zinc-800 text-neutral-500 dark:text-zinc-400 font-bold uppercase tracking-wider border-b border-neutral-200 dark:border-zinc-700">
                    <th className="p-4">Item Details</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Owned Stock</th>
                    <th className="p-4">Custom Add Stock</th>
                    <th className="p-4">Retail Rate</th>
                    <th className="p-4">Pro Rate</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-zinc-800">
                  {furniture.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="p-4 font-bold text-neutral-900 dark:text-white flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-neutral-800 flex-shrink-0">
                          <Image src={item.images[0]} alt="" fill className="object-cover" />
                        </div>
                        <div>
                          <div>{item.title}</div>
                          <div className="text-[10px] text-neutral-400 font-normal line-clamp-1">
                            {item.material} • ({item.images.length} photos)
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-neutral-600 dark:text-zinc-300 font-medium">{item.category_name}</td>
                      <td className="p-4 font-bold text-neutral-900 dark:text-white text-sm">{item.quantity_owned} Units</td>

                      {/* CUSTOM STOCK QUANTITY INPUT */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            placeholder="+Qty"
                            value={customStockInputs[item.id] || ""}
                            onChange={(e) =>
                              setCustomStockInputs({
                                ...customStockInputs,
                                [item.id]: Number(e.target.value),
                              })
                            }
                            className="w-16 p-1.5 rounded-lg bg-neutral-100 dark:bg-zinc-800 text-xs font-bold border border-neutral-200 dark:border-zinc-700 text-center"
                          />
                          <button
                            onClick={() => {
                              const qty = customStockInputs[item.id] || 0;
                              if (qty !== 0) {
                                adjustFurnitureStock(item.id, qty);
                                setCustomStockInputs({ ...customStockInputs, [item.id]: 0 });
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-luxury-500 text-neutral-950 font-bold text-[10px]"
                          >
                            Apply
                          </button>
                        </div>
                      </td>

                      <td className="p-4 font-semibold text-neutral-700 dark:text-zinc-300">{formatCurrency(item.rental_price)}</td>
                      <td className="p-4 font-bold text-luxury-500">{formatCurrency(item.professional_price)}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            item.status === "active"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-rose-500/10 text-rose-500"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* EDIT ITEM BUTTON */}
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-zinc-800 text-neutral-800 dark:text-white text-[10px] font-bold flex items-center gap-1 inline-flex hover:bg-luxury-500 hover:text-neutral-950 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit Item</span>
                        </button>
                        <button
                          onClick={() => deleteFurnitureItem(item.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: RENTAL REQUESTS & STATUS REPROGRAMMING */}
      {activeTab === "requests" && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold font-serif text-neutral-900 dark:text-white">
            Rental Quotations & Status Pipeline
          </h2>

          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-neutral-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="divide-y divide-neutral-100 dark:divide-zinc-800">
              {rentalRequests.map((req) => (
                <div key={req.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-bold text-neutral-900 dark:text-white">
                        {req.reference_code}
                      </strong>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          req.status === "validated"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : req.status === "rejected"
                            ? "bg-rose-500/20 text-rose-400"
                            : req.status === "reprogramed"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {req.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-zinc-400 mt-1">
                      Client: {req.customer_name} ({req.company_name || "Private Host"}) • Email: {req.customer_email} • Dates: {formatDate(req.start_date)} → {formatDate(req.end_date)} ({req.total_days} days)
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setPreviewRequest(req)}
                      className="px-3.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-zinc-800 text-neutral-900 dark:text-white text-xs font-bold flex items-center gap-1.5 hover:bg-luxury-500 hover:text-neutral-950 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>

                    <button
                      onClick={() => updateRequestStatus(req.id, "validated")}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 text-neutral-950 text-xs font-bold hover:bg-emerald-400"
                    >
                      Validate
                    </button>
                    <button
                      onClick={() => updateRequestStatus(req.id, "under_review")}
                      className="px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-400 text-xs font-bold hover:bg-blue-500/30"
                    >
                      Under Review
                    </button>
                    <button
                      onClick={() => {
                        setReprogramRequest(req);
                        setReprogramStart(req.start_date);
                        setReprogramEnd(req.end_date);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500/30 flex items-center gap-1"
                    >
                      <Calendar className="w-3 h-3" />
                      <span>Reprogram</span>
                    </button>
                    <button
                      onClick={() => updateRequestStatus(req.id, "rejected")}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-400 text-xs font-bold hover:bg-rose-500/30"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => downloadQuotationPDF(req)}
                      className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-zinc-800 text-neutral-900 dark:text-white text-xs font-bold flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: UPGRADED COMPREHENSIVE PROFITS & ERP INTELLIGENCE DASHBOARD */}
      {activeTab === "analytics" && (
        <div className="space-y-10 text-coffeeBean dark:text-almondCream">
          {/* Top ERP Header & Export Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-tan/30">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-toffeeBrown dark:text-tan">
                {t.erp.badge}
              </span>
              <h2 className="text-3xl font-extrabold font-serif text-coffeeBean dark:text-white mt-0.5">
                {t.erp.title}
              </h2>
              <p className="text-xs text-coffeeBean/70 dark:text-almondCream/70 mt-1 max-w-2xl">
                {t.erp.subtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Currency Segmented Filter Toggle */}
              <div className="flex items-center p-1 rounded-2xl bg-desertSand/30 dark:bg-darkSurface border border-tan/30">
                <button
                  type="button"
                  onClick={() => setCurrencyFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currencyFilter === "all"
                      ? "bg-toffeeBrown text-white shadow-sm"
                      : "text-coffeeBean dark:text-almondCream hover:text-toffeeBrown"
                  }`}
                >
                  🌐 Consolidé
                </button>
                <button
                  type="button"
                  onClick={() => setCurrencyFilter("EUR")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currencyFilter === "EUR"
                      ? "bg-toffeeBrown text-white shadow-sm"
                      : "text-coffeeBean dark:text-almondCream hover:text-toffeeBrown"
                  }`}
                >
                  🇫🇷 France (€)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrencyFilter("TND")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currencyFilter === "TND"
                      ? "bg-toffeeBrown text-white shadow-sm"
                      : "text-coffeeBean dark:text-almondCream hover:text-toffeeBrown"
                  }`}
                >
                  🇹🇳 Tunisie (DT)
                </button>
              </div>

              {/* Period Selector Toggle */}
              <div className="flex items-center p-1 rounded-2xl bg-desertSand/30 dark:bg-darkSurface border border-tan/30">
                <button
                  type="button"
                  onClick={() => setErpPeriod("monthly")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    erpPeriod === "monthly"
                      ? "bg-toffeeBrown text-white shadow-sm"
                      : "text-coffeeBean dark:text-almondCream hover:text-toffeeBrown"
                  }`}
                >
                  Mensuel 2026
                </button>
                <button
                  type="button"
                  onClick={() => setErpPeriod("quarterly")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    erpPeriod === "quarterly"
                      ? "bg-toffeeBrown text-white shadow-sm"
                      : "text-coffeeBean dark:text-almondCream hover:text-toffeeBrown"
                  }`}
                >
                  Trimestriel (Q1-Q3)
                </button>
              </div>

              {/* CSV Export Button */}
              <button
                type="button"
                onClick={exportERPCsv}
                className="px-4 py-2 rounded-2xl bg-coffeeBean hover:bg-toffeeBrown text-almondCream text-xs font-bold transition-all shadow-md flex items-center gap-2 apple-press border border-tan/30"
              >
                <FileSpreadsheet className="w-4 h-4 text-tan" />
                <span>{t.erp.exportReport}</span>
              </button>
            </div>
          </div>

          {/* DYNAMIC CURRENCY METRICS COMPUTATION */}
          {(() => {
            const pnlData = {
              all: {
                gross: "€148,250.00",
                grossSecondary: "489,225 DT (Consolidé FR + TN)",
                costs: "€38,400.00",
                costsSecondary: "126,720 DT (Consolidé FR + TN)",
                profit: "€109,850.00",
                profitSecondary: "362,505 DT (Bénéfice net combiné)",
                margin: "74.1%",
                badge: "Consolidé International (France 🇫🇷 + Tunisie 🇹🇳)",
                costsList: [
                  { title: t.erp.pnl.logistics, amount: "€14,800.00", sec: "48,840 DT", share: "38.5%", color: "bg-toffeeBrown" },
                  { title: t.erp.pnl.maintenance, amount: "€8,200.00", sec: "27,060 DT", share: "21.3%", color: "bg-tan" },
                  { title: t.erp.pnl.staging, amount: "€7,200.00", sec: "23,760 DT", share: "18.8%", color: "bg-fadedCopper" },
                  { title: t.erp.pnl.warehousing, amount: "€6,400.00", sec: "21,120 DT", share: "16.7%", color: "bg-coffeeBean" },
                  { title: t.erp.pnl.insurance, amount: "€1,800.00", sec: "5,940 DT", share: "4.7%", color: "bg-emerald-600" },
                ],
              },
              EUR: {
                gross: "€104,200.00",
                grossSecondary: "Chiffre d'affaires France uniquement",
                costs: "€26,900.00",
                costsSecondary: "Hub logistique Paris & Côte d'Azur",
                profit: "€77,300.00",
                profitSecondary: "Bénéfice opérationnel net France",
                margin: "74.2%",
                badge: "France 🇫🇷 (Données en Euros €)",
                costsList: [
                  { title: t.erp.pnl.logistics, amount: "€10,400.00", sec: "Flotte camions Paris", share: "38.6%", color: "bg-toffeeBrown" },
                  { title: t.erp.pnl.maintenance, amount: "€5,800.00", sec: "Ateliers restauration FR", share: "21.5%", color: "bg-tan" },
                  { title: t.erp.pnl.staging, amount: "€5,100.00", sec: "Équipes régie scénographique", share: "19.0%", color: "bg-fadedCopper" },
                  { title: t.erp.pnl.warehousing, amount: "€4,400.00", sec: "Entrepôt Saint-Denis", share: "16.3%", color: "bg-coffeeBean" },
                  { title: t.erp.pnl.insurance, amount: "€1,200.00", sec: "Couverture casse matériel", share: "4.6%", color: "bg-emerald-600" },
                ],
              },
              TND: {
                gross: "145,365.00 DT",
                grossSecondary: "Chiffre d'affaires Tunisie uniquement",
                costs: "37,950.00 DT",
                costsSecondary: "Dépôts Tunis, Hammamet & Sousse",
                profit: "107,415.00 DT",
                profitSecondary: "Bénéfice opérationnel net Tunisie",
                margin: "73.9%",
                badge: "Tunisie 🇹🇳 (Données en Dinars Tunisiens DT)",
                costsList: [
                  { title: t.erp.pnl.logistics, amount: "14,520 DT", sec: "Transport & livraison Grand Tunis", share: "38.3%", color: "bg-toffeeBrown" },
                  { title: t.erp.pnl.maintenance, amount: "8,100 DT", sec: "Entretien cuir & boiseries", share: "21.3%", color: "bg-tan" },
                  { title: t.erp.pnl.staging, amount: "7,050 DT", sec: "Mise en place réceptions", share: "18.6%", color: "bg-fadedCopper" },
                  { title: t.erp.pnl.warehousing, amount: "6,280 DT", sec: "Hub La Marsa & Gammarth", share: "16.5%", color: "bg-coffeeBean" },
                  { title: t.erp.pnl.insurance, amount: "2,000 DT", sec: "Assurance transport TN", share: "5.3%", color: "bg-emerald-600" },
                ],
              },
            }[currencyFilter];

            return (
              <>
                {/* 1. REAL-TIME P&L SUMMARY METRICS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="p-6 rounded-3xl apple-card space-y-2 border border-tan/40">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-coffeeBean/60 dark:text-tan uppercase tracking-wider block">
                        {t.erp.pnl.grossRevenue}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-tan/25 text-toffeeBrown dark:text-tan">
                        {currencyFilter === "all" ? "EUR + TND" : currencyFilter === "EUR" ? "€ EUR" : "DT TND"}
                      </span>
                    </div>
                    <div className="text-3xl font-black text-coffeeBean dark:text-white font-serif">
                      {pnlData.gross}
                    </div>
                    <span className="text-[11px] text-coffeeBean/70 dark:text-almondCream/60 font-medium block">
                      {pnlData.grossSecondary}
                    </span>
                  </div>

                  <div className="p-6 rounded-3xl apple-card space-y-2 border border-tan/40">
                    <span className="text-[11px] font-bold text-coffeeBean/60 dark:text-tan uppercase tracking-wider block">
                      {t.erp.pnl.totalCosts}
                    </span>
                    <div className="text-3xl font-black text-amber-700 dark:text-amber-400 font-serif">
                      {pnlData.costs}
                    </div>
                    <span className="text-[11px] text-coffeeBean/70 dark:text-almondCream/60 font-medium block">
                      {pnlData.costsSecondary}
                    </span>
                  </div>

                  <div className="p-6 rounded-3xl apple-card space-y-2 border border-tan/40 bg-gradient-to-br from-almondCream/50 to-desertSand/30 dark:from-darkSurface dark:to-darkBg">
                    <span className="text-[11px] font-bold text-toffeeBrown dark:text-tan uppercase tracking-wider block">
                      {t.erp.pnl.netProfit}
                    </span>
                    <div className="text-3xl font-black text-toffeeBrown dark:text-tan font-serif">
                      {pnlData.profit}
                    </div>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold block">
                      {pnlData.profitSecondary}
                    </span>
                  </div>

                  <div className="p-6 rounded-3xl apple-card space-y-2 border border-tan/40">
                    <span className="text-[11px] font-bold text-coffeeBean/60 dark:text-tan uppercase tracking-wider block">
                      {t.erp.pnl.operatingMargin}
                    </span>
                    <div className="text-3xl font-black text-emerald-700 dark:text-emerald-400 font-serif">
                      {pnlData.margin}
                    </div>
                    <span className="text-[11px] text-coffeeBean/70 dark:text-almondCream/60 font-medium block">
                      {pnlData.badge}
                    </span>
                  </div>
                </div>

                {/* 2. DIRECT OPERATING COSTS BREAKDOWN & MARGIN ALLOCATION */}
                <div className="apple-card p-6 sm:p-8 rounded-3xl border border-tan/40 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xl font-bold font-serif text-coffeeBean dark:text-white">
                        {t.erp.pnl.costBreakdown}
                      </h3>
                      <p className="text-xs text-coffeeBean/70 dark:text-almondCream/70 mt-0.5">
                        Ventilation des charges directes affectées aux sorties de mobilier ({pnlData.badge}).
                      </p>
                    </div>
                    <span className="text-xs font-extrabold text-toffeeBrown dark:text-tan bg-tan/20 px-3 py-1 rounded-full border border-tan/30">
                      Total Charges : {pnlData.costs}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {pnlData.costsList.map((item, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-desertSand/20 dark:bg-darkSurface border border-tan/30 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-coffeeBean dark:text-almondCream">
                          <span className="truncate">{item.title}</span>
                          <span className="text-toffeeBrown dark:text-tan">{item.share}</span>
                        </div>
                        <div className="text-base font-black font-serif text-coffeeBean dark:text-white">
                          {item.amount}
                        </div>
                        <div className="text-[10px] text-coffeeBean/60 dark:text-almondCream/60 truncate">
                          {item.sec}
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-tan/25 overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full`} style={{ width: item.share }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}

          {/* 3. MONTHLY VS QUARTERLY REVENUE & PROFIT INTERACTIVE BAR CHART */}
          <div className="apple-card p-6 sm:p-8 rounded-3xl border border-tan/40 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold font-serif text-coffeeBean dark:text-white">
                  Évolution Comparée : Chiffre d'Affaires Brut vs Bénéfice Net (2026)
                </h3>
                <p className="text-xs text-coffeeBean/70 dark:text-almondCream/70 mt-0.5">
                  Visualisation mensuelle de l'encaissement et de la marge nette générée par le parc événementiel.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-tan"></span>
                  <span className="text-coffeeBean dark:text-almondCream">CA Brut (€)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-toffeeBrown"></span>
                  <span className="text-coffeeBean dark:text-almondCream">Bénéfice Net (€)</span>
                </div>
              </div>
            </div>

            <div className="h-68 flex items-end justify-between gap-3 sm:gap-6 pt-8 px-2 sm:px-6 border-b border-tan/30 pb-4">
              {[
                { month: "Jan", revenue: 32000, profit: 23600, heightRev: "45%", heightProf: "33%" },
                { month: "Fév", revenue: 38000, profit: 28100, heightRev: "55%", heightProf: "40%" },
                { month: "Mar", revenue: 41000, profit: 30400, heightRev: "60%", heightProf: "44%" },
                { month: "Avr", revenue: 45000, profit: 33300, heightRev: "66%", heightProf: "49%" },
                { month: "Mai", revenue: 52000, profit: 38600, heightRev: "76%", heightProf: "56%" },
                { month: "Juin", revenue: 61000, profit: 45200, heightRev: "89%", heightProf: "66%" },
                { month: "Juil", revenue: 68000, profit: 50400, heightRev: "100%", heightProf: "74%" },
                { month: "Août", revenue: 48500, profit: 35900, heightRev: "71%", heightProf: "52%" },
              ].map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <div className="text-[10px] font-bold text-toffeeBrown opacity-0 group-hover:opacity-100 transition-opacity">
                    €{(bar.profit / 1000).toFixed(1)}k
                  </div>
                  <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full">
                    {/* Revenue Bar */}
                    <div
                      style={{ height: bar.heightRev }}
                      className="w-full max-w-[22px] rounded-t-xl bg-tan group-hover:bg-tan/80 transition-all shadow-sm"
                      title={`CA : €${bar.revenue}`}
                    />
                    {/* Profit Bar */}
                    <div
                      style={{ height: bar.heightProf }}
                      className="w-full max-w-[22px] rounded-t-xl bg-gradient-to-t from-coffeeBean to-toffeeBrown group-hover:from-toffeeBrown group-hover:to-tan transition-all shadow-md"
                      title={`Bénéfice Net : €${bar.profit}`}
                    />
                  </div>
                  <span className="text-xs font-bold text-coffeeBean dark:text-tan">{bar.month}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 4. ASSET ROI & UNIT ECONOMICS LEDGER TABLE */}
          <div className="apple-card p-6 sm:p-8 rounded-3xl border border-tan/40 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold font-serif text-coffeeBean dark:text-white">
                  {t.erp.roi.title}
                </h3>
                <p className="text-xs text-coffeeBean/70 dark:text-almondCream/70 mt-0.5">
                  {t.erp.roi.subtitle}
                </p>
              </div>

              {/* Search & Category Filter for ROI Table */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-coffeeBean/60 dark:text-almondCream/60" />
                  <input
                    type="text"
                    placeholder="Filtrer une pièce..."
                    value={roiSearchQuery}
                    onChange={(e) => setRoiSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-2 rounded-xl bg-desertSand/20 dark:bg-darkSurface border border-tan/40 text-xs text-coffeeBean dark:text-white focus:outline-none focus:ring-2 focus:ring-toffeeBrown"
                  />
                </div>

                <select
                  value={roiCategoryFilter}
                  onChange={(e) => setRoiCategoryFilter(e.target.value)}
                  className="p-2 rounded-xl bg-desertSand/20 dark:bg-darkSurface border border-tan/40 text-xs font-semibold text-coffeeBean dark:text-white"
                >
                  <option value="all">Toutes les catégories</option>
                  <option value="Seating & Lounges">Seating & Lounges</option>
                  <option value="Tables & Dining">Tables & Dining</option>
                  <option value="Bars & Reception Consoles">Bars & Consoles</option>
                  <option value="Architectural Lighting">Lighting</option>
                  <option value="Outdoor Luxury">Outdoor</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-tan/30 text-coffeeBean/60 dark:text-tan font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3">{t.erp.roi.model}</th>
                    <th className="p-3">{t.erp.roi.category}</th>
                    <th className="p-3">{t.erp.roi.purchaseCost}</th>
                    <th className="p-3">{t.erp.roi.totalEarned}</th>
                    <th className="p-3">{t.erp.roi.trips}</th>
                    <th className="p-3">{t.erp.roi.condition}</th>
                    <th className="p-3">{t.erp.roi.payback}</th>
                    <th className="p-3 text-right">{t.erp.roi.roiPercent}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tan/20">
                  {filteredRoiItems.map((item) => (
                    <tr key={item.id} className="hover:bg-desertSand/15 dark:hover:bg-darkSurface/50 transition-colors">
                      <td className="p-3 flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-desertSand/30 flex-shrink-0 border border-tan/30">
                          <Image src={item.image} alt={item.model} fill className="object-cover" />
                        </div>
                        <span className="font-bold text-coffeeBean dark:text-white font-serif">{item.model}</span>
                      </td>
                      <td className="p-3 text-coffeeBean/70 dark:text-almondCream/70 font-medium">{item.category}</td>
                      <td className="p-3 font-semibold text-coffeeBean/80 dark:text-almondCream/80">€{item.purchaseCost.toLocaleString()}</td>
                      <td className="p-3 font-bold text-coffeeBean dark:text-white">€{item.totalEarned.toLocaleString()}</td>
                      <td className="p-3 font-semibold">{item.trips} sorties</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${getConditionBadge(item.condition).bg}`}>
                          {getConditionBadge(item.condition).label}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-coffeeBean/80 dark:text-almondCream/80">{item.paybackMonths} mois</td>
                      <td className="p-3 text-right">
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30">
                          +{item.roiPercent}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. BOOKING CASHFLOW PIPELINE & FLEET AUDIT */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pipeline Cashflow */}
            <div className="apple-card p-6 sm:p-8 rounded-3xl border border-tan/40 space-y-6">
              <div>
                <h3 className="text-xl font-bold font-serif text-coffeeBean dark:text-white">
                  {t.erp.pipeline.title}
                </h3>
                <p className="text-xs text-coffeeBean/70 dark:text-almondCream/70 mt-0.5">
                  Volume financier des devis en cours d'arbitrage scénographique et confirmés.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { label: t.erp.pipeline.pendingQuotes, count: "12 devis", value: "€24,600.00", pct: 25, color: "bg-amber-500" },
                  { label: t.erp.pipeline.underReview, count: "6 devis", value: "€18,900.00", pct: 19, color: "bg-blue-500" },
                  { label: t.erp.pipeline.validatedBookings, count: "22 réservations", value: "€68,400.00", pct: 69, color: "bg-emerald-600" },
                  { label: t.erp.pipeline.dispatchedOnSite, count: "14 événements", value: "€36,350.00", pct: 37, color: "bg-toffeeBrown" },
                ].map((row, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-desertSand/20 dark:bg-darkSurface border border-tan/25 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-coffeeBean dark:text-almondCream">
                      <span>{row.label} ({row.count})</span>
                      <span className="font-serif font-black">{row.value}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-tan/20 overflow-hidden">
                      <div className={`h-full ${row.color} rounded-full`} style={{ width: `${row.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-tan/25 grid grid-cols-2 gap-4 text-center">
                <div className="p-3 rounded-2xl bg-tan/15 border border-tan/30">
                  <div className="text-2xl font-bold font-serif text-toffeeBrown dark:text-tan">78.4%</div>
                  <div className="text-[10px] text-coffeeBean/70 dark:text-almondCream/70 uppercase font-semibold mt-0.5">
                    {t.erp.pipeline.conversionRate}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-tan/15 border border-tan/30">
                  <div className="text-2xl font-bold font-serif text-coffeeBean dark:text-white">€3,420</div>
                  <div className="text-[10px] text-coffeeBean/70 dark:text-almondCream/70 uppercase font-semibold mt-0.5">
                    {t.erp.pipeline.avgOrderValue}
                  </div>
                </div>
              </div>
            </div>

            {/* Fleet Health & Inspection */}
            <div className="apple-card p-6 sm:p-8 rounded-3xl border border-tan/40 space-y-6">
              <div>
                <h3 className="text-xl font-bold font-serif text-coffeeBean dark:text-white">
                  {t.erp.inspection.title}
                </h3>
                <p className="text-xs text-coffeeBean/70 dark:text-almondCream/70 mt-0.5">
                  État d'usure, contrôle qualité et immobilisation pour maintenance du parc mobilier (480 unités).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-300 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider block">
                    {t.erp.inspection.perfect}
                  </span>
                  <div className="text-3xl font-black font-serif">412</div>
                  <span className="text-[11px] font-medium block opacity-85">85.8% du parc total</span>
                </div>

                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-900 dark:text-blue-300 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider block">
                    {t.erp.inspection.good}
                  </span>
                  <div className="text-3xl font-black font-serif">52</div>
                  <span className="text-[11px] font-medium block opacity-85">10.8% du parc total</span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider block">
                    {t.erp.inspection.minorWear}
                  </span>
                  <div className="text-3xl font-black font-serif">12</div>
                  <span className="text-[11px] font-medium block opacity-85">2.5% en nettoyage vapeur</span>
                </div>

                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-300 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider block">
                    {t.erp.inspection.broken}
                  </span>
                  <div className="text-3xl font-black font-serif">4</div>
                  <span className="text-[11px] font-medium block opacity-85">0.9% en restauration atelier</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-desertSand/30 dark:bg-darkSurface border border-tan/30 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-coffeeBean dark:text-white">
                    Audit de conformité semestriel
                  </div>
                  <div className="text-[11px] text-coffeeBean/70 dark:text-almondCream/70">
                    Dernière vérification générale effectuée le 15 août 2026.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => alert(language === "ar" ? "تم تسجيل تقرير الفحص بنجاح!" : "Rapport d'inspection périodique validé !")}
                  className="px-4 py-2 rounded-xl bg-toffeeBrown hover:bg-coffeeBean text-white text-xs font-bold apple-press shadow-sm whitespace-nowrap"
                >
                  {t.erp.inspection.logAction}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: CLIENT MESSAGES, EXPERIENCES & FEEDBACK INBOX (ADMIN MANAGEMENT) */}
      {activeTab === "messages" && (
        <div className="space-y-6 text-coffeeBean dark:text-almondCream">
          {/* Header & Stats */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-tan/30">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-toffeeBrown dark:text-tan">
                Messagerie & Expérience Client
              </span>
              <h2 className="text-3xl font-extrabold font-serif text-coffeeBean dark:text-white mt-0.5">
                Retours d'Expérience & Avis Clients
              </h2>
              <p className="text-xs text-coffeeBean/70 dark:text-almondCream/70 mt-1 max-w-2xl">
                Consultez tous les avis, témoignages scénographiques et signalements reçus de vos partenaires en France et en Tunisie, et répondez-leur en direct.
              </p>
            </div>

            {/* Stats summary pills */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="px-3.5 py-1.5 rounded-xl bg-desertSand/30 dark:bg-darkSurface border border-tan/40 text-xs font-bold">
                Total: <strong className="text-coffeeBean dark:text-white font-serif">{messages.length}</strong>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Non lus: <strong>{messages.filter((m) => m.status === "unread").length}</strong>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-400 text-xs font-bold">
                Résolus: <strong>{messages.filter((m) => m.status === "resolved").length}</strong>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-desertSand/20 dark:bg-darkSurface border border-tan/30 text-xs">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-coffeeBean/60 dark:text-almondCream/60 font-semibold">Catégorie:</span>
              <select
                value={msgCategoryFilter}
                onChange={(e) => setMsgCategoryFilter(e.target.value)}
                className="py-1.5 px-3 rounded-xl bg-white dark:bg-zinc-800 border border-tan/40 text-xs font-bold text-coffeeBean dark:text-white"
              >
                <option value="all">Toutes les catégories</option>
                <option value="feedback">Avis & Retours</option>
                <option value="experience">Expérience Réception</option>
                <option value="issue">Signalement Problème</option>
                <option value="custom_quote">Devis Sur-Mesure</option>
              </select>
            </div>

            {/* Country Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-coffeeBean/60 dark:text-almondCream/60 font-semibold">Pays:</span>
              <select
                value={msgCountryFilter}
                onChange={(e) => setMsgCountryFilter(e.target.value)}
                className="py-1.5 px-3 rounded-xl bg-white dark:bg-zinc-800 border border-tan/40 text-xs font-bold text-coffeeBean dark:text-white"
              >
                <option value="all">Tous les pays</option>
                <option value="FR">🇫🇷 France</option>
                <option value="TN">🇹🇳 Tunisie</option>
              </select>
            </div>
          </div>

          {/* Messages List */}
          {(() => {
            const filteredMsgs = messages.filter((m) => {
              const matchesCat = msgCategoryFilter === "all" || m.category === msgCategoryFilter;
              const matchesCountry = msgCountryFilter === "all" || m.country === msgCountryFilter;
              return matchesCat && matchesCountry;
            });

            if (filteredMsgs.length === 0) {
              return (
                <div className="apple-card p-12 rounded-3xl border border-tan/40 text-center space-y-3">
                  <MessageSquare className="w-8 h-8 text-toffeeBrown/50 mx-auto" />
                  <p className="text-sm font-bold text-coffeeBean dark:text-white">
                    Aucun message ne correspond aux critères sélectionnés.
                  </p>
                  <p className="text-xs text-coffeeBean/60 dark:text-almondCream/60">
                    Les retours soumis par vos clients apparaîtront ici avec toutes leurs réponses associées.
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {filteredMsgs.map((msg) => {
                  const replyDraft = adminReplyTexts[msg.id] || "";

                  const getCategoryLabel = (cat: string) => {
                    switch (cat) {
                      case "feedback":
                        return { label: "Avis & Témoignage", bg: "bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30" };
                      case "experience":
                        return { label: "Expérience Événement", bg: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30" };
                      case "issue":
                        return { label: "Signalement", bg: "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30" };
                      case "custom_quote":
                        return { label: "Demande Sur-Mesure", bg: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30" };
                      default:
                        return { label: "Note Client", bg: "bg-tan/20 text-coffeeBean dark:text-tan border-tan/40" };
                    }
                  };

                  const catStyle = getCategoryLabel(msg.category);

                  return (
                    <div
                      key={msg.id}
                      className="apple-card p-6 rounded-3xl border border-tan/40 space-y-4 transition-all"
                    >
                      {/* Message Meta Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-tan/25">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-desertSand/40 dark:bg-darkSurface border border-tan/30 flex items-center justify-center font-bold text-coffeeBean dark:text-white font-serif">
                            {msg.user_name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <strong className="text-sm font-bold text-coffeeBean dark:text-white font-serif">
                                {msg.user_name}
                              </strong>
                              <span className="text-xs text-coffeeBean/70 dark:text-almondCream/70">
                                ({msg.user_email})
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-desertSand/30 dark:bg-darkSurface border border-tan/30">
                                {msg.country === "TN" ? "🇹🇳 Tunisie" : "🇫🇷 France"}
                              </span>
                            </div>
                            <span className="text-[10px] text-coffeeBean/60 dark:text-almondCream/60">
                              Reçu le {new Date(msg.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>

                        {/* Status Badges & Quick Status Selector */}
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${catStyle.bg}`}>
                            {catStyle.label}
                          </span>

                          <select
                            value={msg.status}
                            onChange={(e) =>
                              updateMessageStatus(msg.id, e.target.value as "unread" | "in_review" | "resolved")
                            }
                            className={`py-1 px-2.5 rounded-xl text-[10px] font-extrabold uppercase border ${
                              msg.status === "resolved"
                                ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border-emerald-500/30"
                                : msg.status === "in_review"
                                ? "bg-blue-500/15 text-blue-800 dark:text-blue-400 border-blue-500/30"
                                : "bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/30 animate-pulse"
                            }`}
                          >
                            <option value="unread">Non lu</option>
                            <option value="in_review">En cours d'arbitrage</option>
                            <option value="resolved">Résolu / Traité</option>
                          </select>
                        </div>
                      </div>

                      {/* Subject & Body */}
                      <div className="space-y-1.5">
                        <h4 className="text-base font-bold text-coffeeBean dark:text-white font-serif">
                          {msg.subject}
                        </h4>
                        <div className="p-4 rounded-2xl bg-desertSand/15 dark:bg-darkSurface/60 border border-tan/20 text-xs leading-relaxed text-coffeeBean/85 dark:text-almondCream/90 whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      </div>

                      {/* Replies Conversation Thread */}
                      {msg.replies && msg.replies.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-tan/20">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-coffeeBean/60 dark:text-tan block">
                            Historique des Échanges ({msg.replies.length})
                          </span>
                          <div className="space-y-2">
                            {msg.replies.map((reply) => {
                              const isAdmin = reply.sender_role === "admin" || reply.sender_role === "super_admin";
                              return (
                                <div
                                  key={reply.id}
                                  className={`p-3 rounded-2xl text-xs space-y-1 ${
                                    isAdmin
                                      ? "bg-toffeeBrown/10 border border-toffeeBrown/30 text-coffeeBean dark:text-white ml-4"
                                      : "bg-desertSand/25 dark:bg-darkSurface border border-tan/30 mr-4"
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-[10px] font-bold">
                                    <span className={isAdmin ? "text-toffeeBrown dark:text-tan" : "text-coffeeBean dark:text-almondCream"}>
                                      {isAdmin ? "🏛️ Concorde Administration" : `👤 ${reply.sender_name}`}
                                    </span>
                                    <span className="opacity-60">
                                      {new Date(reply.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  </div>
                                  <p className="text-xs leading-relaxed">{reply.content}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Admin Reply Action Box */}
                      <div className="pt-2 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                        <input
                          type="text"
                          placeholder="Rédiger une réponse officielle Concorde Events..."
                          value={replyDraft}
                          onChange={(e) =>
                            setAdminReplyTexts({ ...adminReplyTexts, [msg.id]: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && replyDraft.trim()) {
                              replyMessage(msg.id, replyDraft);
                              setAdminReplyTexts({ ...adminReplyTexts, [msg.id]: "" });
                            }
                          }}
                          className="flex-1 p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-tan/40 text-xs text-coffeeBean dark:text-white placeholder:text-coffeeBean/40 focus:outline-none focus:ring-2 focus:ring-toffeeBrown"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!replyDraft.trim()) return;
                            replyMessage(msg.id, replyDraft);
                            setAdminReplyTexts({ ...adminReplyTexts, [msg.id]: "" });
                          }}
                          className="px-4 py-2.5 rounded-xl bg-coffeeBean hover:bg-toffeeBrown text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap apple-press"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Répondre au Client</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 8: CMS HERO & CONTENT EDITOR */}
      {activeTab === "cms" && (
        <div className="apple-card p-6 sm:p-8 rounded-3xl border border-tan/40 space-y-6 text-coffeeBean dark:text-almondCream">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-toffeeBrown dark:text-tan">
              Gestion de Contenu
            </span>
            <h2 className="text-2xl font-bold font-serif text-coffeeBean dark:text-white mt-0.5">
              Éditeur de Vitrine & Textes Clés
            </h2>
            <p className="text-xs text-coffeeBean/70 dark:text-almondCream/70 mt-1">
              Modifiez en temps réel les titres majeurs, sous-titres et coordonnées d'assistance du site public.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateCMS({
                ...cms,
                hero: {
                  ...cms.hero,
                  title: cmsHeroTitle,
                  subtitle: cmsHeroSub,
                },
              });
              alert("Modifications de vitrine enregistrées avec succès !");
            }}
            className="space-y-4 text-xs font-semibold"
          >
            <div>
              <label className="block text-coffeeBean dark:text-tan mb-1">Titre Hero Principal</label>
              <input
                type="text"
                value={cmsHeroTitle}
                onChange={(e) => setCmsHeroTitle(e.target.value)}
                className="w-full p-3 rounded-xl bg-desertSand/20 dark:bg-zinc-800 border border-tan/40 text-xs font-bold text-coffeeBean dark:text-white"
              />
            </div>

            <div>
              <label className="block text-coffeeBean dark:text-tan mb-1">Sous-titre Scénographique</label>
              <textarea
                rows={3}
                value={cmsHeroSub}
                onChange={(e) => setCmsHeroSub(e.target.value)}
                className="w-full p-3 rounded-xl bg-desertSand/20 dark:bg-zinc-800 border border-tan/40 text-xs text-coffeeBean dark:text-white resize-none"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-3 rounded-full bg-toffeeBrown hover:bg-coffeeBean text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md apple-press"
            >
              Enregistrer & Publier Vitrine
            </button>
          </form>
        </div>
      )}

      {/* TAB 9: PROFESSIONAL CALCULATOR */}
      {activeTab === "calculator" && (
        <div className="apple-card p-6 sm:p-8 rounded-3xl border border-tan/40 space-y-6 text-coffeeBean dark:text-almondCream">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-toffeeBrown dark:text-tan">
              Tarification Partenaire
            </span>
            <h2 className="text-2xl font-bold font-serif text-coffeeBean dark:text-white mt-0.5">
              Simulateur & Calculateur Pro
            </h2>
            <p className="text-xs text-coffeeBean/70 dark:text-almondCream/70 mt-1">
              Estimez le coût direct de vos régies et réceptions avec vos tarifs préférentiels B2B.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">Pièce de Mobilier</label>
              <select
                value={calcSelectedId}
                onChange={(e) => setCalcSelectedId(e.target.value)}
                className="w-full p-3 rounded-xl bg-desertSand/20 dark:bg-zinc-800 border border-tan/40 text-xs font-bold text-coffeeBean dark:text-white"
              >
                {furniture.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title} ({formatPrice(f.rental_price, f.rental_price_tnd)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Nombre d'Unités</label>
              <input
                type="number"
                min={1}
                value={calcQty}
                onChange={(e) => setCalcQty(Math.max(1, Number(e.target.value)))}
                className="w-full p-3 rounded-xl bg-desertSand/20 dark:bg-zinc-800 border border-tan/40 text-xs font-bold text-coffeeBean dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Durée (Jours)</label>
              <input
                type="number"
                min={1}
                value={calcDays}
                onChange={(e) => setCalcDays(Math.max(1, Number(e.target.value)))}
                className="w-full p-3 rounded-xl bg-desertSand/20 dark:bg-zinc-800 border border-tan/40 text-xs font-bold text-coffeeBean dark:text-white"
              />
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-desertSand/25 dark:bg-darkSurface border border-tan/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-coffeeBean/70 dark:text-almondCream/70 block">
                Total Estimé Tarif Pro B2B ({calcQty} unités x {calcDays} jours) :
              </span>
              <div className="text-3xl font-black font-serif text-toffeeBrown dark:text-tan mt-1">
                {formatPrice(
                  (calcItem?.professional_price || 100) * calcQty * calcDays,
                  ((calcItem?.rental_price_tnd || 300) * 0.8) * calcQty * calcDays
                )}
              </div>
            </div>

            <Link
              href="/catalogue"
              className="px-6 py-3 rounded-full bg-coffeeBean hover:bg-toffeeBrown text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md text-center apple-press"
            >
              Créer un Devis Complet
            </Link>
          </div>
        </div>
      )}

      {/* TAB 10: PROFESSIONAL QUOTATIONS */}
      {activeTab === "quotations" && (
        <div className="apple-card p-6 sm:p-8 rounded-3xl border border-tan/40 space-y-6 text-coffeeBean dark:text-almondCream">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-toffeeBrown dark:text-tan">
              Suivi Réservations
            </span>
            <h2 className="text-2xl font-bold font-serif text-coffeeBean dark:text-white mt-0.5">
              Mes Devis & Réservations Confirmées
            </h2>
            <p className="text-xs text-coffeeBean/70 dark:text-almondCream/70 mt-1">
              Téléchargez vos bons de réservation et suivez la validation de vos demandes.
            </p>
          </div>

          <div className="divide-y divide-tan/20">
            {rentalRequests.map((req) => (
              <div key={req.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-bold text-coffeeBean dark:text-white">
                      {req.reference_code}
                    </strong>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-toffeeBrown/15 text-toffeeBrown dark:text-tan border border-toffeeBrown/30">
                      {req.status}
                    </span>
                  </div>
                  <p className="text-xs text-coffeeBean/70 dark:text-almondCream/70 mt-1">
                    Dates: {formatDate(req.start_date)} → {formatDate(req.end_date)} • {req.items.length} références
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold font-serif text-coffeeBean dark:text-white">
                    {formatPrice(req.estimated_subtotal, req.estimated_subtotal * 3.3)}
                  </span>
                  <button
                    onClick={() => downloadQuotationPDF(req)}
                    className="px-4 py-2 rounded-xl bg-desertSand/40 dark:bg-darkSurface text-coffeeBean dark:text-white text-xs font-bold flex items-center gap-1.5 hover:bg-toffeeBrown hover:text-white transition-colors border border-tan/30"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EDIT FURNITURE ITEM MODAL (SUPPORTS IMAGE FILE UPLOADS) */}
      <AnimatePresence>
        {editingItem && (
          <div
            onClick={() => setEditingItem(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-luxury-500/30 rounded-3xl p-8 max-w-lg w-full text-white space-y-6 shadow-2xl my-8 relative"
            >
              <button
                onClick={() => setEditingItem(null)}
                className="absolute top-6 right-6 text-neutral-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>

              <h3 className="text-2xl font-bold font-serif">Edit Furniture Model</h3>

              <form onSubmit={handleSaveEditFurniture} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-neutral-300 mb-1">Furniture Title</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full p-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                  />
                </div>

                {/* IMAGE FILE UPLOADER & THUMBNAILS LIST */}
                <div className="space-y-2">
                  <label className="block text-neutral-300">Furniture Images</label>

                  <div className="flex flex-wrap gap-2 mb-2">
                    {editImagesList.map((img, idx) => (
                      <div key={idx} className="relative w-14 h-14 rounded-xl overflow-hidden border border-neutral-700 bg-neutral-800 group">
                        <Image src={img} alt="" fill className="object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditImagesList(editImagesList.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-0.5 rounded-full bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <label className="flex-1 cursor-pointer py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-dashed border-neutral-600 text-luxury-400 font-bold text-center flex items-center justify-center gap-2 transition-colors">
                      <Upload className="w-4 h-4" />
                      <span>Upload Local Photo(s)</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleEditFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="pt-1">
                    <input
                      type="text"
                      placeholder="Or paste image URL link..."
                      value={editImageUrlInput}
                      onChange={(e) => setEditImageUrlInput(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full p-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-neutral-300 mb-1">Material</label>
                    <input
                      type="text"
                      value={editMaterial}
                      onChange={(e) => setEditMaterial(e.target.value)}
                      className="w-full p-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-300 mb-1">Color Finish</label>
                    <input
                      type="text"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-full p-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-neutral-300 mb-1">Retail Rate (€)</label>
                    <input
                      type="number"
                      value={editRentalPrice}
                      onChange={(e) => setEditRentalPrice(Number(e.target.value))}
                      className="w-full p-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-300 mb-1">Pro Rate (€)</label>
                    <input
                      type="number"
                      value={editProPrice}
                      onChange={(e) => setEditProPrice(Number(e.target.value))}
                      className="w-full p-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-300 mb-1">Stock Owned</label>
                    <input
                      type="number"
                      value={editQtyOwned}
                      onChange={(e) => setEditQtyOwned(Number(e.target.value))}
                      className="w-full p-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-3.5 rounded-full bg-luxury-500 text-neutral-950 font-extrabold text-xs uppercase tracking-wider hover:bg-luxury-400 transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="py-3.5 px-6 rounded-full bg-neutral-800 text-neutral-300 font-bold text-xs uppercase"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD FURNITURE MODAL (SUPPORTS IMAGE FILE UPLOADS) */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div
            onClick={() => setIsAddModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-luxury-500/30 rounded-3xl p-8 max-w-lg w-full text-white space-y-6 shadow-2xl relative my-8"
            >
              <h3 className="text-2xl font-bold font-serif">Add New Architectural Piece</h3>

              <form onSubmit={handleAddFurniture} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-neutral-300 mb-1">Furniture Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Scagliola Console Table"
                    className="w-full p-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                  />
                </div>

                {/* IMAGE FILE UPLOADER & THUMBNAILS LIST */}
                <div className="space-y-2">
                  <label className="block text-neutral-300">Furniture Images</label>

                  <div className="flex flex-wrap gap-2 mb-2">
                    {newImagesList.map((img, idx) => (
                      <div key={idx} className="relative w-14 h-14 rounded-xl overflow-hidden border border-neutral-700 bg-neutral-800 group">
                        <Image src={img} alt="" fill className="object-cover" />
                        <button
                          type="button"
                          onClick={() => setNewImagesList(newImagesList.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-0.5 rounded-full bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <label className="flex-1 cursor-pointer py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-dashed border-neutral-600 text-luxury-400 font-bold text-center flex items-center justify-center gap-2 transition-colors">
                      <Upload className="w-4 h-4" />
                      <span>Upload Local Photo(s)</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleAddFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="pt-1">
                    <input
                      type="text"
                      placeholder="Or paste image URL link..."
                      value={newImageUrlInput}
                      onChange={(e) => setNewImageUrlInput(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1">Description</label>
                  <textarea
                    rows={2}
                    required
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full p-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-neutral-300 mb-1">Retail Daily Rate (€)</label>
                    <input
                      type="number"
                      required
                      value={newRentalPrice}
                      onChange={(e) => setNewRentalPrice(Number(e.target.value))}
                      className="w-full p-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-300 mb-1">Pro Daily Rate (€)</label>
                    <input
                      type="number"
                      required
                      value={newProPrice}
                      onChange={(e) => setNewProPrice(Number(e.target.value))}
                      className="w-full p-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1">Total Quantity Owned</label>
                  <input
                    type="number"
                    required
                    value={newQtyOwned}
                    onChange={(e) => setNewQtyOwned(Number(e.target.value))}
                    className="w-full p-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-3.5 rounded-full bg-luxury-500 text-neutral-950 font-extrabold text-xs uppercase tracking-wider hover:bg-luxury-400 transition-colors"
                  >
                    Save & Publish
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="py-3.5 px-6 rounded-full bg-neutral-800 text-neutral-300 font-bold text-xs uppercase"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REQUEST PREVIEW MODAL */}
      <AnimatePresence>
        {previewRequest && (
          <div
            onClick={() => setPreviewRequest(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-luxury-500/30 rounded-3xl p-8 max-w-2xl w-full text-white space-y-6 shadow-2xl relative my-8"
            >
              <button
                onClick={() => setPreviewRequest(null)}
                className="absolute top-6 right-6 text-neutral-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold font-serif">
                    Request Preview {previewRequest.reference_code}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-luxury-500/20 text-luxury-400 text-xs font-bold uppercase">
                    {previewRequest.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Client: {previewRequest.customer_name} ({previewRequest.customer_email}) • {previewRequest.customer_phone}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-800/80 border border-neutral-700 text-xs space-y-2">
                <div className="font-bold text-luxury-400">Event Dates & Duration</div>
                <div>
                  {formatDate(previewRequest.start_date)} → {formatDate(previewRequest.end_date)} ({previewRequest.total_days} Days)
                </div>
                {previewRequest.notes && (
                  <div className="text-neutral-300 pt-1 border-t border-neutral-700">
                    <strong>Notes:</strong> {previewRequest.notes}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Requested Items List</div>
                <div className="divide-y divide-neutral-800">
                  {previewRequest.items.map((it) => (
                    <div key={it.furniture_id} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-neutral-800 flex-shrink-0">
                          <Image src={it.image} alt="" fill className="object-cover" />
                        </div>
                        <div>
                          <div className="font-bold text-white">{it.title}</div>
                          <div className="text-[10px] text-neutral-400">
                            {it.startDate || previewRequest.start_date} → {it.endDate || previewRequest.end_date}
                          </div>
                        </div>
                      </div>
                      <div className="font-bold text-luxury-400">{it.quantity} Units</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-neutral-400 block">Subtotal</span>
                  <span className="text-xl font-bold text-luxury-400 font-serif">
                    {formatCurrency(previewRequest.estimated_subtotal)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      updateRequestStatus(previewRequest.id, "validated");
                      setPreviewRequest(null);
                    }}
                    className="px-5 py-2.5 rounded-full bg-emerald-500 text-neutral-950 font-extrabold text-xs uppercase"
                  >
                    Validate Request
                  </button>
                  <button
                    onClick={() => downloadQuotationPDF(previewRequest)}
                    className="px-4 py-2.5 rounded-full bg-neutral-800 text-white font-bold text-xs flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REPROGRAM REQUEST DATES MODAL */}
      <AnimatePresence>
        {reprogramRequest && (
          <div
            onClick={() => setReprogramRequest(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-luxury-500/30 rounded-3xl p-8 max-w-md w-full text-white space-y-6 shadow-2xl relative"
            >
              <h3 className="text-2xl font-bold font-serif">Reprogram Event Dates</h3>
              <p className="text-xs text-neutral-400">
                Reschedule event dates for request <strong>{reprogramRequest.reference_code}</strong>.
              </p>

              <div className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-neutral-300 mb-1">New Start Date</label>
                  <input
                    type="date"
                    value={reprogramStart}
                    onChange={(e) => setReprogramStart(e.target.value)}
                    className="w-full p-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1">New End Date</label>
                  <input
                    type="date"
                    value={reprogramEnd}
                    onChange={(e) => setReprogramEnd(e.target.value)}
                    className="w-full p-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      reprogramRequestDates(reprogramRequest.id, reprogramStart, reprogramEnd);
                      setReprogramRequest(null);
                    }}
                    className="flex-1 py-3.5 rounded-full bg-luxury-500 text-neutral-950 font-extrabold text-xs uppercase"
                  >
                    Save & Reprogram
                  </button>
                  <button
                    onClick={() => setReprogramRequest(null)}
                    className="py-3.5 px-5 rounded-full bg-neutral-800 text-neutral-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
