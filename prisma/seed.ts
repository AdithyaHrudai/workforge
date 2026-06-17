import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const pwd = await bcrypt.hash("Demo@12345", 10);
  const adminPwd = await bcrypt.hash("Admin@12345", 10);

  // Reset (idempotent dev seed)
  await prisma.message.deleteMany();
  await prisma.engagement.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.jobLine.deleteMany();
  await prisma.job.deleteMany();
  await prisma.worker.deleteMany();
  await prisma.document.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.contractorProfile.deleteMany();
  await prisma.companyProfile.deleteMany();
  await prisma.user.deleteMany();

  await prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, platformName: "ShramSetu", platformFeePercent: 3, paymentsEnabled: false },
  });

  // --- Admin ---
  await prisma.user.create({
    data: {
      role: "ADMIN",
      name: "Platform Admin",
      email: "admin@shramsetu.in",
      mobile: "9000000000",
      mobileVerified: true,
      passwordHash: adminPwd,
    },
  });

  // --- Company (your dad's org) ---
  const company = await prisma.user.create({
    data: {
      role: "COMPANY",
      name: "Ravi Kumar",
      email: "company@demo.in",
      mobile: "9876500001",
      mobileVerified: true,
      passwordHash: pwd,
      companyProfile: {
        create: {
          companyName: "Greenfield Projects Ltd",
          entityType: "Pvt Ltd",
          industry: "EPC / Infrastructure",
          contactName: "Ravi Kumar",
          contactMobile: "9876500001",
          contactEmail: "company@demo.in",
          city: "Visakhapatnam",
          district: "Visakhapatnam",
          state: "Andhra Pradesh",
          pincode: "530012",
          gstin: "37ABCDE1234F1Z5",
          about: "Greenfield industrial and infrastructure sites across coastal Andhra.",
          verified: true,
          status: "APPROVED",
        },
      },
    },
    include: { companyProfile: true },
  });

  // --- Contractor 1 (approved + verified) ---
  const c1 = await prisma.user.create({
    data: {
      role: "CONTRACTOR",
      name: "Suresh Babu",
      email: "contractor@demo.in",
      mobile: "9876500002",
      mobileVerified: true,
      passwordHash: pwd,
      contractorProfile: {
        create: {
          firmName: "Sri Venkateswara Labour Suppliers",
          entityType: "Proprietorship",
          ownerName: "Suresh Babu",
          yearEstablished: 2014,
          address: "Gajuwaka",
          city: "Visakhapatnam",
          district: "Visakhapatnam",
          state: "Andhra Pradesh",
          pincode: "530026",
          serviceAreas: "Visakhapatnam, Anakapalle, Andhra Pradesh",
          willingOutstation: true,
          pan: "ABCDE1234F",
          gstin: "37ABCDE1234F1Z5",
          labourLicenceNo: "CLRA/AP/2019/00123",
          esicNo: "53000123450000999",
          epfNo: "APVSK0012345000",
          trades: JSON.stringify(["mason", "bar_bender", "shuttering_carpenter", "helper"]),
          totalWorkforce: 120,
          available: 60,
          mobilizationDays: 3,
          about: "Civil manpower for RCC, formwork and finishing. 120+ workers on roll.",
          rating: 4.5,
          ratingCount: 12,
          verified: true,
          status: "APPROVED",
        },
      },
    },
    include: { contractorProfile: true },
  });

  // --- Contractor 2 (approved + verified, electrical/mechanical) ---
  const c2 = await prisma.user.create({
    data: {
      role: "CONTRACTOR",
      name: "Lakshmi Narayana",
      email: "contractor2@demo.in",
      mobile: "9876500003",
      mobileVerified: true,
      passwordHash: pwd,
      contractorProfile: {
        create: {
          firmName: "Coastal Mechanical & Electrical Services",
          entityType: "Partnership",
          ownerName: "Lakshmi Narayana",
          yearEstablished: 2017,
          city: "Kakinada",
          district: "Kakinada",
          state: "Andhra Pradesh",
          pincode: "533001",
          serviceAreas: "Kakinada, Rajahmundry, Visakhapatnam, Andhra Pradesh",
          willingOutstation: true,
          pan: "PQRST5678K",
          labourLicenceNo: "CLRA/AP/2020/00456",
          trades: JSON.stringify(["electrician", "welder", "fitter", "helper"]),
          totalWorkforce: 80,
          available: 35,
          mobilizationDays: 5,
          about: "Skilled electrical & mechanical manpower for plant and EPC works.",
          rating: 4.2,
          ratingCount: 7,
          verified: true,
          status: "APPROVED",
        },
      },
    },
    include: { contractorProfile: true },
  });

  // --- Contractor 3 (PENDING — for admin moderation demo) ---
  await prisma.user.create({
    data: {
      role: "CONTRACTOR",
      name: "Mohan Rao",
      email: "contractor3@demo.in",
      mobile: "9876500004",
      mobileVerified: true,
      passwordHash: pwd,
      contractorProfile: {
        create: {
          firmName: "Godavari Manpower Co.",
          entityType: "Proprietorship",
          ownerName: "Mohan Rao",
          city: "Rajahmundry",
          state: "Andhra Pradesh",
          serviceAreas: "Rajahmundry, Andhra Pradesh",
          trades: JSON.stringify(["scaffolder", "painter", "helper"]),
          totalWorkforce: 40,
          available: 40,
          mobilizationDays: 4,
          about: "Scaffolding and finishing crews.",
          status: "PENDING",
        },
      },
    },
  });

  // Workers under contractor 1
  await prisma.worker.createMany({
    data: [
      { contractorId: c1.contractorProfile!.id, name: "Ramesh", gender: "M", age: 32, trade: "mason", skillLevel: "SKILLED", yearsExperience: 10, nativeState: "Andhra Pradesh", expectedDailyWage: 750 },
      { contractorId: c1.contractorProfile!.id, name: "Naidu", gender: "M", age: 28, trade: "bar_bender", skillLevel: "SKILLED", yearsExperience: 6, nativeState: "Andhra Pradesh", expectedDailyWage: 700 },
      { contractorId: c1.contractorProfile!.id, name: "Kishore", gender: "M", age: 24, trade: "helper", skillLevel: "UNSKILLED", yearsExperience: 3, nativeState: "Odisha", expectedDailyWage: 500 },
    ],
  });

  // Jobs from the company
  const job1 = await prisma.job.create({
    data: {
      companyId: company.companyProfile!.id,
      title: "RCC crew for plant foundation works — Visakhapatnam",
      description:
        "Need masons, bar benders and helpers for foundation & RCC works at a greenfield plant site. Site induction & PPE mandatory.",
      city: "Visakhapatnam",
      district: "Visakhapatnam",
      state: "Andhra Pradesh",
      pincode: "530012",
      startDate: new Date(Date.now() + 7 * 86400000),
      durationDays: 90,
      shift: "DAY",
      accommodationProvided: true,
      foodProvided: false,
      urgency: "URGENT",
      wageOffered: 750,
      lines: {
        create: [
          { trade: "mason", headcount: 15, skillLevel: "SKILLED", wageOffered: 800 },
          { trade: "bar_bender", headcount: 10, skillLevel: "SKILLED", wageOffered: 750 },
          { trade: "helper", headcount: 20, skillLevel: "UNSKILLED", wageOffered: 550 },
        ],
      },
    },
  });

  const job2 = await prisma.job.create({
    data: {
      companyId: company.companyProfile!.id,
      title: "Electricians & welders for plant erection — Kakinada",
      description: "Mechanical & electrical manpower for equipment erection and cabling.",
      city: "Kakinada",
      district: "Kakinada",
      state: "Andhra Pradesh",
      startDate: new Date(Date.now() + 14 * 86400000),
      durationDays: 60,
      shift: "ROTATING",
      accommodationProvided: true,
      foodProvided: true,
      urgency: "NORMAL",
      wageOffered: 900,
      lines: {
        create: [
          { trade: "electrician", headcount: 8, skillLevel: "SKILLED", wageOffered: 950 },
          { trade: "welder", headcount: 6, skillLevel: "SKILLED", wageOffered: 1000 },
          { trade: "helper", headcount: 10, skillLevel: "UNSKILLED", wageOffered: 550 },
        ],
      },
    },
  });

  // A sample bid from contractor 1 on job 1 (so company has something to review/accept)
  await prisma.bid.create({
    data: {
      jobId: job1.id,
      contractorId: c1.contractorProfile!.id,
      ratePerWorkerPerDay: 780,
      headcountOffered: 40,
      mobilizationDays: 3,
      notes: "Can mobilise masons & helpers within 3 days. Bar benders by day 5.",
      status: "SUBMITTED",
    },
  });

  // An accepted bid from contractor 2 on job 2 → an active engagement with a live chat.
  const acceptedBid = await prisma.bid.create({
    data: {
      jobId: job2.id,
      contractorId: c2.contractorProfile!.id,
      ratePerWorkerPerDay: 980,
      headcountOffered: 24,
      mobilizationDays: 5,
      notes: "Skilled electricians and welders available. Helpers from local pool.",
      status: "ACCEPTED",
    },
  });

  const duration = 60;
  const estimatedValue = 980 * 24 * duration;
  const engagement = await prisma.engagement.create({
    data: {
      jobId: job2.id,
      companyId: company.companyProfile!.id,
      contractorId: c2.contractorProfile!.id,
      bidId: acceptedBid.id,
      platformFeePercent: 3,
      estimatedValue,
      estimatedFee: Math.round((estimatedValue * 3) / 100),
    },
  });

  await prisma.message.createMany({
    data: [
      { engagementId: engagement.id, senderId: company.id, body: "Welcome aboard. Can your crew start by the 20th?", createdAt: new Date(Date.now() - 3600_000) },
      { engagementId: engagement.id, senderId: c2.id, body: "Yes sir. 8 electricians and 6 welders confirmed, helpers from local pool.", createdAt: new Date(Date.now() - 1800_000) },
      { engagementId: engagement.id, senderId: company.id, body: "Great. Please share PPE sizes and IDs for gate passes.", createdAt: new Date(Date.now() - 600_000) },
    ],
  });

  console.log("Seed complete.");
  console.log("  Admin:      admin@shramsetu.in / Admin@12345");
  console.log("  Company:    company@demo.in / Demo@12345");
  console.log("  Contractor: contractor@demo.in / Demo@12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
