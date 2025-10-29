export interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'MONTHLY' | 'YEARLY';
  intervalCount: number;
  trialDays: number;
  features: string[];
  maxFreezes: number;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  userId: string;
  planId: string;
  status: 'ACTIVE' | 'FROZEN' | 'CANCELLED' | 'SUSPENDED' | 'BLACKLISTED';
  startDate: string;
  endDate?: string;
  nextBillingDate?: string;
  autoRenew: boolean;
  frozenUntil?: string;
  cancelledReason?: string;
  suspendedReason?: string;
  suspendedBy?: string;
  blacklistedReason?: string;
  blacklistedBy?: string;
  lastCheckInAt?: string;
  createdAt: string;
  updatedAt: string;
  plan?: MembershipPlan;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

export interface MembershipPayment {
  id: string;
  membershipId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'FAILED';
  dueDate: string;
  paidAt?: string;
  failureReason?: string;
  reminderCount: number;
  lastReminderAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipCheckIn {
  id: string;
  userId: string;
  membershipId: string;
  checkInTime: string;
  checkOutTime?: string;
  location?: string;
  notes?: string;
  createdAt: string;
}

export interface MembershipReminder {
  id: string;
  paymentId: string;
  userId: string;
  type: 'FIRST_REMINDER' | 'SECOND_REMINDER' | 'FINAL_REMINDER' | 'OVERDUE_NOTICE';
  sentAt: string;
  method?: string;
  message?: string;
  response?: string;
  createdAt: string;
}

export interface MembershipStats {
  totalMembers: number;
  activeMembers: number;
  frozenMembers: number;
  cancelledMembers: number;
  suspendedMembers: number;
  blacklistedMembers: number;
  totalRevenue: number;
  pendingPayments: number;
  overduePayments: number;
  recentCheckIns: number;
}

export interface MemberActivityOverview {
  membership: Membership;
  checkInsCount: number;
  lastCheckIn?: MembershipCheckIn;
  recentCheckIns: MembershipCheckIn[];
  upcomingPayment?: MembershipPayment;
  overduePayments: MembershipPayment[];
  totalPaid: number;
  remindersSent: number;
}
