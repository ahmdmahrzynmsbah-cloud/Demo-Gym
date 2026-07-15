export type Language = 'ar' | 'en';
export type UserRole = 'admin' | 'male-trainer' | 'female-trainer';

export type SubscriptionType = 'monthly' | '3-months' | '6-months' | '1-year';

export interface Member {
  id: string;
  fullName: string;
  phone: string;
  gender: 'male' | 'female';
  subscriptionType: SubscriptionType;
  subscriptionPrice: number;
  subscriptionCategory?: 'regular' | 'cardio'; // Subscription category: regular gym or cardio
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isActive: boolean; // Managed by premium toggle switch
  registrationDate: string; // YYYY-MM-DD
  paidAmount?: number; // Total amount paid by member so far
  remainingAmount?: number; // Remaining amount to be paid (debt)
  history: {
    attendedDates: string[]; // List of YYYY-MM-DD dates
    missedDates: string[]; // List of YYYY-MM-DD dates representing missed schedules
  };
}

export interface Trainer {
  id: string;
  name: string;
  gender: 'male' | 'female';
  shiftStart: string; // "HH:MM"
  shiftEnd: string; // "HH:MM"
  targetShiftStartMinutes: number; // minutes from midnight, for tardiness tracking
  salary?: number;
  salaryPaid?: boolean;
  password?: string;
}

export interface AttendanceRecord {
  id: string;
  targetId: string; // Member ID or Trainer ID
  targetType: 'member' | 'trainer';
  targetName: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // HH:MM
  checkOutTime?: string; // HH:MM
  genderSection?: 'male' | 'female';
  isLate?: boolean;
  lateMinutes?: number;
}

export interface ShiftSchedule {
  id: string;
  id_schedule: string;
  genderSection: 'male' | 'female';
  dayOfWeek: number; // 0-6 (Sunday to Saturday)
  className: string; // Name of class or training slot (e.g. Cardio Blast, Powerlifting)
  fromTime: string; // "HH:MM"
  toTime: string; // "HH:MM"
  assignedTrainerId?: string;
  assignedTrainerName?: string;
  maxCapacity: number;
}

export interface Product {
  id: string;
  nameEn: string;
  nameAr: string;
  category: string;
  stockQty: number;
  costPrice: number; // Admin visible only
  retailPrice: number;
  thresholdQty: number;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  qty: number;
  totalCostPrice: number;
  totalRetailPrice: number;
  profit: number;
  date: string; // YYYY-MM-DD
  soldBy: string; // role or name
  genderSection: 'male' | 'female';
}

export interface Equipment {
  id: string;
  name: string;
  purchaseDate: string; // YYYY-MM-DD
  lastMaintenanceDate: string; // YYYY-MM-DD
  status: 'Operational' | 'Under Repair' | 'Out of Service';
  repairCost: number;
  notes?: string;
  category?: 'maintenance' | 'purchase';
}

export interface AppNotification {
  id: string;
  type: 'subscription_expiry' | 'low_stock' | 'trainer_tardiness' | 'weekly_backup' | 'daily_backup' | 'monthly_backup';
  titleEn: string;
  titleAr: string;
  messageEn: string;
  messageAr: string;
  createdAt: string; // Timestamp ISO
  isRead: boolean;
}

export interface GymSettings {
  appName: string;
  tagline: string;
  adminPasscode: string;
  maleTrainerPasscode: string;
  femaleTrainerPasscode: string;
  logoUrl?: string;
  pricingRegularMonthly?: number;
  pricingRegular3Months?: number;
  pricingRegular6Months?: number;
  pricingRegular1Year?: number;
  pricingCardioMonthly?: number;
  pricingCardio3Months?: number;
  pricingCardio6Months?: number;
  pricingCardio1Year?: number;
  pricingSession1?: number;
  pricingSession4?: number;
  pricingSession8?: number;
  pricingSession12?: number;
  pricingSessionKids?: number;
  pricingSessionAdults?: number;
  trainerAnnouncement?: string;
  trainerAnnouncementEnabled?: boolean;
  trainerAnnouncementVersion?: number;
}

export interface SessionTicket {
  id: string;
  fullName: string;
  phone: string;
  sessionsCount: number; // number of casual sessions attended or registered
  genderSection: 'male' | 'female';
  registrationDate: string; // YYYY-MM-DD
  notes?: string;
  price?: number; // Price of the session packages or single drop-in
  sessionType?: 'adult' | 'kids';
}

export interface ActivityLog {
  id: string;
  timestamp: string; // YYYY-MM-DD HH:MM:SS
  actionAr: string;
  actionEn: string;
  category: 'member' | 'subscription' | 'product' | 'sale' | 'attendance' | 'trainer' | 'system' | 'settings' | 'equipment' | 'session';
}
