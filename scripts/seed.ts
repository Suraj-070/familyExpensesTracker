import { PrismaClient } from '@prisma/client'
import { createHash, randomBytes, createHmac } from 'crypto'

const db = new PrismaClient()
const SECRET = 'family-expense-tracker-secret-key-2024'

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = createHash('sha256').update(password + salt).digest('hex')
  return `${salt}:${hash}`
}

function generateToken(payload: { userId: string; email: string; familyId?: string }): string {
  const data = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url')
  const sig = createHmac('sha256', SECRET).update(data).digest('base64url')
  return `${data}.${sig}`
}

const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: 'utensils', color: '#f97316' },
  { name: 'Kitchen', icon: 'cooking-pot', color: '#8b5cf6' },
  { name: 'House Rent', icon: 'home', color: '#3b82f6' },
  { name: 'Electricity', icon: 'zap', color: '#eab308' },
  { name: 'Water', icon: 'droplets', color: '#06b6d4' },
  { name: 'Internet', icon: 'wifi', color: '#10b981' },
  { name: 'School', icon: 'graduation-cap', color: '#6366f1' },
  { name: 'Stationary', icon: 'pencil', color: '#ec4899' },
  { name: 'Medical', icon: 'heart-pulse', color: '#ef4444' },
  { name: 'Transportation', icon: 'car', color: '#f59e0b' },
  { name: 'Entertainment', icon: 'gamepad-2', color: '#14b8a6' },
  { name: 'Other', icon: 'tag', color: '#64748b' },
]

async function seed() {
  console.log('🌱 Seeding database...')

  // Clean up existing data
  await db.attachment.deleteMany()
  await db.activityLog.deleteMany()
  await db.notification.deleteMany()
  await db.expense.deleteMany()
  await db.recurringExpense.deleteMany()
  await db.permission.deleteMany()
  await db.category.deleteMany()
  await db.familyMember.deleteMany()
  await db.family.deleteMany()
  await db.user.deleteMany()

  console.log('  Cleaned existing data')

  // Create users
  const user1 = await db.user.create({
    data: {
      name: 'John Doe',
      email: 'john@demo.com',
      password: hashPassword('password123'),
    },
  })

  const user2 = await db.user.create({
    data: {
      name: 'Jane Doe',
      email: 'jane@demo.com',
      password: hashPassword('password123'),
    },
  })

  const user3 = await db.user.create({
    data: {
      name: 'Bob Smith',
      email: 'bob@demo.com',
      password: hashPassword('password123'),
    },
  })

  console.log(`  Created ${3} users`)

  // Create family
  const inviteCode = randomBytes(6).toString('hex').toUpperCase()
  const family = await db.family.create({
    data: {
      name: 'Doe Family',
      inviteCode,
      createdBy: user1.id,
    },
  })

  // Add members
  await db.familyMember.create({
    data: { familyId: family.id, userId: user1.id, role: 'admin' },
  })
  await db.familyMember.create({
    data: { familyId: family.id, userId: user2.id, role: 'member' },
  })
  await db.familyMember.create({
    data: { familyId: family.id, userId: user3.id, role: 'member' },
  })

  console.log(`  Created family "${family.name}" with invite code: ${inviteCode}`)

  // Create default categories
  const categories = await Promise.all(
    DEFAULT_CATEGORIES.map(c =>
      db.category.create({
        data: { ...c, familyId: family.id, isDefault: true },
      })
    )
  )
  console.log(`  Created ${categories.length} categories`)

  // Create permissions
  await db.permission.create({
    data: {
      familyId: family.id,
      role: 'admin',
      canAddExpense: true, canEditOwnExpense: true, canEditAllExpenses: true,
      canDeleteExpense: true, canUploadAttachment: true, canManageCategories: true,
      canManageRecurring: true, canViewReports: true, canManageSettings: true,
      canInviteMembers: true, canRemoveMembers: true,
    },
  })
  await db.permission.create({
    data: {
      familyId: family.id,
      role: 'member',
      canAddExpense: true, canEditOwnExpense: true, canEditAllExpenses: false,
      canDeleteExpense: false, canUploadAttachment: true, canManageCategories: false,
      canManageRecurring: false, canViewReports: true, canManageSettings: false,
      canInviteMembers: false, canRemoveMembers: false,
    },
  })

  // Create sample expenses for the last 3 months
  const now = new Date()
  const sampleExpenses = [
    // This month
    { title: 'Groceries', amount: 120.50, categoryId: categories[0].id, whoPaidId: user1.id, addedById: user1.id, paidStatus: 'paid', daysAgo: 2 },
    { title: 'Electricity Bill', amount: 85.00, categoryId: categories[3].id, whoPaidId: user2.id, addedById: user1.id, paidStatus: 'unpaid', daysAgo: 5 },
    { title: 'Internet Bill', amount: 49.99, categoryId: categories[5].id, whoPaidId: user1.id, addedById: user2.id, paidStatus: 'paid', daysAgo: 7 },
    { title: 'School Fees', amount: 250.00, categoryId: categories[6].id, whoPaidId: user1.id, addedById: user1.id, paidStatus: 'unpaid', daysAgo: 10 },
    { title: 'Gas Station', amount: 65.00, categoryId: categories[9].id, whoPaidId: user3.id, addedById: user3.id, paidStatus: 'paid', daysAgo: 1 },
    { title: 'Restaurant Dinner', amount: 78.50, categoryId: categories[0].id, whoPaidId: user2.id, addedById: user2.id, paidStatus: 'paid', daysAgo: 3 },
    { title: 'Medical Checkup', amount: 150.00, categoryId: categories[8].id, whoPaidId: user1.id, addedById: user2.id, paidStatus: 'unpaid', daysAgo: 8 },
    { title: 'Movie Tickets', amount: 45.00, categoryId: categories[10].id, whoPaidId: user3.id, addedById: user3.id, paidStatus: 'paid', daysAgo: 4 },
    // Last month
    { title: 'House Rent', amount: 1500.00, categoryId: categories[2].id, whoPaidId: user1.id, addedById: user1.id, paidStatus: 'paid', daysAgo: 35 },
    { title: 'Groceries', amount: 98.75, categoryId: categories[0].id, whoPaidId: user2.id, addedById: user1.id, paidStatus: 'paid', daysAgo: 40 },
    { title: 'Water Bill', amount: 35.00, categoryId: categories[4].id, whoPaidId: user1.id, addedById: user1.id, paidStatus: 'paid', daysAgo: 38 },
    { title: 'School Books', amount: 42.00, categoryId: categories[7].id, whoPaidId: user2.id, addedById: user2.id, paidStatus: 'paid', daysAgo: 45 },
    { title: 'Pharmacy', amount: 28.50, categoryId: categories[8].id, whoPaidId: user3.id, addedById: user1.id, paidStatus: 'paid', daysAgo: 33 },
    // 2 months ago
    { title: 'House Rent', amount: 1500.00, categoryId: categories[2].id, whoPaidId: user1.id, addedById: user1.id, paidStatus: 'paid', daysAgo: 65 },
    { title: 'Groceries', amount: 135.20, categoryId: categories[0].id, whoPaidId: user1.id, addedById: user1.id, paidStatus: 'paid', daysAgo: 70 },
    { title: 'Electricity Bill', amount: 92.00, categoryId: categories[3].id, whoPaidId: user2.id, addedById: user2.id, paidStatus: 'paid', daysAgo: 68 },
    { title: 'Internet Bill', amount: 49.99, categoryId: categories[5].id, whoPaidId: user1.id, addedById: user1.id, paidStatus: 'paid', daysAgo: 72 },
  ]

  for (const exp of sampleExpenses) {
    const expenseDate = new Date(now)
    expenseDate.setDate(expenseDate.getDate() - exp.daysAgo)

    await db.expense.create({
      data: {
        title: exp.title,
        amount: exp.amount,
        categoryId: exp.categoryId,
        whoPaidId: exp.whoPaidId,
        addedById: exp.addedById,
        familyId: family.id,
        paidStatus: exp.paidStatus,
        paidDate: exp.paidStatus === 'paid' ? expenseDate : null,
        expenseDate,
      },
    })
  }

  console.log(`  Created ${sampleExpenses.length} sample expenses`)

  // Create recurring expenses
  await db.recurringExpense.create({
    data: {
      familyId: family.id,
      categoryId: categories[2].id,
      title: 'Monthly Rent',
      amount: 1500.00,
      frequency: 'monthly',
      startDate: new Date(now.getFullYear(), now.getMonth() - 3, 1),
      nextDueDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      createdBy: user1.id,
    },
  })

  await db.recurringExpense.create({
    data: {
      familyId: family.id,
      categoryId: categories[5].id,
      title: 'Internet Subscription',
      amount: 49.99,
      frequency: 'monthly',
      startDate: new Date(now.getFullYear(), now.getMonth() - 6, 15),
      nextDueDate: new Date(now.getFullYear(), now.getMonth() + 1, 15),
      createdBy: user1.id,
    },
  })

  console.log('  Created 2 recurring expenses')

  // Create activity logs
  await db.activityLog.create({
    data: {
      familyId: family.id,
      userId: user1.id,
      action: 'family_created',
      details: 'Family "Doe Family" was created',
    },
  })

  console.log('  Created activity logs')

  // Generate tokens
  const token1 = generateToken({ userId: user1.id, email: user1.email, familyId: family.id })
  const token2 = generateToken({ userId: user2.id, email: user2.email, familyId: family.id })
  const token3 = generateToken({ userId: user3.id, email: user3.email, familyId: family.id })

  console.log('\n✅ Seed complete!')
  console.log('\n--- Demo Credentials ---')
  console.log(`Admin:  john@demo.com / password123`)
  console.log(`Member: jane@demo.com / password123`)
  console.log(`Member: bob@demo.com / password123`)
  console.log(`\nFamily: ${family.name} (Invite Code: ${inviteCode})`)
  console.log(`\n--- Auth Tokens ---`)
  console.log(`\nJohn (admin): ${token1.substring(0, 30)}...`)
  console.log(`Jane (member): ${token2.substring(0, 30)}...`)
  console.log(`Bob (member): ${token3.substring(0, 30)}...`)
  console.log(`\n--- API Usage ---`)
  console.log(`\nLogin: POST /api/auth { action: "login", email: "john@demo.com", password: "password123" }`)
  console.log(`\nAll tokens (for testing):`)
  console.log(token1)
  console.log(token2)
  console.log(token3)
}

seed()
  .then(() => db.$disconnect())
  .catch(e => {
    console.error(e)
    db.$disconnect()
    process.exit(1)
  })
