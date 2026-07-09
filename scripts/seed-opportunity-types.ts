// Volunteer portal build-out (#65)
// Seeds the OpportunityType table with the Dulles South Food Pantry
// opportunities mirrored from Bloomerang Volunteer.
//
// HOW TO USE:
// 1. Paste each opportunity's rendered content (not page source — Bloomerang
//    is an Angular SPA, view-source only shows the empty app shell) into the
//    `description` fields below.
// 2. Images: Bloomerang's image URLs are short-lived signed S3 links (expire
//    ~10 min after being generated) — a pasted URL will already be dead by
//    the time it's used. Save the actual files instead (right-click -> Save
//    Image As), named "<slug>-cover.<ext>" and "<slug>-icon.<ext>", then move
//    them into public/opportunities/. OpportunityType has ONE imageUrl field
//    (shown as the card's banner in OpportunityCard) — point it at the
//    "-cover" file; the "-icon" file can be kept in the same folder for
//    later use but isn't wired into the UI yet.
// 3. Fill in managerName/managerEmail per opportunity.
// 4. Run AFTER the schema migration has been applied:
//      npx tsx scripts/seed-opportunity-types.ts
//    (idempotent — upserts by slug, safe to re-run)

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface SeedType {
  name: string
  slug: string
  description: string
  imageUrl?: string
  managerName?: string
  managerEmail?: string
  managerPhone?: string
  kind?: 'shifts' | 'routes' | 'self-reported' | 'registration' // default 'shifts'
  maxConcurrentSignups?: number
  systemManaged?: boolean
  sortOrder: number
}

// TODO(#65): replace remaining placeholder descriptions with the real text
// pasted from the Bloomerang opportunity pages.
const OPPORTUNITY_TYPES: SeedType[] = [
  {
    // Ingested from Bloomerang 2026-07-08. Renamed to match Bloomerang's
    // exact title (was a placeholder guess: "Self-reported Service Hours").
    // The "how to log hours" steps were adapted for our own UI (Log Hours
    // button -> /volunteer/hours) since Bloomerang's steps reference its own
    // "hourglass icon" navigation, which doesn't exist in this app.
    name: 'Self Reported Volunteer Hours',
    slug: 'self-reported-volunteer-hours',
    description: `Report hours here for work done on behalf of the Pantry that is NOT associated with a scheduled shift. Please note in the comments what work was done. Examples of hours that should be reported here include:

• Additional family members who participate in a driver route pickup and are NOT the driver signed up for the shift. Please log 1 hour.

To log hours:
1. Tap "Log Hours" below.
2. Choose the date you worked.
3. Add the hours worked and a comment describing what you did to earn the hours.
4. Submit.

Please contact us at volunteer@dsfp.org if you have any questions.

Double the value of your volunteer time! Find out if your employer recognizes their employees' volunteer hours with a gift to the Dulles South Food Pantry. Check the tool on the volunteer page of our website for a list of companies that participate in "Volunteer Grant/Dollars for Doers" programs.`,
    imageUrl: '/opportunities/self-reported-volunteer-hours-cover.jpg',
    managerName: 'Andi Huppert',
    managerEmail: 'volunteer@dsfp.org',
    kind: 'self-reported',
    sortOrder: 1,
  },
  {
    // Ingested from Bloomerang 2026-07-08 (ongoing opportunity, tz America/New_York)
    name: 'Unlimited Onsite Volunteer Opportunities',
    slug: 'unlimited-onsite-volunteer-opportunities',
    imageUrl: '/opportunities/unlimited-onsite-volunteer-opportunities-cover.jpg',
    description: `Shifts listed on this page are onsite volunteer opportunities available for all registered volunteers.

A few things to remember when volunteering at DSFP:

• When signing up, every volunteer must sign up for a slot so we can best manage the workload. We want to ensure everyone volunteering has a good experience and that we have enough work to keep everyone busy!

• Volunteers between the ages of 10-13 will need to have a known adult volunteer signing up with them until they are 14. You must sign up for a slot for both the child and the adult.

• Please park in the paved lot and walk over to the Pantry building. We reserve the gravel lot for donation drop-offs.

• Volunteers will be on their feet for the entire shift. We recommend you wear closed toe shoes and bring reading glasses if needed.

• If you realize you can't make your shift, please remove yourself as soon as possible so that others can fill in. Please call or email us if you need to cancel within 24 hours of your shift so that we can actively try to fill the slot.

• Double the value of your volunteer time! Find out if your employer recognizes their employees' volunteer hours with a gift to the Dulles South Food Pantry. Check the tool on the volunteer page of our website for a list of companies that participate in "Volunteer Grant/Dollars for Doers" programs.`,
    managerName: 'Andi Huppert',
    // Same primary manager as Self Reported Volunteer Hours — reusing the
    // general volunteer inbox unless the org provides a different address.
    managerEmail: 'volunteer@dsfp.org',
    sortOrder: 2,
  },
  {
    // Ingested from Bloomerang 2026-07-08. Sibling of "Unlimited Onsite
    // Volunteer Opportunities" with the same house rules, minus the
    // closed-toe-shoes bullet, plus a per-volunteer signup cap ("No more
    // than 1 sign-up at a time") enforced via maxConcurrentSignups (65j).
    name: 'Limited Onsite Volunteer Opportunities',
    slug: 'limited-onsite-volunteer-opportunities',
    imageUrl: '/opportunities/limited-onsite-volunteer-opportunities-cover.jpg',
    description: `No more than 1 sign-up at a time for all shifts listed on this LIMITED Signup.

Shifts listed on this page are onsite volunteer opportunities available for all registered volunteers.

A few things to remember when volunteering at DSFP:

• When signing up, every volunteer must sign up for a slot so we can best manage the workload. We want to ensure everyone volunteering has a good experience and that we have enough work to keep everyone busy!

• Volunteers between the ages of 10-13 will need to have a known adult volunteer signing up with them until they are 14. You must sign up for a slot for both the child and the adult.

• Please park in the paved lot and walk over to the Pantry building. We reserve the gravel lot for donation drop-offs.

• If you realize you can't make your shift, please remove yourself as soon as possible so that others can fill in. Please call or email us if you need to cancel within 24 hours of your shift so that we can actively try to fill the slot.

• Double the value of your volunteer time! Find out if your employer recognizes their employees' volunteer hours with a gift to the Dulles South Food Pantry. Check the tool on the volunteer page of our website for a list of companies that participate in "Volunteer Grant/Dollars for Doers" programs.`,
    managerName: 'Andi Huppert',
    managerEmail: 'volunteer@dsfp.org',
    managerPhone: '703-507-2795 x0',
    maxConcurrentSignups: 1, // "No more than 1 sign-up at a time"
    sortOrder: 3,
  },
  {
    // Ingested from Bloomerang 2026-07-08. No shift signup on Bloomerang
    // (bags assembled at home, hours self-logged by anyone who
    // participates) -> kind 'self-reported' like the hours opportunity.
    // NOTE: body text names a second contact (info@dsfp.org) specifically
    // for requests to make MORE THAN 10 bags — kept in the description below
    // but managerEmail defaults to the same volunteer@dsfp.org as the other
    // Andi Huppert opportunities. Switch managerEmail via the admin edit
    // modal if the org wants Contact Manager routed to info@dsfp.org instead.
    name: 'Birthday Bags',
    slug: 'birthday-bags',
    imageUrl: '/opportunities/birthday-bags-cover.jpg',
    description: `Every child should feel special on their birthday! You can help make this happen by creating Birthday Bags for our guests whose children have upcoming birthdays. Each bag is filled with:

• cake mix
• frosting
• candles
• decorative plates, packaged
• napkins, packaged
• forks, packaged
• table cloths
• party favors (optional)

Please assemble the bags at home and bring them to the Pantry during donation hours. We recommend planning for a party of 8. We do love getting a variety of themes. Think of different ages and things they'd enjoy in a variety of boy and girl themes. We only give them out to children up to age 12.

Everyone with a DSFP volunteer account in Bloomerang who participates in creating the bags can log service hours.

If you would like to make more than 10 Birthday Bags, please reach out to us at info@dsfp.org.

Double the value of your volunteer time! Find out if your employer recognizes their employees' volunteer hours with a gift to the Dulles South Food Pantry. Check the tool on the volunteer page of our website for a list of companies that participate in "Volunteer Grant/Dollars for Doers" programs.`,
    managerName: 'Andi Huppert',
    managerEmail: 'volunteer@dsfp.org',
    kind: 'self-reported',
    sortOrder: 4,
  },
  {
    // Ingested from Bloomerang 2026-07-08. Confirmed as its own opportunity
    // (separate from "Unlimited Onsite Volunteer Opportunities") — has a
    // shift signup and an age restriction Unlimited Onsite doesn't have.
    name: 'Distribution',
    slug: 'distribution',
    imageUrl: '/opportunities/distribution-cover.jpg',
    description: `Thank you so much for helping your community by directly serving your neighbors during our distribution of food!

Some notes:

• You must be 18 or over and out of high school to serve at Distribution.
• Please don't sign up for more than one shift a week unless you see empty spots a few days before the distribution date.
• Please park at least half way down the middle row to leave the closest spots for our guests.
• Wear comfortable shoes and layers. You'll be on your feet the whole shift!
• Volunteers are active the entire shift and routinely lifting 15-20 pounds.

Need more information? Reach out to volunteer@dsfp.org.

Double the value of your volunteer time! Find out if your employer recognizes their employees' volunteer hours with a gift to the Dulles South Food Pantry. Check the tool on the volunteer page of our website for a list of companies that participate in "Volunteer Grant/Dollars for Doers" programs.`,
    managerName: 'Andi Huppert',
    managerEmail: 'volunteer@dsfp.org',
    sortOrder: 5,
  },
  {
    // Ingested from Bloomerang 2026-07-08. kind 'registration' (65j):
    // partner registers with contact info + planned delivery date, then
    // self-logs hours after drop-off (admin verifies in Hour Logs).
    name: 'Food Drive Signup',
    slug: 'food-drive-signup',
    imageUrl: '/opportunities/food-drive-signup-cover.jpg',
    description: `We rely on donations to provide food to our guests and we welcome community partners who'd like to help keep our shelves stocked! Please sign up if you'd like to support the Pantry with a food drive. For our planning purposes, you will be asked to provide contact information and schedule your planned delivery date.

Our normal Receiving Hours for donations are Monday, Wednesday and Saturday mornings from 10-11:30am. During holiday food drive season, additional Friday morning hours will be offered (October - December). We will attempt to accommodate alternate times if requested.

Donations are received at: 24757 Arcola Mills Drive, Dulles, Virginia 20166.

You can always find our latest Most Needed Items list on the Donate Food Page of our website or you can reach out to us at volunteer@dsfp.org if you'd like to inquire about specific items. You can also contact us if you'd like to borrow DSFP logo'd collection boxes or if you'd like to be sent a copy of our logo for use in your promotional materials.

All time spent working on the food drive (promotion, collection, sorting, delivery) can be submitted as volunteer hours served once your donation has been dropped off. We are happy to verify service hours that have been logged in our system.

Double the value of your volunteer time! Find out if your employer recognizes their employees' volunteer hours with a gift to the Dulles South Food Pantry. Check the tool on the volunteer page of our website for a list of companies that participate in "Volunteer Grant/Dollars for Doers" programs.`,
    managerName: 'Andi Huppert',
    managerEmail: 'volunteer@dsfp.org',
    managerPhone: '703-507-2795',
    kind: 'registration',
    sortOrder: 6,
  },
  {
    // Ingested from Bloomerang 2026-07-08. Same registration shape as
    // "Food Drive Signup". Distinct wrinkle: Bloomerang's instructions say
    // to register the event via info@dsfp.org, not volunteer@dsfp.org.
    name: 'Kit Packing Donations',
    slug: 'kit-packing-donations',
    imageUrl: '/opportunities/kit-packing-donations-cover.jpg',
    description: `We rely on donations to provide food to our guests and we welcome community partners who'd like to help keep our shelves stocked! Meal Kits are a great way for groups and organizations to hold an off-site event in support of the Pantry. Please sign up if you'd like to provide the Pantry with meal kits.

1. Gather a few individuals to manage a Meal Kit event and set a packing date.
2. Contact info@dsfp.org to register your event.
3. Gather donations in the theme of one of our Meal Kits. You could even create a competition to generate more donations!
4. Ask your company to kick in the funds to purchase the items you are short on.
5. Ask a store to donate bags to pack the kits into. Or, have participants donate bags from all their extras at home! Reusable are the most durable.
6. Collect all your items and create an assembly line.
7. Pack Meal Kit bags until you run out of items to make a full set (just bring the leftovers in and we'll stock our shelves with those).
8. Deliver them to us and know that you helped make a difference!

For our planning purposes, you will be asked to provide contact information and your planned delivery date. Our Receiving Hours for donations are Monday, Wednesday and Saturday mornings from 10-11:30am.

All time spent working on the meal kits (promotion, collection, packing, delivery) can be submitted as volunteer hours served once your donation has been dropped off. We are happy to verify service hours that have been logged in our system.

Double the value of your volunteer time! Find out if your employer recognizes their employees' volunteer hours with a gift to the Dulles South Food Pantry. Check the tool on the volunteer page of our website for a list of companies that participate in "Volunteer Grant/Dollars for Doers" programs.`,
    managerName: 'Andi Huppert',
    // NOTE: this opportunity's own instructions say to register the event
    // via info@dsfp.org, not volunteer@dsfp.org — consider setting
    // managerEmail to info@dsfp.org for this type specifically once
    // confirmed with the org (editable in the admin panel either way).
    managerEmail: 'volunteer@dsfp.org',
    managerPhone: '703-507-2795',
    kind: 'registration',
    sortOrder: 7,
  },
  {
    // Ingested from Bloomerang 2026-07-08. kind 'routes' + systemManaged
    // (65j): shifts are synced from the Route table (N routes on a date ->
    // one shift with N spots, unless an admin pre-set the count manually);
    // type is not deletable and kind is locked in the admin UI.
    // "Please take no more than 2 Saturday routes" stays informational card
    // text only (honor system) — day-of-week caps are not system-enforced.
    name: 'Driver Routes',
    slug: 'driver-routes',
    imageUrl: '/opportunities/driver-routes-cover.jpg',
    description: `Please take no more than 2 Saturday routes.

Our volunteer Drivers assist by picking up donations from community partners, delivering Backpack Buddies bags, and helping with our recycling efforts. If you have any questions about a route before signing up, please call or email us and we'll be happy to tell you more!

Some routes work best with a van or SUV and others may require lifting up to 40 lbs. Routes with those requirements are noted on the route signup.

Double the value of your volunteer time! Find out if your employer recognizes their employees' volunteer hours with a gift to the Dulles South Food Pantry. Check the tool on the volunteer page of our website for a list of companies that participate in "Volunteer Grant/Dollars for Doers" programs.`,
    managerName: 'Andi Huppert',
    managerEmail: 'volunteer@dsfp.org',
    managerPhone: '703-507-2795 x0',
    kind: 'routes',
    systemManaged: true,
    sortOrder: 8,
  },
  // TODO(#65): add the remaining opportunity types from Bloomerang
  // (one entry per card on the Dulles South Food Pantry profile).
]

async function main() {
  for (const type of OPPORTUNITY_TYPES) {
    const result = await prisma.opportunityType.upsert({
      where: { slug: type.slug },
      create: {
        name: type.name,
        slug: type.slug,
        description: type.description,
        imageUrl: type.imageUrl ?? null,
        managerName: type.managerName ?? null,
        managerEmail: type.managerEmail ?? null,
        managerPhone: type.managerPhone ?? null,
        kind: type.kind ?? 'shifts',
        maxConcurrentSignups: type.maxConcurrentSignups ?? null,
        systemManaged: type.systemManaged ?? false,
        sortOrder: type.sortOrder,
      },
      update: {
        name: type.name,
        description: type.description,
        imageUrl: type.imageUrl ?? null,
        managerName: type.managerName ?? null,
        managerEmail: type.managerEmail ?? null,
        managerPhone: type.managerPhone ?? null,
        kind: type.kind ?? 'shifts',
        maxConcurrentSignups: type.maxConcurrentSignups ?? null,
        systemManaged: type.systemManaged ?? false,
        sortOrder: type.sortOrder,
      },
    })
    console.log(`Upserted opportunity type: ${result.name} (id ${result.id})`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
