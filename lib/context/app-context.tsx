"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  FurnitureItem,
  Profile,
  RentalRequest,
  RequestItem,
  UserRole,
  AccountStatus,
  ActiveRentedItem,
  ItemCondition,
  Country,
  Currency,
  UserLevel,
  UserFlag,
  UserMessage,
  MessageReply,
} from "../types";
import {
  MOCK_CATEGORIES,
  MOCK_FURNITURE,
  MOCK_RENTAL_REQUESTS,
  MOCK_USERS,
  MOCK_CMS,
  MOCK_MESSAGES,
} from "../data/mock-db";
import { generateReferenceCode } from "../utils/formatters";
import { Language, Translations, translations } from "../i18n/translations";

interface AppContextType {
  // Country & Currency Engine
  country: Country;
  setCountry: (c: Country) => void;
  currency: Currency;
  currencySymbol: string;
  formatPrice: (amountEur: number, amountTnd?: number) => string;

  // Localization & Translations
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;

  // Auth & Role Switcher
  currentUser: Profile;
  setCurrentUserRole: (role: UserRole) => void;
  setCurrentUserStatus: (status: AccountStatus) => void;
  allUsers: Profile[];
  updateUserStatus: (userId: string, newStatus: AccountStatus) => void;
  updateUserFlags: (userId: string, flags: UserFlag[]) => void;
  updateUserLevel: (userId: string, level: UserLevel) => void;
  updateUserNotes: (userId: string, notes: string) => void;
  updateUserBenefits: (userId: string, benefits: string[]) => void;

  // Messaging & Feedback System
  messages: UserMessage[];
  sendMessage: (data: {
    subject: string;
    content: string;
    category?: UserMessage["category"];
    rating?: number;
  }) => void;
  replyMessage: (messageId: string, content: string) => void;
  updateMessageStatus: (messageId: string, status: UserMessage["status"]) => void;

  // Inventory & Furniture
  furniture: FurnitureItem[];
  categories: typeof MOCK_CATEGORIES;
  addFurnitureItem: (item: Omit<FurnitureItem, "id" | "created_at" | "updated_at">) => void;
  updateFurnitureItem: (id: string, updates: Partial<FurnitureItem>) => void;
  deleteFurnitureItem: (id: string) => void;
  adjustFurnitureStock: (id: string, deltaQty: number) => void;

  // Active Rented Items (Persistent Dispatches & Maintenance)
  activeRentedItems: ActiveRentedItem[];
  returnRentedItem: (id: string) => void;
  updateRentedItemCondition: (id: string, condition: ItemCondition, status?: ActiveRentedItem["status"]) => void;

  // Global Date Defaults & Rental Draft
  startDate: string;
  endDate: string;
  setDates: (start: string, end: string) => void;
  draftItems: RequestItem[];
  addToDraft: (
    item: FurnitureItem,
    quantity?: number,
    itemStartDate?: string,
    itemEndDate?: string
  ) => void;
  removeFromDraft: (furnitureId: string) => void;
  updateDraftQuantity: (furnitureId: string, quantity: number) => void;
  clearDraft: () => void;

  // Rental Requests Store
  rentalRequests: RentalRequest[];
  submitRentalRequest: (data: {
    customerName: string;
    phone: string;
    email: string;
    companyName?: string;
    notes?: string;
  }) => RentalRequest;
  updateRequestStatus: (id: string, status: RentalRequest["status"]) => void;
  reprogramRequestDates: (id: string, newStart: string, newEnd: string) => void;

  // CMS & Stats
  cms: typeof MOCK_CMS;
  updateCMS: (newCms: typeof MOCK_CMS) => void;

  // Theme
  isDarkMode: boolean;
  toggleTheme: () => void;

  // Quick Preview Modal
  activePreviewItem: FurnitureItem | null;
  setActivePreviewItem: (item: FurnitureItem | null) => void;

  // Date Selection Modal State
  activeDateModalItem: FurnitureItem | null;
  setActiveDateModalItem: (item: FurnitureItem | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Country & Currency state (France / Tunisie)
  const [country, setCountryState] = useState<Country>("FR");

  useEffect(() => {
    try {
      const savedCountry = localStorage.getItem("concorde:country:v1") as Country | null;
      if (savedCountry === "FR" || savedCountry === "TN") {
        setCountryState(savedCountry);
      }
    } catch (e) {}
  }, []);

  const setCountry = (c: Country) => {
    setCountryState(c);
    try {
      localStorage.setItem("concorde:country:v1", c);
    } catch (e) {}
  };

  const currency: Currency = country === "TN" ? "TND" : "EUR";
  const currencySymbol = country === "TN" ? "DT" : "€";

  const formatPrice = (amountEur: number, amountTnd?: number) => {
    if (country === "TN") {
      const val = amountTnd !== undefined ? amountTnd : Math.round(amountEur * 3.3);
      return `${val} DT`;
    }
    return `${amountEur} €`;
  };

  // Language state (French & Arabic)
  const [language, setLanguageState] = useState<Language>("fr");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("concorde:lang:v1") as Language | null;
      if (saved === "ar" || saved === "fr") {
        setLanguageState(saved);
        document.documentElement.lang = saved;
        document.documentElement.dir = saved === "ar" ? "rtl" : "ltr";
      } else {
        document.documentElement.lang = "fr";
        document.documentElement.dir = "ltr";
      }
    } catch (e) {}
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
      localStorage.setItem("concorde:lang:v1", lang);
    } catch (e) {}
  };

  const t = translations[language];

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  // Users state
  const [allUsers, setAllUsers] = useState<Profile[]>(MOCK_USERS);
  const [currentUser, setCurrentUser] = useState<Profile>(MOCK_USERS[0]); // Default super_admin for full capability testing

  const setCurrentUserRole = (role: UserRole) => {
    const matched = allUsers.find((u) => u.role === role);
    if (matched) {
      setCurrentUser(matched);
    } else {
      setCurrentUser((prev) => ({ ...prev, role }));
    }
  };

  const setCurrentUserStatus = (status: AccountStatus) => {
    setCurrentUser((prev) => ({ ...prev, status }));
  };

  const updateUserStatus = (userId: string, newStatus: AccountStatus) => {
    setAllUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
    );
  };

  const updateUserFlags = (userId: string, flags: UserFlag[]) => {
    setAllUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, flags } : u))
    );
    if (currentUser.id === userId) {
      setCurrentUser((prev) => ({ ...prev, flags }));
    }
  };

  const updateUserLevel = (userId: string, level: UserLevel) => {
    setAllUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, level } : u))
    );
    if (currentUser.id === userId) {
      setCurrentUser((prev) => ({ ...prev, level }));
    }
  };

  const updateUserNotes = (userId: string, notes: string) => {
    setAllUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, admin_notes: notes } : u))
    );
    if (currentUser.id === userId) {
      setCurrentUser((prev) => ({ ...prev, admin_notes: notes }));
    }
  };

  const updateUserBenefits = (userId: string, benefits: string[]) => {
    setAllUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, benefits } : u))
    );
    if (currentUser.id === userId) {
      setCurrentUser((prev) => ({ ...prev, benefits }));
    }
  };

  // Messaging & Feedback State
  const [messages, setMessages] = useState<UserMessage[]>(MOCK_MESSAGES);

  const sendMessage = (data: {
    subject: string;
    content: string;
    category?: UserMessage["category"];
    rating?: number;
  }) => {
    const newMsg: UserMessage = {
      id: `msg-${Date.now()}`,
      user_id: currentUser.id,
      user_name: currentUser.full_name,
      user_email: currentUser.email,
      subject: data.subject,
      content: data.content,
      category: data.category || "feedback",
      rating: data.rating || 5,
      status: "unread",
      country,
      created_at: new Date().toISOString(),
      replies: [],
    };
    setMessages((prev) => [newMsg, ...prev]);
  };

  const replyMessage = (messageId: string, content: string) => {
    const newReply: MessageReply = {
      id: `rep-${Date.now()}`,
      sender_id: currentUser.id,
      sender_name: currentUser.full_name,
      sender_role: currentUser.role,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              status:
                currentUser.role === "admin" ||
                currentUser.role === "super_admin" ||
                currentUser.role === "manager"
                  ? "resolved"
                  : m.status,
              replies: [...m.replies, newReply],
            }
          : m
      )
    );
  };

  const updateMessageStatus = (
    messageId: string,
    status: UserMessage["status"]
  ) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, status } : m))
    );
  };

  // Furniture state
  const [furniture, setFurniture] = useState<FurnitureItem[]>(MOCK_FURNITURE);
  const [categories] = useState(MOCK_CATEGORIES);

  const addFurnitureItem = (
    itemData: Omit<FurnitureItem, "id" | "created_at" | "updated_at">
  ) => {
    const newItem: FurnitureItem = {
      ...itemData,
      id: `furn-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setFurniture((prev) => [newItem, ...prev]);
  };

  const updateFurnitureItem = (id: string, updates: Partial<FurnitureItem>) => {
    setFurniture((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, ...updates, updated_at: new Date().toISOString() }
          : item
      )
    );
  };

  const deleteFurnitureItem = (id: string) => {
    setFurniture((prev) => prev.filter((item) => item.id !== id));
  };

  const adjustFurnitureStock = (id: string, deltaQty: number) => {
    setFurniture((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity_owned: Math.max(0, item.quantity_owned + deltaQty),
              updated_at: new Date().toISOString(),
            }
          : item
      )
    );
  };

  // Active Rented Items State (Persistent Return & Maintenance State)
  const [activeRentedItems, setActiveRentedItems] = useState<ActiveRentedItem[]>([
    {
      id: "rented-1",
      furniture_id: "furn-1",
      title: "The Kasaya Curved Sofa",
      customer_name: "Sophia Kensington",
      company_name: "Kensington Luxury Events",
      quantity: 4,
      start_date: "2026-08-15",
      end_date: "2026-08-18",
      status: "active_rented",
      condition: "perfect",
    },
    {
      id: "rented-2",
      furniture_id: "furn-3",
      title: "Ganesha Banquet Dining Table",
      customer_name: "Eleanor Sterling",
      company_name: "Private Gala Host",
      quantity: 6,
      start_date: "2026-08-10",
      end_date: "2026-08-14",
      status: "expected_return",
      condition: "good",
    },
  ]);

  const returnRentedItem = (id: string) => {
    const target = activeRentedItems.find((r) => r.id === id);
    if (target) {
      // Restore stock quantity
      adjustFurnitureStock(target.furniture_id, target.quantity);
      // Mark active rented item as returned in state so it persists
      setActiveRentedItems((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "returned" } : r))
      );
    }
  };

  const updateRentedItemCondition = (
    id: string,
    condition: ItemCondition,
    status?: ActiveRentedItem["status"]
  ) => {
    setActiveRentedItems((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              condition,
              status: status || (condition === "broken" || condition === "bad" ? "inspection" : r.status),
            }
          : r
      )
    );
  };

  // Dates & Rental Draft
  const [startDate, setStartDate] = useState<string>("2026-08-15");
  const [endDate, setEndDate] = useState<string>("2026-08-18");

  const setDates = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const [draftItems, setDraftItems] = useState<RequestItem[]>([
    {
      furniture_id: MOCK_FURNITURE[0].id,
      title: MOCK_FURNITURE[0].title,
      slug: MOCK_FURNITURE[0].slug,
      image: MOCK_FURNITURE[0].images[0],
      quantity: 2,
      rental_price: MOCK_FURNITURE[0].rental_price,
      professional_price: MOCK_FURNITURE[0].professional_price,
      startDate: "2026-08-15",
      endDate: "2026-08-18",
      totalDays: 3,
    },
  ]);

  const addToDraft = (
    item: FurnitureItem,
    quantity: number = 1,
    itemStartDate: string = startDate,
    itemEndDate: string = endDate
  ) => {
    const totalDays = Math.max(
      1,
      Math.ceil(
        (new Date(itemEndDate).getTime() - new Date(itemStartDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    setDraftItems((prev) => {
      const existing = prev.find((i) => i.furniture_id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.furniture_id === item.id
            ? {
                ...i,
                quantity: Math.min(item.quantity_owned, i.quantity + quantity),
                startDate: itemStartDate,
                endDate: itemEndDate,
                totalDays,
              }
            : i
        );
      }
      return [
        ...prev,
        {
          furniture_id: item.id,
          title: item.title,
          slug: item.slug,
          image: item.images[0],
          quantity: Math.min(item.quantity_owned, quantity),
          rental_price: item.rental_price,
          professional_price: item.professional_price,
          startDate: itemStartDate,
          endDate: itemEndDate,
          totalDays,
        },
      ];
    });
  };

  const removeFromDraft = (furnitureId: string) => {
    setDraftItems((prev) => prev.filter((i) => i.furniture_id !== furnitureId));
  };

  const updateDraftQuantity = (furnitureId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromDraft(furnitureId);
      return;
    }
    setDraftItems((prev) =>
      prev.map((i) => (i.furniture_id === furnitureId ? { ...i, quantity } : i))
    );
  };

  const clearDraft = () => setDraftItems([]);

  // Rental Requests Store
  const [rentalRequests, setRentalRequests] =
    useState<RentalRequest[]>(MOCK_RENTAL_REQUESTS);

  const submitRentalRequest = (data: {
    customerName: string;
    phone: string;
    email: string;
    companyName?: string;
    notes?: string;
  }) => {
    const totalSubtotal = draftItems.reduce(
      (sum, item) =>
        sum +
        (currentUser.role === "professional"
          ? item.professional_price
          : item.rental_price) *
          item.quantity *
          (item.totalDays || 1),
      0
    );

    const newRequest: RentalRequest = {
      id: `req-${Date.now()}`,
      reference_code: generateReferenceCode(),
      user_id: currentUser.id,
      customer_name: data.customerName,
      customer_phone: data.phone,
      customer_email: data.email,
      company_name: data.companyName,
      start_date: startDate,
      end_date: endDate,
      total_days: 3,
      status: "submitted",
      items: [...draftItems],
      estimated_subtotal: totalSubtotal,
      notes: data.notes,
      whatsapp_sent: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setRentalRequests((prev) => [newRequest, ...prev]);
    clearDraft();
    return newRequest;
  };

  const updateRequestStatus = (
    id: string,
    status: RentalRequest["status"]
  ) => {
    setRentalRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status } : req))
    );
  };

  const reprogramRequestDates = (
    id: string,
    newStart: string,
    newEnd: string
  ) => {
    const days = Math.max(
      1,
      Math.ceil(
        (new Date(newEnd).getTime() - new Date(newStart).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
    setRentalRequests((prev) =>
      prev.map((req) =>
        req.id === id
          ? {
              ...req,
              start_date: newStart,
              end_date: newEnd,
              total_days: days,
              status: "reprogramed",
              updated_at: new Date().toISOString(),
            }
          : req
      )
    );
  };

  // CMS content
  const [cms, setCms] = useState(MOCK_CMS);
  const updateCMS = (newCms: typeof MOCK_CMS) => setCms(newCms);

  // Modals state
  const [activePreviewItem, setActivePreviewItem] =
    useState<FurnitureItem | null>(null);
  const [activeDateModalItem, setActiveDateModalItem] =
    useState<FurnitureItem | null>(null);

  return (
    <AppContext.Provider
      value={{
        country,
        setCountry,
        currency,
        currencySymbol,
        formatPrice,
        language,
        setLanguage,
        t,
        currentUser,
        setCurrentUserRole,
        setCurrentUserStatus,
        allUsers,
        updateUserStatus,
        updateUserFlags,
        updateUserLevel,
        updateUserNotes,
        updateUserBenefits,
        messages,
        sendMessage,
        replyMessage,
        updateMessageStatus,
        furniture,
        categories,
        addFurnitureItem,
        updateFurnitureItem,
        deleteFurnitureItem,
        adjustFurnitureStock,
        activeRentedItems,
        returnRentedItem,
        updateRentedItemCondition,
        startDate,
        endDate,
        setDates,
        draftItems,
        addToDraft,
        removeFromDraft,
        updateDraftQuantity,
        clearDraft,
        rentalRequests,
        submitRentalRequest,
        updateRequestStatus,
        reprogramRequestDates,
        cms,
        updateCMS,
        isDarkMode,
        toggleTheme,
        activePreviewItem,
        setActivePreviewItem,
        activeDateModalItem,
        setActiveDateModalItem,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
