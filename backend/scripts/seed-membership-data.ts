import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedMembershipData() {
  try {
    console.log('🌱 Starting membership data seeding...');

    // Get the demo tenant
    const tenant = await prisma.tenant.findFirst({
      where: { subdomain: 'otico-demo' }
    });

    if (!tenant) {
      console.error('❌ Tenant not found. Please create a tenant first.');
      return;
    }

    console.log(`✅ Using tenant: ${tenant.name}`);

    // Enable membership module
    await prisma.tenantSettings.upsert({
      where: { tenantId: tenant.id },
      update: { membershipEnabled: true },
      create: {
        tenantId: tenant.id,
        membershipEnabled: true
      }
    });

    console.log('✅ Membership module enabled');

    // Create membership plans
    const plans = [
      {
        name: 'Basis Medlemskap',
        description: 'Perfekt for å komme i gang',
        price: 399,
        currency: 'NOK',
        interval: 'MONTHLY' as const,
        intervalCount: 1,
        trialDays: 14,
        features: ['Tilgang til treningssenter', 'Gratis introduksjonstime', 'Garderobe og dusj'],
        maxFreezes: 2,
        active: true,
        sortOrder: 1
      },
      {
        name: 'Premium Medlemskap',
        description: 'Alt du trenger for optimal trening',
        price: 599,
        currency: 'NOK',
        interval: 'MONTHLY' as const,
        intervalCount: 1,
        trialDays: 14,
        features: ['Alt i Basis', '2 PT-timer per måned', 'Tilgang til alle klasser', 'Ernæringsplan'],
        maxFreezes: 3,
        active: true,
        sortOrder: 2
      },
      {
        name: 'Elite Medlemskap',
        description: 'For den seriøse utøveren',
        price: 899,
        currency: 'NOK',
        interval: 'MONTHLY' as const,
        intervalCount: 1,
        trialDays: 14,
        features: ['Alt i Premium', '4 PT-timer per måned', 'Gratis treningsprogram', 'Prioritert booking'],
        maxFreezes: 4,
        active: true,
        sortOrder: 3
      },
      {
        name: 'Årskort',
        description: 'Spar penger med årlig binding',
        price: 3990,
        currency: 'NOK',
        interval: 'YEARLY' as const,
        intervalCount: 1,
        trialDays: 0,
        features: ['Alt i Premium', '2 måneder gratis', 'Gratis frysing', 'Familierabatt'],
        maxFreezes: 6,
        active: true,
        sortOrder: 4
      }
    ];

    const createdPlans = [];
    for (const plan of plans) {
      // Find existing or create new
      let created = await prisma.membershipPlan.findFirst({
        where: {
          tenantId: tenant.id,
          name: plan.name
        }
      });

      if (!created) {
        created = await prisma.membershipPlan.create({
          data: {
            ...plan,
            tenantId: tenant.id
          }
        });
      }

      createdPlans.push(created);
      console.log(`✅ Created plan: ${created.name}`);
    }

    // Get or create test users
    const users = await prisma.user.findMany({
      where: { tenantId: tenant.id, role: 'CUSTOMER' },
      take: 10
    });

    if (users.length === 0) {
      console.error('❌ No customer users found. Please create some users first.');
      return;
    }

    console.log(`✅ Found ${users.length} customer users`);

    // Create memberships for users
    const membershipStatuses = ['ACTIVE', 'FROZEN', 'CANCELLED', 'SUSPENDED', 'BLACKLISTED'];
    const now = new Date();

    for (let i = 0; i < users.length && i < 10; i++) {
      const user = users[i];
      const plan = createdPlans[i % createdPlans.length];
      const status = i < 5 ? 'ACTIVE' : membershipStatuses[i % membershipStatuses.length] as any;

      // Calculate dates
      const startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - Math.floor(Math.random() * 6)); // Started 0-6 months ago

      const endDate = status !== 'ACTIVE' ? new Date(startDate) : null;
      if (endDate && plan.interval === 'MONTHLY') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (endDate) {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const nextBillingDate = new Date(startDate);
      if (plan.interval === 'MONTHLY') {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      } else {
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      }

      // Create membership
      const membership = await prisma.membership.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          planId: plan.id,
          status,
          startDate,
          endDate,
          nextBillingDate: status === 'ACTIVE' ? nextBillingDate : null,
          autoRenew: status === 'ACTIVE',
          cancelledReason: status === 'CANCELLED' ? 'Moved to another city' : null,
          lastCheckInAt: status === 'ACTIVE' ? new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000) : null
        }
      });

      console.log(`✅ Created ${status} membership for ${user.firstName} ${user.lastName}`);

      // Create payment history
      const monthsSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
      for (let month = 0; month <= monthsSinceStart; month++) {
        const paymentDueDate = new Date(startDate);
        paymentDueDate.setMonth(paymentDueDate.getMonth() + month);

        let paymentStatus: 'PAID' | 'PENDING' | 'OVERDUE' | 'FAILED';
        let paidAt: Date | null = null;

        if (month < monthsSinceStart) {
          // Past payments
          if (Math.random() > 0.2) {
            // 80% paid
            paymentStatus = 'PAID';
            paidAt = new Date(paymentDueDate);
            paidAt.setDate(paidAt.getDate() + Math.floor(Math.random() * 5)); // Paid within 5 days
          } else {
            paymentStatus = 'FAILED';
          }
        } else {
          // Current month payment
          if (status === 'ACTIVE') {
            if (Math.random() > 0.3) {
              paymentStatus = 'PAID';
              paidAt = new Date(paymentDueDate);
            } else {
              paymentStatus = paymentDueDate < now ? 'OVERDUE' : 'PENDING';
            }
          } else {
            paymentStatus = 'FAILED';
          }
        }

        const payment = await prisma.membershipPayment.create({
          data: {
            tenantId: tenant.id,
            membershipId: membership.id,
            amount: plan.price,
            currency: plan.currency,
            status: paymentStatus,
            dueDate: paymentDueDate,
            paidAt,
            failureReason: paymentStatus === 'FAILED' ? 'Insufficient funds' : null,
            reminderCount: paymentStatus === 'OVERDUE' ? Math.floor(Math.random() * 3) : 0,
            lastReminderAt: paymentStatus === 'OVERDUE' ? new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000) : null
          }
        });

        // Create reminders for overdue payments
        if (paymentStatus === 'OVERDUE' && Math.random() > 0.3) {
          const reminderTypes: Array<'FIRST_REMINDER' | 'SECOND_REMINDER' | 'FINAL_REMINDER' | 'OVERDUE_NOTICE'> =
            ['FIRST_REMINDER', 'SECOND_REMINDER', 'FINAL_REMINDER'];
          const numReminders = Math.floor(Math.random() * 3) + 1;

          for (let r = 0; r < numReminders; r++) {
            await prisma.membershipReminder.create({
              data: {
                tenantId: tenant.id,
                paymentId: payment.id,
                userId: user.id,
                type: reminderTypes[r],
                method: 'EMAIL',
                message: `Din betaling på ${plan.price} NOK forfaller snart.`,
                sentAt: new Date(now.getTime() - (numReminders - r) * 7 * 24 * 60 * 60 * 1000)
              }
            });
          }
        }
      }

      // Create check-in history for active members
      if (status === 'ACTIVE') {
        const numCheckIns = Math.floor(Math.random() * 20) + 5; // 5-25 check-ins
        for (let c = 0; c < numCheckIns; c++) {
          const checkInDate = new Date(startDate.getTime() + Math.random() * (now.getTime() - startDate.getTime()));
          const checkOutDate = new Date(checkInDate);
          checkOutDate.setMinutes(checkOutDate.getMinutes() + 60 + Math.floor(Math.random() * 120)); // 1-3 hour workout

          await prisma.membershipCheckIn.create({
            data: {
              tenantId: tenant.id,
              userId: user.id,
              membershipId: membership.id,
              checkInTime: checkInDate,
              checkOutTime: Math.random() > 0.1 ? checkOutDate : null, // 10% still checked in (error case)
              location: 'Hovedsenter',
              notes: Math.random() > 0.8 ? 'Hadde en flott økt!' : null
            }
          });
        }
        console.log(`  ✅ Created ${numCheckIns} check-ins`);
      }

      // Create freeze history for some members
      if (Math.random() > 0.7) {
        const freezeStart = new Date(startDate);
        freezeStart.setMonth(freezeStart.getMonth() + Math.floor(Math.random() * 3) + 1);
        const freezeEnd = new Date(freezeStart);
        freezeEnd.setDate(freezeEnd.getDate() + 14); // 2 week freeze

        await prisma.membershipFreeze.create({
          data: {
            membershipId: membership.id,
            userId: user.id,
            startDate: freezeStart,
            endDate: freezeEnd,
            reason: 'Ferie'
          }
        });
        console.log(`  ✅ Created freeze period`);
      }
    }

    console.log('🎉 Membership data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding membership data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedMembershipData()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
