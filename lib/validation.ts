import { z } from "zod";

const mobile = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");

export const registerSchema = z
  .object({
    role: z.enum(["COMPANY", "CONTRACTOR"]),
    name: z.string().trim().min(2, "Name is too short").max(80),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    mobile,
    password: z.string().min(8, "Password must be at least 8 characters").max(100),
  })
  .strict();

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const companyProfileSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  entityType: z.string().trim().optional(),
  industry: z.string().trim().max(80).optional(),
  contactName: z.string().trim().min(2).max(80),
  contactMobile: mobile,
  contactEmail: z.string().trim().toLowerCase().email(),
  city: z.string().trim().min(2).max(80),
  district: z.string().trim().max(80).optional(),
  state: z.string().trim().min(2).max(80),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter a valid 6-digit pincode")
    .optional()
    .or(z.literal("")),
  gstin: z.string().trim().max(20).optional().or(z.literal("")),
  about: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const contractorProfileSchema = z.object({
  firmName: z.string().trim().min(2).max(120),
  entityType: z.string().trim().optional(),
  ownerName: z.string().trim().min(2).max(80),
  yearEstablished: z.coerce.number().int().min(1900).max(2100).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(80),
  district: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().min(2).max(80),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter a valid 6-digit pincode")
    .optional()
    .or(z.literal("")),
  serviceAreas: z.string().trim().max(300).optional().or(z.literal("")),
  willingOutstation: z.coerce.boolean().optional(),
  pan: z.string().trim().max(15).optional().or(z.literal("")),
  gstin: z.string().trim().max(20).optional().or(z.literal("")),
  labourLicenceNo: z.string().trim().max(40).optional().or(z.literal("")),
  esicNo: z.string().trim().max(40).optional().or(z.literal("")),
  epfNo: z.string().trim().max(40).optional().or(z.literal("")),
  trades: z.array(z.string()).min(1, "Select at least one trade"),
  totalWorkforce: z.coerce.number().int().min(0).max(100000),
  available: z.coerce.number().int().min(0).max(100000),
  mobilizationDays: z.coerce.number().int().min(0).max(365),
  about: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const workerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  gender: z.enum(["M", "F", "O"]).optional().or(z.literal("")),
  age: z.coerce.number().int().min(16).max(80).optional().or(z.literal("")),
  trade: z.string().trim().min(1),
  skillLevel: z.enum(["SKILLED", "SEMI", "UNSKILLED"]),
  yearsExperience: z.coerce.number().int().min(0).max(60).optional().or(z.literal("")),
  nativeState: z.string().trim().max(80).optional().or(z.literal("")),
  expectedDailyWage: z.coerce.number().int().min(0).max(100000).optional().or(z.literal("")),
});

export const jobLineSchema = z.object({
  trade: z.string().trim().min(1),
  headcount: z.coerce.number().int().min(1).max(100000),
  skillLevel: z.enum(["SKILLED", "SEMI", "UNSKILLED"]),
  wageOffered: z.coerce.number().int().min(0).max(100000).optional().or(z.literal("")),
});

export const jobSchema = z.object({
  title: z.string().trim().min(4).max(140),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(80),
  district: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().min(2).max(80),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter a valid 6-digit pincode")
    .optional()
    .or(z.literal("")),
  startDate: z.string().trim().optional().or(z.literal("")),
  durationDays: z.coerce.number().int().min(1).max(3650).optional().or(z.literal("")),
  shift: z.enum(["DAY", "NIGHT", "ROTATING"]).optional().or(z.literal("")),
  accommodationProvided: z.coerce.boolean().optional(),
  foodProvided: z.coerce.boolean().optional(),
  urgency: z.enum(["URGENT", "NORMAL", "PLANNED"]),
  wageOffered: z.coerce.number().int().min(0).max(100000).optional().or(z.literal("")),
  lines: z.array(jobLineSchema).min(1, "Add at least one trade requirement"),
});

export const bidSchema = z.object({
  jobId: z.string().min(1),
  ratePerWorkerPerDay: z.coerce.number().int().min(1).max(100000),
  headcountOffered: z.coerce.number().int().min(1).max(100000),
  mobilizationDays: z.coerce.number().int().min(0).max(365),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const messageSchema = z.object({
  engagementId: z.string().min(1),
  body: z.string().trim().min(1, "Message cannot be empty").max(4000),
});
