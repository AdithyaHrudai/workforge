import { z } from "zod";
import {
  CATEGORY,
  MANPOWER_RATE_BASIS,
  OUTPUT_RATE_BASIS,
  isHeadcountCategory,
  isValidCategory,
  rateBasisFor,
  roleIsInAnotherCatalogue,
} from "@/lib/constants";

// ---------------------------------------------------------------------------
// Building blocks
//
// HTML forms submit "" for an untouched field, never `undefined`. Rather than
// scattering `.or(z.literal(""))` across every schema, blank strings are
// normalised to `undefined` up front so every optional field has one type
// (`string | undefined`) instead of two.
// ---------------------------------------------------------------------------

const blankToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

function optionalText(max: number) {
  return z.preprocess(blankToUndefined, z.string().trim().max(max).optional());
}

function optionalInt(min: number, max: number) {
  return z.preprocess(
    blankToUndefined,
    z.coerce.number().int().min(min).max(max).optional(),
  );
}

function requiredInt(min: number, max: number, message?: string) {
  return z.coerce
    .number({ invalid_type_error: message ?? "Enter a number" })
    .int()
    .min(min)
    .max(max);
}

/** HTML checkboxes submit "on" when ticked and nothing at all when not. */
const checkbox = z.preprocess(
  (v) => v === "on" || v === true || v === "true",
  z.boolean(),
);

/** A multi-select that must contain at least one value. */
function pickList(min: number, message: string, max = 60) {
  return z.array(z.string().trim().min(1)).min(min, message).max(max);
}

const optionalList = z.array(z.string().trim().min(1)).max(60).default([]);

const mobile = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");

// ---------------------------------------------------------------------------
// Statutory identifier formats
//
// Format validation is not verification against a government API — it only
// rejects values that cannot possibly be real, which is enough to keep obvious
// typos out of records an HR team has to rely on.
// ---------------------------------------------------------------------------

/** ABCDE1234F — 5 letters, 4 digits, 1 letter. */
export const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;

/** 2-digit state code + PAN + entity code + 'Z' + checksum. */
export const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

/** 21-character Corporate Identification Number. */
export const CIN_RE = /^[LUu]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/;

/** 4-letter bank code, '0', 6-char branch code. */
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** 12-digit Universal Account Number (EPFO). */
export const UAN_RE = /^\d{12}$/;

/** 17-digit ESIC insurance number. */
export const ESIC_NUMBER_RE = /^\d{17}$/;

/** UDYAM-XX-00-0000000 — 'UDYAM', state code, enterprise type, 7 digits. */
export const UDYAM_RE = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;

const PINCODE_RE = /^[1-9]\d{5}$/;

/** An optional uppercase code: blank is allowed, but a value must match. */
function optionalCode(re: RegExp, message: string) {
  return z.preprocess(
    blankToUndefined,
    z.string().trim().toUpperCase().regex(re, message).optional(),
  );
}

const pan = optionalCode(PAN_RE, "PAN must look like ABCDE1234F");
const gstin = optionalCode(GSTIN_RE, "Enter a valid 15-character GSTIN");
const cin = optionalCode(CIN_RE, "Enter a valid 21-character CIN");
const pincode = optionalCode(PINCODE_RE, "Enter a valid 6-digit pincode");

const website = z.preprocess(
  blankToUndefined,
  z
    .string()
    .trim()
    .max(200)
    .regex(/^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#][^\s]*)?$/i, "Enter a valid website URL")
    .optional(),
);

const currentYear = new Date().getFullYear();

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const email = z.string().trim().toLowerCase().email("Enter a valid email");

/**
 * Length carries the strength; the letter-and-digit rule only rules out the
 * two patterns people actually pick when left alone — a bare mobile number and
 * a single dictionary word. Anything stricter pushes users to write the
 * password down, which is a worse outcome than a mediocre one they remember.
 */
const newPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password is too long")
  .refine((v) => /[A-Za-z]/.test(v), "Include at least one letter")
  .refine((v) => /\d/.test(v), "Include at least one number");

/** Shared by every form that sets a password twice. */
function withConfirmation<T extends z.ZodRawShape>(shape: T) {
  return z
    .object({ ...shape, password: newPassword, confirm: z.string() })
    .refine((d) => d.password === d.confirm, {
      path: ["confirm"],
      message: "Passwords do not match",
    });
}

export const registerSchema = z
  .object({
    role: z.enum(["COMPANY", "CONTRACTOR"]),
    name: z.string().trim().min(2, "Name is too short").max(80),
    email,
    mobile,
    password: newPassword,
  })
  .strict();

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = withConfirmation({
  token: z.string().min(1, "This reset link is incomplete"),
});

export const changePasswordSchema = withConfirmation({
  /** Blank for an account created through Google, which is setting its first. */
  current: z.string().max(100),
});

/** The identity fields a signed-in user owns, as opposed to their firm profile. */
export const accountSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  mobile,
});

// ---------------------------------------------------------------------------
// Administrators
//
// Separate from the marketplace auth schemas above, and deliberately stricter.
// An admin credential is not a consumer credential: it is issued by another
// person, it is never self-service, and it unlocks other people's statutory
// documents.
// ---------------------------------------------------------------------------

/** Staff identifier, e.g. WF-ADM-004. Uppercase so it reads the same everywhere. */
export const ADMIN_CODE_RE = /^[A-Z0-9][A-Z0-9-]{2,23}$/;

/**
 * Login handle assigned at creation: lowercase, no spaces, no '@'.
 *
 * Sign-in accepts an admin's email address as well (see adminLoginSchema), so
 * keeping '@' out of the handle itself means the two forms of identifier can
 * never collide — one admin's username cannot be another's email.
 */
export const ADMIN_USERNAME_RE = /^[a-z0-9](?:[a-z0-9._-]{2,31})$/;

export const ADMIN_PASSWORD_MIN = 12;

/**
 * Length first, then variety. The length floor is what actually matters; the
 * character-class rule is here because it is what an auditor asks for, and at
 * twelve characters it costs a well-chosen password nothing.
 */
const adminPassword = z
  .string()
  .min(ADMIN_PASSWORD_MIN, `Password must be at least ${ADMIN_PASSWORD_MIN} characters`)
  .max(200, "Password is too long")
  .refine((v) => /[a-z]/.test(v), "Include at least one lowercase letter")
  .refine((v) => /[A-Z]/.test(v), "Include at least one uppercase letter")
  .refine((v) => /\d/.test(v), "Include at least one number");

export const adminLoginSchema = z.object({
  /**
   * Username or email address. Both are stored lowercase and both are unique,
   * and a username may not contain '@', so a given string can match at most one
   * account either way. Accepting both spares an admin having to remember which
   * of two identifiers this particular console wanted.
   */
  identifier: z.string().trim().toLowerCase().min(1, "Enter your username or email").max(254),
  password: z.string().min(1, "Password is required").max(200),
});

export const adminCreateSchema = z
  .object({
    adminCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(ADMIN_CODE_RE, "Use 3–24 characters: letters, numbers and dashes"),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(ADMIN_USERNAME_RE, "Use 3–32 characters: lowercase letters, numbers, . _ -"),
    name: z.string().trim().min(2, "Enter the person's full name").max(80),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    role: z.enum(["SUPER_ADMIN", "VERIFIER"], {
      errorMap: () => ({ message: "Choose what this admin may do" }),
    }),
    password: adminPassword,
    confirmPassword: z.string(),
  })
  .superRefine((d, ctx) => {
    if (d.password !== d.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "The two passwords do not match",
      });
    }
    // Catches the obvious own-goal of setting the password to the username or
    // the staff code, both of which the new admin has been told in the clear.
    const lowered = d.password.toLowerCase();
    if (lowered.includes(d.username) || lowered.includes(d.adminCode.toLowerCase())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "The password must not contain the username or the admin ID",
      });
    }
  });

/** An admin changing their own password. */
export const adminChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    password: adminPassword,
    confirmPassword: z.string(),
  })
  .superRefine((d, ctx) => {
    if (d.password !== d.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "The two passwords do not match",
      });
    }
    if (d.password === d.currentPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Choose a password you have not used here before",
      });
    }
  });

/** A super admin setting a new password for somebody else. */
export const adminResetPasswordSchema = z
  .object({
    adminId: z.string().min(1),
    password: adminPassword,
    confirmPassword: z.string(),
  })
  .superRefine((d, ctx) => {
    if (d.password !== d.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "The two passwords do not match",
      });
    }
  });

// ---------------------------------------------------------------------------
// Company profile
//
// Only the fields a company genuinely needs to be findable are required.
// Everything statutory is optional, per the client's instruction that a company
// shouldn't have to disclose GST and PAN just to register.
// ---------------------------------------------------------------------------

export const companyProfileSchema = z.object({
  companyName: z.string().trim().min(2, "Enter the company name").max(120),
  natureOfBusiness: z.enum(["MANUFACTURING", "SERVICE", "BOTH"], {
    errorMap: () => ({ message: "Select whether you are into manufacturing or service" }),
  }),
  industries: pickList(1, "Select at least one industry"),
  manpowerBand: optionalText(20),
  categoriesUsed: pickList(1, "Select at least one type of contract manpower you engage").refine(
    (list) => list.every(isValidCategory),
    "Unrecognised contract category",
  ),
  entityType: optionalText(40),
  website,

  contactName: z.string().trim().min(2, "Enter the contact person's name").max(80),
  contactDesignation: optionalText(80),
  contactMobile: mobile,
  contactEmail: z.string().trim().toLowerCase().email("Enter a valid email"),

  city: z.string().trim().min(2, "Enter the city").max(80),
  district: optionalText(80),
  state: z.string().trim().min(2, "Select the state").max(80),
  pincode,

  gstin,
  pan,
  cin,
  about: optionalText(2000),
});

// ---------------------------------------------------------------------------
// Contractor profile
// ---------------------------------------------------------------------------

export const contractorProfileSchema = z
  .object({
    firmName: z.string().trim().min(2, "Enter the firm name").max(120),
    entityType: optionalText(40),
    ownerName: z.string().trim().min(2, "Enter the owner or proprietor's name").max(80),
    ownerDesignation: optionalText(80),
    yearEstablished: optionalInt(1900, currentYear),
    website,

    address: optionalText(300),
    city: z.string().trim().min(2, "Enter the city").max(80),
    district: optionalText(80),
    state: z.string().trim().min(2, "Select the state").max(80),
    pincode,

    presenceStates: pickList(1, "Select at least one state where you operate"),
    workerSourceStates: optionalList,

    categories: pickList(1, "Select at least one type of contract you take on").refine(
      (list) => list.every(isValidCategory),
      "Unrecognised contract category",
    ),
    industries: pickList(1, "Select at least one industry you have worked in"),
    roles: optionalList,

    willingOutstation: checkbox,

    // PAN is mandatory for a contractor: every firm that raises an invoice has
    // one, and it is the single identifier an admin can check a licence against.
    // The rest are genuinely optional — a small firm may hold none of them.
    pan: z
      .string()
      .trim()
      .toUpperCase()
      .min(1, "PAN is required")
      .regex(PAN_RE, "PAN must look like ABCDE1234F"),
    gstin,
    udyamNo: optionalCode(UDYAM_RE, "Udyam number looks like UDYAM-MH-26-0012345"),
    labourLicenceNo: optionalText(40),
    esicNo: optionalText(40),
    epfNo: optionalText(40),

    totalWorkforce: requiredInt(0, 200000, "Enter your total workforce"),
    availableNow: requiredInt(0, 200000, "Enter how many are available now"),
    mobilizationDays: requiredInt(0, 365, "Enter your mobilisation time in days"),

    about: optionalText(2000),
  })
  .superRefine((d, ctx) => {
    // A firm can't have more people free than it employs. Caught here rather
    // than left to the reader, because "available" drives search ranking.
    if (d.availableNow > d.totalWorkforce) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["availableNow"],
        message: "Available manpower cannot exceed your total workforce",
      });
    }
  });

// ---------------------------------------------------------------------------
// Verification checklist
//
// One question per document, answered yes or no. A "yes" has to carry the
// registration number as well as the certificate, checked against the same
// formats the profile uses — a number that cannot be read off the certificate
// is worth nothing to the reviewer who has to compare the two.
// ---------------------------------------------------------------------------

export const verificationAnswerSchema = z
  .object({
    type: z.enum(["GST", "PAN", "CLRA"]),
    answer: z.enum(["YES", "NO"], { errorMap: () => ({ message: "Answer yes or no" }) }),
    idNumber: z.string().trim().toUpperCase().max(40),
  })
  .superRefine((d, ctx) => {
    if (d.answer === "NO") return;

    const fail = (message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["idNumber"], message });

    if (d.type === "GST" && !GSTIN_RE.test(d.idNumber)) {
      fail("Enter a valid 15-character GSTIN");
    }
    if (d.type === "PAN" && !PAN_RE.test(d.idNumber)) {
      fail("PAN must look like ABCDE1234F");
    }
    // Every state labour department issues its own CLRA registration format, so
    // there is nothing to pattern-match against — length is the only check that
    // would not reject a genuine certificate.
    if (d.type === "CLRA" && d.idNumber.length < 4) {
      fail("Enter the registration number as printed on the certificate");
    }
  });

/** One entry in the contractor's client list. */
export const contractorClientSchema = z
  .object({
    clientName: z.string().trim().min(2, "Enter the client company's name").max(120),
    industry: optionalText(40),
    siteCity: z.string().trim().min(2, "Enter the site city").max(80),
    siteState: z.string().trim().min(2, "Select the site state").max(80),
    category: optionalText(40),
    scope: optionalText(300),
    headcount: requiredInt(0, 100000, "Enter the manpower deployed"),
    startedYear: optionalInt(1950, currentYear),
    endedYear: optionalInt(1950, currentYear),
    ongoing: checkbox,
  })
  .superRefine((d, ctx) => {
    if (d.category && !isValidCategory(d.category)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["category"],
        message: "Unrecognised contract category",
      });
    }
    if (!d.ongoing && !d.endedYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endedYear"],
        message: "Enter the year the contract ended, or mark it as ongoing",
      });
    }
    if (d.startedYear && d.endedYear && d.endedYear < d.startedYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endedYear"],
        message: "The end year cannot be before the start year",
      });
    }
  });

export const capacitySchema = z.object({
  category: z.string().refine(isValidCategory, "Unrecognised contract category"),
  strength: requiredInt(0, 200000, "Enter the manpower deployed in this category"),
  notes: optionalText(200),
});

// ---------------------------------------------------------------------------
// Requirements
//
// One schema with a category-driven refinement rather than four schemas,
// because every field except the last handful is shared. The refinement is what
// enforces the model the client described: staffing requirements carry role
// headcounts, and a job contract carries a scope and an output target with no
// headcount anywhere — how many people to deploy is the contractor's call.
// ---------------------------------------------------------------------------

export const requirementRoleSchema = z.object({
  role: z.string().trim().min(1, "Choose a role"),
  headcount: requiredInt(1, 100000, "Enter how many people you need"),
  experienceBand: optionalText(20),
  qualification: optionalText(20),
  indicativeWage: optionalInt(0, 10000000),
  notes: optionalText(200),
});

export const requirementSchema = z
  .object({
    category: z.string().refine(isValidCategory, "Select a contract type"),
    title: z.string().trim().min(4, "Give the requirement a clear title").max(140),
    industry: optionalText(40),
    description: optionalText(6000),

    // Job-contract fields
    scopeKey: optionalText(40),
    outputQuantity: optionalInt(0, 100000000),
    outputUnit: optionalText(20),
    outputPeriod: optionalText(40),
    deliverables: optionalText(2000),

    siteName: optionalText(120),
    city: z.string().trim().min(2, "Enter the site city").max(80),
    district: optionalText(80),
    state: z.string().trim().min(2, "Select the site state").max(80),
    pincode,

    startDate: optionalText(30),
    durationType: optionalText(20),
    durationMonths: optionalInt(0, 600),
    shift: optionalText(20),
    urgency: z.enum(["URGENT", "NORMAL", "PLANNED"]),

    accommodationProvided: checkbox,
    transportProvided: checkbox,
    foodProvided: checkbox,
    ppeProvided: checkbox,

    preferredRateBasis: optionalText(30),
    indicativeBudget: optionalInt(0, 1000000000),

    roles: z.array(requirementRoleSchema).max(30).default([]),
  })
  .superRefine((d, ctx) => {
    const jobContract = d.category === CATEGORY.JOB_CONTRACT;

    if (jobContract) {
      // The whole point of a job contract is that the company specifies the
      // outcome, so the scope description is what must be present.
      if (!d.description || d.description.length < 20) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["description"],
          message:
            "Describe the scope of work in at least a couple of sentences — this is what contractors quote against",
        });
      }
      if (!d.scopeKey) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scopeKey"],
          message: "Choose the nature of the job contract",
        });
      }
      if (d.outputQuantity != null && !d.outputUnit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["outputUnit"],
          message: "Choose the unit the output is measured in",
        });
      }
    } else {
      if (d.roles.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["roles"],
          message: "Add at least one role with the headcount you need",
        });
      }
      // The catalogue cannot cover every plant's job titles, so a role typed by
      // hand is accepted as-is. What is still rejected is a role belonging to a
      // *different* category's catalogue — that means the category was switched
      // after the roles were added, or the form was tampered with, and silently
      // keeping it would corrupt matching.
      d.roles.forEach((line, i) => {
        if (roleIsInAnotherCatalogue(d.category, line.role)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["roles", i, "role"],
            message: "That role belongs to a different contract type — pick or type another",
          });
        }
      });
    }

    if (d.preferredRateBasis) {
      const allowed = rateBasisFor(d.category).map((o) => o.value);
      if (!allowed.includes(d.preferredRateBasis)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["preferredRateBasis"],
          message: "That rate basis doesn't apply to this contract type",
        });
      }
    }

    if (d.startDate && Number.isNaN(Date.parse(d.startDate))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startDate"],
        message: "Enter a valid start date",
      });
    }
  });

// ---------------------------------------------------------------------------
// Proposals
//
// Built per category rather than as one permissive schema, so a job-contract
// proposal literally cannot carry a headcount commitment and a staffing
// proposal cannot omit one.
// ---------------------------------------------------------------------------

const proposalBase = {
  requirementId: z.string().min(1),
  rateAmount: requiredInt(1, 1000000000, "Enter your rate"),
  mobilizationDays: requiredInt(0, 365, "Enter your mobilisation time in days"),
  validityDays: requiredInt(1, 365, "Enter how long this quote stays valid"),
  coverNote: optionalText(3000),
};

export function proposalSchemaFor(category: string) {
  const bases = rateBasisFor(category).map((o) => o.value) as [string, ...string[]];
  const rateBasis = z.string().refine((v) => bases.includes(v), {
    message: "Choose a rate basis valid for this contract type",
  });

  if (isHeadcountCategory(category)) {
    return z.object({
      ...proposalBase,
      rateBasis,
      headcountOffered: requiredInt(1, 100000, "Enter how many people you can deploy"),
      indicativeCrewSize: z.undefined().optional(),
    });
  }

  return z.object({
    ...proposalBase,
    rateBasis,
    headcountOffered: z.undefined().optional(),
    // Optional and explicitly non-binding: the contractor may share the crew
    // size they have in mind, but it forms no part of the commercial offer.
    indicativeCrewSize: optionalInt(1, 100000),
  });
}

export type ProposalInput = z.infer<ReturnType<typeof proposalSchemaFor>>;

// ---------------------------------------------------------------------------
// Reviews, invites, messages
// ---------------------------------------------------------------------------

const star = z.coerce
  .number({ invalid_type_error: "Give a rating between 1 and 5" })
  .int()
  .min(1, "Give a rating between 1 and 5")
  .max(5, "Give a rating between 1 and 5");

export const contractorReviewSchema = z.object({
  engagementId: z.string().min(1),
  deployment: star,
  compliance: star,
  workerPayment: star,
  manpowerQuality: star,
  responsiveness: star,
  comment: optionalText(2000),
});

export const inviteSchema = z.object({
  requirementId: z.string().min(1, "Choose which requirement to invite them to"),
  contractorId: z.string().min(1),
  message: optionalText(1000),
});

export const messageSchema = z.object({
  engagementId: z.string().min(1),
  body: z.string().trim().min(1, "Message cannot be empty").max(4000),
});

// ---------------------------------------------------------------------------
// Contractor search
//
// The company-side equivalent of a resume database: filters that answer "who
// can actually staff my plant, here, in my sector". Every field is optional —
// an empty search is a valid browse of the whole directory.
// ---------------------------------------------------------------------------

export const CONTRACTOR_SORTS = [
  "relevance",
  "rating",
  "workforce",
  "recent",
] as const;

export const contractorSearchSchema = z.object({
  q: optionalText(120),
  categories: optionalList,
  industries: optionalList,
  states: optionalList,
  zone: optionalText(20),
  workerSourceStates: optionalList,
  roles: optionalList,
  minWorkforce: optionalInt(0, 200000),
  minRating: z.preprocess(
    blankToUndefined,
    z.coerce.number().min(0).max(5).optional(),
  ),
  verifiedOnly: checkbox,
  hasClientsInState: optionalText(80),
  sort: z.enum(CONTRACTOR_SORTS).default("relevance"),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export type ContractorSearchInput = z.infer<typeof contractorSearchSchema>;

/** The rate-basis option lists, re-exported so forms don't import both modules. */
export const RATE_BASIS_BY_KIND = {
  manpower: MANPOWER_RATE_BASIS,
  output: OUTPUT_RATE_BASIS,
};
