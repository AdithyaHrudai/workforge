// WorkForge demo seed — DEVELOPMENT ONLY.
//
// This script is DESTRUCTIVE: it wipes every table before inserting demo data.
// It therefore refuses to run unless you explicitly opt in, and it never uses
// hardcoded passwords. To provision or rotate a real admin on a production
// database, use `npm run admin:create` instead (non-destructive).
//
// The scenarios below are deliberately concrete rather than lorem-ipsum: a tyre
// plant buying mould change on a job contract, a warehouse paying per tonne, a
// steel plant hiring fitters on term staffing, and contractors whose regional
// presence is the thing that actually decides who wins the work.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { CATEGORY, postingExpiryFrom } from "../lib/constants";

const prisma = new PrismaClient();

/** Generates a strong random password when one isn't supplied via env. */
function generatePassword(): string {
  // base64url of 18 bytes → 24 chars, no ambiguous escaping.
  return randomBytes(18).toString("base64url");
}

/**
 * Refuses to wipe anything that doesn't look like a local/throwaway database.
 * Set ALLOW_DESTRUCTIVE_SEED=1 to override (e.g. for a disposable staging branch).
 */
function assertSafeToWipe(): void {
  const url = process.env.DATABASE_URL ?? "";
  const override = process.env.ALLOW_DESTRUCTIVE_SEED === "1";
  const looksLocal = /@(localhost|127\.0\.0\.1|host\.docker\.internal)[:/]/.test(url);

  if (looksLocal || override) return;

  const host = url.replace(/^.*@/, "").replace(/[/?].*$/, "") || "(unset)";
  console.error(
    [
      "",
      "  ✖ Refusing to seed: this does not look like a local database.",
      "",
      `    Target host: ${host}`,
      "",
      "    `npm run db:seed` DELETES EVERY ROW in every table before inserting",
      "    demo data. It is meant for local development only.",
      "",
      "    • To provision or rotate an admin on a real database, run:",
      "        npm run admin:create",
      "",
      "    • If this database really is disposable and you want to wipe it:",
      "        ALLOW_DESTRUCTIVE_SEED=1 npm run db:seed",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

async function main() {
  assertSafeToWipe();

  // Passwords come from env when provided, otherwise they are generated and
  // printed once. Nothing is hardcoded, so nothing can leak via source control.
  const demoPassword = process.env.SEED_DEMO_PASSWORD || generatePassword();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || generatePassword();
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@workforge.in";
  const adminUsername = process.env.SEED_ADMIN_USERNAME || "admin";

  const pwd = await bcrypt.hash(demoPassword, 12);
  const adminPwd = await bcrypt.hash(adminPassword, 12);

  // ---------------------------------------------------------------------
  // Reset — children first, so foreign keys never block the wipe.
  // ---------------------------------------------------------------------
  await prisma.message.deleteMany();
  await prisma.contractorReview.deleteMany();
  await prisma.engagement.deleteMany();
  await prisma.requirementInvite.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.requirementRole.deleteMany();
  await prisma.requirement.deleteMany();
  await prisma.contactUnlock.deleteMany();
  await prisma.contractorClient.deleteMany();
  await prisma.contractorCapacity.deleteMany();
  await prisma.document.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.contractorProfile.deleteMany();
  await prisma.companyProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.adminSession.deleteMany();
  await prisma.adminUser.deleteMany();

  await prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, platformName: "WorkForge" },
  });

  // The administrator is an AdminUser, not a User with a role — see the
  // AdminUser model. It is created as SUPER_ADMIN so a fresh local database has
  // somebody who can appoint the rest of the team.
  await prisma.adminUser.create({
    data: {
      adminCode: "WF-ADM-001",
      username: adminUsername,
      email: adminEmail,
      name: "WorkForge Admin",
      role: "SUPER_ADMIN",
      passwordHash: adminPwd,
    },
  });

  // ---------------------------------------------------------------------
  // Companies
  // ---------------------------------------------------------------------
  const tyre = await prisma.user.create({
    data: {
      role: "COMPANY",
      name: "Rajesh Menon",
      email: "rajesh@meridiantyres.in",
      mobile: "9820011223",
      passwordHash: pwd,
      companyProfile: {
        create: {
          companyName: "Meridian Tyres India Pvt Ltd",
          natureOfBusiness: "MANUFACTURING",
          industries: ["tyre", "auto"],
          manpowerBand: "1000_5000",
          categoriesUsed: [CATEGORY.JOB_CONTRACT, CATEGORY.BLUE_COLLAR, CATEGORY.UNSKILLED],
          entityType: "Pvt Ltd",
          contactName: "Rajesh Menon",
          contactDesignation: "Head — HR & IR",
          contactMobile: "9820011223",
          contactEmail: "rajesh@meridiantyres.in",
          city: "Dahej",
          district: "Bharuch",
          state: "Gujarat",
          pincode: "392130",
          about:
            "Passenger and truck radial tyre plant running three shifts. 1,800 on rolls with a further 1,200 on contract across production, dispatch and utilities.",
          verified: true,
          status: "APPROVED",
        },
      },
    },
    include: { companyProfile: true },
  });

  const steel = await prisma.user.create({
    data: {
      role: "COMPANY",
      name: "Anita Sahu",
      email: "anita@bhilaispecialsteels.in",
      mobile: "9861100234",
      passwordHash: pwd,
      companyProfile: {
        create: {
          companyName: "Bhilai Special Steels Ltd",
          natureOfBusiness: "MANUFACTURING",
          industries: ["steel", "general_mfg"],
          manpowerBand: "5000_PLUS",
          categoriesUsed: [
            CATEGORY.WHITE_COLLAR,
            CATEGORY.BLUE_COLLAR,
            CATEGORY.JOB_CONTRACT,
            CATEGORY.UNSKILLED,
          ],
          entityType: "Public Ltd",
          contactName: "Anita Sahu",
          contactDesignation: "DGM — Contracts",
          contactMobile: "9861100234",
          contactEmail: "anita@bhilaispecialsteels.in",
          city: "Bhilai",
          district: "Durg",
          state: "Chhattisgarh",
          pincode: "490001",
          about:
            "Integrated special steels plant. Regular requirements across rolling mill maintenance, refractory work and shutdown campaigns.",
          verified: true,
          status: "APPROVED",
        },
      },
    },
    include: { companyProfile: true },
  });

  const warehouse = await prisma.user.create({
    data: {
      role: "COMPANY",
      name: "Faisal Qureshi",
      email: "faisal@northboundlogistics.in",
      mobile: "9711204455",
      passwordHash: pwd,
      companyProfile: {
        create: {
          companyName: "Northbound Logistics Pvt Ltd",
          natureOfBusiness: "SERVICE",
          industries: ["warehousing", "fmcg"],
          manpowerBand: "500_1000",
          categoriesUsed: [CATEGORY.JOB_CONTRACT, CATEGORY.UNSKILLED],
          entityType: "Pvt Ltd",
          contactName: "Faisal Qureshi",
          contactDesignation: "Regional Operations Manager",
          contactMobile: "9711204455",
          contactEmail: "faisal@northboundlogistics.in",
          city: "Bhiwandi",
          district: "Thane",
          state: "Maharashtra",
          pincode: "421302",
          about:
            "Third-party warehousing across six regional distribution centres. Dispatch volumes swing sharply with the season.",
          status: "APPROVED",
        },
      },
    },
    include: { companyProfile: true },
  });

  // ---------------------------------------------------------------------
  // Contractors
  // ---------------------------------------------------------------------

  // A specialist — the "only two or three names in the whole industry" case,
  // and the reason a marketplace for this is worth building at all.
  const specialist = await prisma.user.create({
    data: {
      role: "CONTRACTOR",
      name: "Vikram Deshpande",
      email: "vikram@navyaindustrial.in",
      mobile: "9822334455",
      passwordHash: pwd,
      contractorProfile: {
        create: {
          firmName: "Navya Industrial Services",
          entityType: "Pvt Ltd",
          ownerName: "Vikram Deshpande",
          ownerDesignation: "Managing Director",
          yearEstablished: 2006,
          city: "Pune",
          district: "Pune",
          state: "Maharashtra",
          pincode: "411019",
          presenceStates: ["Maharashtra", "Gujarat", "Andhra Pradesh", "Tamil Nadu", "Karnataka"],
          workerSourceStates: ["Maharashtra", "Bihar", "Uttar Pradesh", "Odisha"],
          categories: [CATEGORY.JOB_CONTRACT, CATEGORY.BLUE_COLLAR],
          industries: ["tyre", "auto", "general_mfg"],
          roles: [
            "mould_drum_change",
            "shutdown_maintenance",
            "amc_maintenance",
            "machine_operator",
            "mould_technician",
            "fitter",
          ],
          willingOutstation: true,
          pan: "AABCN1234K",
          gstin: "27AABCN1234K1ZP",
          labourLicenceNo: "CLRA/PUN/2011/0442",
          epfNo: "MH/PUN/45231",
          esicNo: "31000123450001234",
          totalWorkforce: 820,
          availableNow: 140,
          mobilizationDays: 5,
          about:
            "Specialists in tyre plant mould and drum change, curing press maintenance and shutdown campaigns. Own tooling, own supervision, and a dedicated safety officer on every site.",
          verified: true,
          status: "APPROVED",
        },
      },
    },
    include: { contractorProfile: true },
  });

  // Deep presence exactly where the steel plant is hiring.
  const regional = await prisma.user.create({
    data: {
      role: "CONTRACTOR",
      name: "Suresh Yadav",
      email: "suresh@shaktimanpower.in",
      mobile: "9425566778",
      passwordHash: pwd,
      contractorProfile: {
        create: {
          firmName: "Shakti Manpower & Allied Services",
          entityType: "Proprietorship",
          ownerName: "Suresh Yadav",
          ownerDesignation: "Proprietor",
          yearEstablished: 2012,
          city: "Raipur",
          district: "Raipur",
          state: "Chhattisgarh",
          pincode: "492001",
          presenceStates: ["Chhattisgarh", "Odisha", "Madhya Pradesh", "Jharkhand"],
          workerSourceStates: ["Chhattisgarh", "Jharkhand", "Bihar", "Odisha"],
          categories: [CATEGORY.BLUE_COLLAR, CATEGORY.UNSKILLED, CATEGORY.JOB_CONTRACT],
          industries: ["steel", "power", "cement", "mining"],
          roles: [
            "fitter",
            "welder",
            "electrician",
            "rigger",
            "crane_operator",
            "production_helper",
            "loader_unloader",
            "material_handling",
            "refractory",
            "housekeeping_contract",
          ],
          willingOutstation: false,
          pan: "AAJPY7788L",
          gstin: "22AAJPY7788L1Z4",
          labourLicenceNo: "CLRA/RPR/2014/1187",
          epfNo: "CG/RPR/11902",
          totalWorkforce: 1240,
          availableNow: 310,
          mobilizationDays: 3,
          about:
            "Central India's contract manpower for steel, power and cement plants. A local recruitment network across Chhattisgarh and Jharkhand means shortfalls are covered within 48 hours.",
          verified: true,
          status: "APPROVED",
        },
      },
    },
    include: { contractorProfile: true },
  });

  // White-collar / technical staffing house.
  const staffing = await prisma.user.create({
    data: {
      role: "CONTRACTOR",
      name: "Priya Ramanathan",
      email: "priya@axiomtechnicalstaffing.in",
      mobile: "9840099887",
      passwordHash: pwd,
      contractorProfile: {
        create: {
          firmName: "Axiom Technical Staffing LLP",
          entityType: "LLP",
          ownerName: "Priya Ramanathan",
          ownerDesignation: "Partner",
          yearEstablished: 2015,
          city: "Chennai",
          district: "Chennai",
          state: "Tamil Nadu",
          pincode: "600032",
          presenceStates: [
            "Tamil Nadu",
            "Karnataka",
            "Andhra Pradesh",
            "Telangana",
            "Maharashtra",
            "Gujarat",
          ],
          workerSourceStates: ["Tamil Nadu", "Kerala", "Andhra Pradesh", "Karnataka"],
          categories: [CATEGORY.WHITE_COLLAR, CATEGORY.BLUE_COLLAR],
          industries: ["auto", "electronics", "pharma", "general_mfg", "epc"],
          roles: [
            "production_engineer",
            "maintenance_engineer",
            "quality_engineer",
            "safety_officer",
            "shift_incharge",
            "ppc_planner",
            "cnc_operator",
            "instrumentation_tech",
            "qc_inspector",
          ],
          willingOutstation: true,
          pan: "AAPFA9911C",
          gstin: "33AAPFA9911C1ZQ",
          labourLicenceNo: "CLRA/CHN/2016/0733",
          epfNo: "TN/MAS/78412",
          totalWorkforce: 465,
          availableNow: 85,
          mobilizationDays: 14,
          about:
            "Engineering and technical staffing on term contracts. Diploma and B.E. talent placed on client rolls-equivalent terms, with full statutory compliance managed by us.",
          status: "APPROVED",
        },
      },
    },
    include: { contractorProfile: true },
  });

  // A newer firm still awaiting approval — exercises the moderation queue.
  await prisma.user.create({
    data: {
      role: "CONTRACTOR",
      name: "Imran Shaikh",
      email: "imran@unifiedworkforce.in",
      mobile: "9930077665",
      passwordHash: pwd,
      contractorProfile: {
        create: {
          firmName: "Unified Workforce Solutions",
          entityType: "Partnership",
          ownerName: "Imran Shaikh",
          yearEstablished: 2022,
          city: "Bhiwandi",
          district: "Thane",
          state: "Maharashtra",
          presenceStates: ["Maharashtra", "Gujarat"],
          workerSourceStates: ["Uttar Pradesh", "Bihar", "West Bengal"],
          categories: [CATEGORY.UNSKILLED, CATEGORY.JOB_CONTRACT],
          industries: ["warehousing", "fmcg"],
          roles: ["loader_unloader", "packing_helper", "warehouse_helper", "loading_unloading"],
          totalWorkforce: 180,
          availableNow: 95,
          mobilizationDays: 4,
          about: "Warehouse and dispatch manpower across the Mumbai–Bhiwandi belt.",
          status: "PENDING",
        },
      },
    },
  });

  // ---------------------------------------------------------------------
  // Client lists — the track record companies actually evaluate
  // ---------------------------------------------------------------------
  await prisma.contractorClient.createMany({
    data: [
      // Navya — the tyre specialist
      {
        contractorId: specialist.contractorProfile!.id,
        clientName: "Yokohama India",
        industry: "tyre",
        siteCity: "Dahej",
        siteState: "Gujarat",
        category: CATEGORY.JOB_CONTRACT,
        scope: "Mould change & drum change, 3 shifts, own tooling",
        headcount: 200,
        startedYear: 2019,
        ongoing: true,
        verified: true,
      },
      {
        contractorId: specialist.contractorProfile!.id,
        clientName: "Yokohama India",
        industry: "tyre",
        siteCity: "Visakhapatnam",
        siteState: "Andhra Pradesh",
        category: CATEGORY.JOB_CONTRACT,
        scope: "Curing press maintenance & mould change",
        headcount: 100,
        startedYear: 2021,
        ongoing: true,
        verified: true,
      },
      {
        contractorId: specialist.contractorProfile!.id,
        clientName: "Sundaram Auto Components",
        industry: "auto",
        siteCity: "Hosur",
        siteState: "Tamil Nadu",
        category: CATEGORY.BLUE_COLLAR,
        scope: "Machine shop operators, 2 shifts",
        headcount: 60,
        startedYear: 2020,
        ongoing: true,
      },
      {
        contractorId: specialist.contractorProfile!.id,
        clientName: "Deccan Rubber Works",
        industry: "tyre",
        siteCity: "Aurangabad",
        siteState: "Maharashtra",
        category: CATEGORY.JOB_CONTRACT,
        scope: "Annual shutdown maintenance",
        headcount: 45,
        startedYear: 2017,
        endedYear: 2022,
        ongoing: false,
      },

      // Shakti — central India
      {
        contractorId: regional.contractorProfile!.id,
        clientName: "Jindal Power",
        industry: "power",
        siteCity: "Raigarh",
        siteState: "Chhattisgarh",
        category: CATEGORY.UNSKILLED,
        scope: "Ash handling, housekeeping and material movement",
        headcount: 320,
        startedYear: 2016,
        ongoing: true,
        verified: true,
      },
      {
        contractorId: regional.contractorProfile!.id,
        clientName: "Shree Cement",
        industry: "cement",
        siteCity: "Baloda Bazar",
        siteState: "Chhattisgarh",
        category: CATEGORY.BLUE_COLLAR,
        scope: "Packing plant operators & maintenance fitters",
        headcount: 180,
        startedYear: 2018,
        ongoing: true,
        verified: true,
      },
      {
        contractorId: regional.contractorProfile!.id,
        clientName: "Tata Steel Long Products",
        industry: "steel",
        siteCity: "Joda",
        siteState: "Odisha",
        category: CATEGORY.JOB_CONTRACT,
        scope: "Refractory relining, campaign basis",
        headcount: 140,
        startedYear: 2020,
        ongoing: true,
      },
      {
        contractorId: regional.contractorProfile!.id,
        clientName: "Bhilai Engineering Corporation",
        industry: "steel",
        siteCity: "Bhilai",
        siteState: "Chhattisgarh",
        category: CATEGORY.BLUE_COLLAR,
        scope: "Fabrication shop welders & fitters",
        headcount: 95,
        startedYear: 2015,
        ongoing: true,
        verified: true,
      },

      // Axiom — technical staffing
      {
        contractorId: staffing.contractorProfile!.id,
        clientName: "Hyundai Motor India",
        industry: "auto",
        siteCity: "Sriperumbudur",
        siteState: "Tamil Nadu",
        category: CATEGORY.WHITE_COLLAR,
        scope: "Production & quality engineers on term contract",
        headcount: 85,
        startedYear: 2018,
        ongoing: true,
        verified: true,
      },
      {
        contractorId: staffing.contractorProfile!.id,
        clientName: "Aurobindo Pharma",
        industry: "pharma",
        siteCity: "Hyderabad",
        siteState: "Telangana",
        category: CATEGORY.WHITE_COLLAR,
        scope: "QA/QC executives and shift in-charges",
        headcount: 60,
        startedYear: 2020,
        ongoing: true,
      },
      {
        contractorId: staffing.contractorProfile!.id,
        clientName: "Foxconn India",
        industry: "electronics",
        siteCity: "Chennai",
        siteState: "Tamil Nadu",
        category: CATEGORY.BLUE_COLLAR,
        scope: "Line technicians and QC inspectors",
        headcount: 210,
        startedYear: 2021,
        ongoing: true,
      },
    ],
  });

  await prisma.contractorCapacity.createMany({
    data: [
      { contractorId: specialist.contractorProfile!.id, category: CATEGORY.JOB_CONTRACT, strength: 500 },
      { contractorId: specialist.contractorProfile!.id, category: CATEGORY.BLUE_COLLAR, strength: 320 },
      { contractorId: regional.contractorProfile!.id, category: CATEGORY.BLUE_COLLAR, strength: 480 },
      { contractorId: regional.contractorProfile!.id, category: CATEGORY.UNSKILLED, strength: 620 },
      { contractorId: regional.contractorProfile!.id, category: CATEGORY.JOB_CONTRACT, strength: 140 },
      { contractorId: staffing.contractorProfile!.id, category: CATEGORY.WHITE_COLLAR, strength: 255 },
      { contractorId: staffing.contractorProfile!.id, category: CATEGORY.BLUE_COLLAR, strength: 210 },
    ],
  });

  // ---------------------------------------------------------------------
  // Requirements — one per contract category
  // ---------------------------------------------------------------------

  const mouldChangeStart = new Date(Date.now() + 30 * 86400_000);
  const mouldChange = await prisma.requirement.create({
    data: {
      companyId: tyre.companyProfile!.id,
      category: CATEGORY.JOB_CONTRACT,
      title: "Mould change & drum change contract — Dahej plant",
      industry: "tyre",
      scopeKey: "mould_drum_change",
      description:
        "Mould change and drum change across 42 curing presses running on a three-shift cycle. Contractor to provide trained manpower, supervision and consumable tooling. Average 18 mould changes per shift with a maximum changeover window of 45 minutes per press. Company provides the press bay, overhead crane access and PPE.\n\nHow many people you deploy is entirely your call — we are buying the changeover cycle, not a headcount.",
      outputQuantity: 18,
      outputUnit: "unit",
      outputPeriod: "per shift",
      deliverables:
        "Zero press damage. Changeover within 45 minutes. Daily MIS on changeovers completed. Full statutory compliance for all deployed manpower, with monthly wage and PF/ESI returns shared.",
      siteName: "Meridian Dahej Plant — Unit II",
      city: "Dahej",
      district: "Bharuch",
      state: "Gujarat",
      pincode: "392130",
      startDate: mouldChangeStart,
      durationType: "LONG",
      durationMonths: 24,
      shift: "ROTATING",
      urgency: "NORMAL",
      ppeProvided: true,
      transportProvided: true,
      preferredRateBasis: "PER_UNIT",
      indicativeBudget: 2400,
      expiresAt: postingExpiryFrom("NORMAL", mouldChangeStart),
    },
  });

  const fittersStart = new Date(Date.now() + 14 * 86400_000);
  const fitters = await prisma.requirement.create({
    data: {
      companyId: steel.companyProfile!.id,
      category: CATEGORY.BLUE_COLLAR,
      title: "Maintenance fitters & welders — rolling mill",
      industry: "steel",
      description:
        "Rolling mill maintenance team required on a three-shift rotation. Candidates must have worked in a hot rolling environment and be comfortable with hydraulic and mechanical assemblies. ITI with relevant trade certification is mandatory.",
      siteName: "Bhilai Special Steels — Mill 2",
      city: "Bhilai",
      district: "Durg",
      state: "Chhattisgarh",
      pincode: "490001",
      startDate: fittersStart,
      durationType: "ONGOING",
      durationMonths: 12,
      shift: "ROTATING",
      urgency: "URGENT",
      accommodationProvided: true,
      foodProvided: true,
      ppeProvided: true,
      preferredRateBasis: "PER_PERSON_MONTH",
      indicativeBudget: 26000,
      expiresAt: postingExpiryFrom("URGENT", fittersStart),
      roles: {
        create: [
          { role: "fitter", headcount: 18, experienceBand: "2_5", qualification: "ITI", indicativeWage: 26000 },
          { role: "welder", headcount: 10, experienceBand: "2_5", qualification: "ITI", indicativeWage: 27000 },
          {
            role: "rigger",
            headcount: 6,
            experienceBand: "5_10",
            indicativeWage: 24000,
            notes: "Must hold a valid rigging certification",
          },
        ],
      },
    },
  });

  const engineersStart = new Date(Date.now() + 45 * 86400_000);
  await prisma.requirement.create({
    data: {
      companyId: steel.companyProfile!.id,
      category: CATEGORY.WHITE_COLLAR,
      title: "Production & safety engineers on term contract",
      industry: "steel",
      description:
        "Engineers required on a 12-month renewable term contract, deployed against our plant establishment and reporting to the respective section heads. Contractor manages payroll and full statutory compliance.",
      siteName: "Bhilai Special Steels",
      city: "Bhilai",
      state: "Chhattisgarh",
      startDate: engineersStart,
      durationType: "LONG",
      durationMonths: 12,
      shift: "GENERAL",
      urgency: "PLANNED",
      preferredRateBasis: "PER_PERSON_MONTH",
      indicativeBudget: 62000,
      expiresAt: postingExpiryFrom("PLANNED", engineersStart),
      roles: {
        create: [
          {
            role: "production_engineer",
            headcount: 4,
            experienceBand: "2_5",
            qualification: "ENGINEERING",
            indicativeWage: 62000,
          },
          {
            role: "safety_officer",
            headcount: 2,
            experienceBand: "5_10",
            qualification: "DIPLOMA",
            indicativeWage: 55000,
            notes: "Must hold an ADIS or equivalent safety diploma",
          },
        ],
      },
    },
  });

  const helpersStart = new Date(Date.now() + 10 * 86400_000);
  await prisma.requirement.create({
    data: {
      companyId: tyre.companyProfile!.id,
      category: CATEGORY.UNSKILLED,
      title: "Production helpers for curing & finishing section",
      industry: "tyre",
      description:
        "Helpers to assist machine operators across curing and final finishing. No prior plant experience required — training is provided in the first week. Physically demanding work in a hot environment.",
      siteName: "Meridian Dahej Plant",
      city: "Dahej",
      state: "Gujarat",
      startDate: helpersStart,
      durationType: "MEDIUM",
      durationMonths: 6,
      shift: "ROTATING",
      urgency: "NORMAL",
      accommodationProvided: true,
      foodProvided: true,
      ppeProvided: true,
      preferredRateBasis: "PER_PERSON_MONTH",
      indicativeBudget: 17500,
      expiresAt: postingExpiryFrom("NORMAL", helpersStart),
      roles: {
        create: [
          {
            role: "machine_helper",
            headcount: 40,
            experienceBand: "FRESHER",
            qualification: "SSC",
            indicativeWage: 17500,
          },
          { role: "packing_helper", headcount: 25, experienceBand: "FRESHER", indicativeWage: 17000 },
        ],
      },
    },
  });

  // The warehouse tonnage contract — the other output-based example.
  const warehouseStart = new Date(Date.now() + 21 * 86400_000);
  await prisma.requirement.create({
    data: {
      companyId: warehouse.companyProfile!.id,
      category: CATEGORY.JOB_CONTRACT,
      title: "Warehouse loading & unloading — 300 T/day",
      industry: "warehousing",
      scopeKey: "loading_unloading",
      description:
        "Loading and unloading of FMCG cartons and palletised stock at our Bhiwandi distribution centre, averaging 300 tonnes per day. Volumes swing sharply with the season — the contractor scales manpower up and down as dispatch load dictates, which is precisely why this is on a tonnage basis rather than a fixed headcount.\n\nHydraulic pallet trucks and dock levellers are provided. Contractor provides supervision and manpower.",
      outputQuantity: 300,
      outputUnit: "tonne",
      outputPeriod: "per day",
      deliverables:
        "Dock turnaround within 90 minutes per vehicle. Damage below 0.2% of cartons handled. Daily tonnage reconciliation signed off with the shift supervisor.",
      siteName: "Northbound DC — Bhiwandi",
      city: "Bhiwandi",
      district: "Thane",
      state: "Maharashtra",
      pincode: "421302",
      startDate: warehouseStart,
      durationType: "ONGOING",
      durationMonths: 36,
      shift: "ROTATING",
      urgency: "NORMAL",
      ppeProvided: true,
      preferredRateBasis: "PER_TONNE",
      indicativeBudget: 180,
      expiresAt: postingExpiryFrom("NORMAL", warehouseStart),
    },
  });

  // ---------------------------------------------------------------------
  // Proposals — note the shape difference between the two models
  // ---------------------------------------------------------------------

  // Job contract: quoted per unit, with NO headcount commitment.
  await prisma.proposal.create({
    data: {
      requirementId: mouldChange.id,
      contractorId: specialist.contractorProfile!.id,
      rateBasis: "PER_UNIT",
      rateAmount: 2250,
      indicativeCrewSize: 24,
      mobilizationDays: 5,
      validityDays: 45,
      coverNote:
        "We run exactly this scope for Yokohama at Dahej and Visakhapatnam — 300 manpower between the two sites. Our rate is inclusive of tooling, supervision, PF/ESI and a dedicated safety officer per shift. It excludes press spares and hydraulic consumables.\n\nWe would deploy around 24 people per shift to begin with and tune from there; the rate stands regardless.",
    },
  });

  await prisma.proposal.create({
    data: {
      requirementId: mouldChange.id,
      contractorId: regional.contractorProfile!.id,
      rateBasis: "PER_UNIT",
      rateAmount: 1980,
      indicativeCrewSize: 30,
      mobilizationDays: 12,
      validityDays: 30,
      status: "SHORTLISTED",
      coverNote:
        "We have not worked in tyre specifically, but run comparable changeover work in cement packing plants. Willing to bring a supervisor from our Raigarh team for the first three months.",
    },
  });

  // Staffing: quoted per person per month, WITH a headcount commitment.
  await prisma.proposal.create({
    data: {
      requirementId: fitters.id,
      contractorId: regional.contractorProfile!.id,
      rateBasis: "PER_PERSON_MONTH",
      rateAmount: 25400,
      headcountOffered: 34,
      mobilizationDays: 3,
      validityDays: 30,
      coverNote:
        "All 34 available from our Bhilai and Raipur bench — we already run 95 fabrication tradesmen at Bhilai Engineering, so mobilisation is local and immediate. The rate is all-inclusive of PF, ESI, bonus and leave wages. Statutory returns are filed monthly with copies to your IR desk.",
    },
  });

  await prisma.proposal.create({
    data: {
      requirementId: fitters.id,
      contractorId: staffing.contractorProfile!.id,
      rateBasis: "PER_PERSON_MONTH",
      rateAmount: 28800,
      headcountOffered: 20,
      mobilizationDays: 21,
      validityDays: 30,
      coverNote:
        "We can cover 20 of the 34 from our southern bench. Candidates would need accommodation and a mobilisation window of three weeks.",
    },
  });

  // ---------------------------------------------------------------------
  // A completed engagement with a full five-parameter review, so the
  // specialist's public profile carries real ratings.
  // ---------------------------------------------------------------------
  const pastRequirement = await prisma.requirement.create({
    data: {
      companyId: tyre.companyProfile!.id,
      category: CATEGORY.JOB_CONTRACT,
      title: "Curing press annual shutdown — 2025 campaign",
      industry: "tyre",
      scopeKey: "shutdown_maintenance",
      description: "Fourteen-day annual shutdown across the curing hall.",
      city: "Dahej",
      state: "Gujarat",
      status: "AWARDED",
      urgency: "NORMAL",
      durationType: "SHORT",
      durationMonths: 1,
      preferredRateBasis: "LUMPSUM_PROJECT",
    },
  });

  const pastProposal = await prisma.proposal.create({
    data: {
      requirementId: pastRequirement.id,
      contractorId: specialist.contractorProfile!.id,
      rateBasis: "LUMPSUM_PROJECT",
      rateAmount: 4200000,
      indicativeCrewSize: 60,
      mobilizationDays: 7,
      validityDays: 30,
      status: "ACCEPTED",
      coverNote: "Turnkey shutdown execution with our own rigging and tooling.",
    },
  });

  const pastEngagement = await prisma.engagement.create({
    data: {
      requirementId: pastRequirement.id,
      companyId: tyre.companyProfile!.id,
      contractorId: specialist.contractorProfile!.id,
      proposalId: pastProposal.id,
      status: "COMPLETED",
      rateBasis: "LUMPSUM_PROJECT",
      rateAmount: 4200000,
      estimatedValue: 4200000,
      startedAt: new Date(Date.now() - 120 * 86400_000),
      completedAt: new Date(Date.now() - 100 * 86400_000),
      companyRating: 5,
    },
  });

  const scores = {
    deployment: 5,
    compliance: 5,
    workerPayment: 4,
    manpowerQuality: 5,
    responsiveness: 4,
  };
  const overall =
    Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;

  await prisma.contractorReview.create({
    data: {
      engagementId: pastEngagement.id,
      contractorId: specialist.contractorProfile!.id,
      companyId: tyre.companyProfile!.id,
      ...scores,
      overall,
      comment:
        "Shutdown closed two days ahead of schedule with no safety incident, and statutory documentation was in order without being chased. Wage disbursement to their own workers slipped by a few days in the final month, which is the only reason this is not a clean five.",
    },
  });

  await prisma.contractorProfile.update({
    where: { id: specialist.contractorProfile!.id },
    data: {
      rating: overall,
      ratingCount: 1,
      ratingDeployment: scores.deployment,
      ratingCompliance: scores.compliance,
      ratingWorkerPayment: scores.workerPayment,
      ratingManpowerQuality: scores.manpowerQuality,
      ratingResponsiveness: scores.responsiveness,
    },
  });

  // An outstanding invitation, so the contractor dashboard shows that flow.
  await prisma.requirementInvite.create({
    data: {
      requirementId: mouldChange.id,
      contractorId: staffing.contractorProfile!.id,
      message:
        "We know this is outside your usual scope, but you support our Hosur machine shop well. Would you be able to quote?",
    },
  });

  await prisma.notification.create({
    data: {
      userId: tyre.id,
      type: "PROPOSAL_RECEIVED",
      body: `Navya Industrial Services submitted a proposal for "${mouldChange.title}".`,
      link: `/company/requirements/${mouldChange.id}`,
    },
  });

  console.log("\n  WorkForge demo data seeded.\n");
  console.log("  Verification console — sign in at /admin/login");
  console.log(`    username: ${adminUsername}   (or ${adminEmail})`);
  console.log(`    password: ${adminPassword}`);
  console.log("    role:     SUPER_ADMIN (can manage the admin team)\n");
  console.log("  Marketplace accounts — sign in at /login (all share one password):");
  console.log("    rajesh@meridiantyres.in           company — tyre plant, Gujarat");
  console.log("    anita@bhilaispecialsteels.in      company — steel plant, Chhattisgarh");
  console.log("    faisal@northboundlogistics.in     company — warehousing, Maharashtra");
  console.log("    vikram@navyaindustrial.in         contractor — tyre specialist");
  console.log("    suresh@shaktimanpower.in          contractor — central India");
  console.log("    priya@axiomtechnicalstaffing.in   contractor — technical staffing");
  console.log("    imran@unifiedworkforce.in         contractor — awaiting approval");
  console.log(`\n             password: ${demoPassword}\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
