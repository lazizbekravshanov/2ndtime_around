/**
 * Seed: 5 demo users, 24 listings across all four types (including sold,
 * resolved, and draft states), conversations with meetup proposals and a
 * lost & found claim, and ratings. Run with `npm run db:seed`.
 *
 * Demo accounts all use real UC domains, so you can sign in as any of them
 * locally (the magic link prints to the dev server console).
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const daysAgo = (n: number, hourOffset = 0) =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000 + hourOffset * 60 * 60 * 1000);

async function main() {
  // Wipe in dependency order — this is a demo database.
  await db.notification.deleteMany();
  await db.savedSearch.deleteMany();
  await db.favorite.deleteMany();
  await db.report.deleteMany();
  await db.block.deleteMany();
  await db.rating.deleteMany();
  await db.message.deleteMany();
  await db.conversation.deleteMany();
  await db.listing.deleteMany();
  await db.session.deleteMany();
  await db.account.deleteMany();
  await db.verificationToken.deleteMany();
  await db.user.deleteMany();

  const [maya, jordan, sam, priya, devon] = await Promise.all(
    [
      {
        email: "claybornm@mail.uc.edu",
        displayName: "Maya C.",
        major: "Information Technology",
        year: "Senior",
        createdAt: daysAgo(420),
      },
      {
        email: "jordan.reed@uc.edu",
        displayName: "Jordan R.",
        major: "Mechanical Engineering",
        year: "Junior",
        createdAt: daysAgo(380),
      },
      {
        email: "nguyens4@mail.uc.edu",
        displayName: "Sam N.",
        major: "Marketing",
        year: "Sophomore",
        createdAt: daysAgo(200),
      },
      {
        email: "patelpr@mail.uc.edu",
        displayName: "Priya P.",
        major: "Biology",
        year: "Senior",
        createdAt: daysAgo(510),
      },
      {
        email: "devon.hill@uc.edu",
        displayName: "Devon H.",
        major: "Graphic Communication Design",
        year: "Freshman",
        createdAt: daysAgo(90),
      },
    ].map((u) => db.user.create({ data: { ...u, emailVerified: u.createdAt } }))
  );

  const L = (data: Parameters<typeof db.listing.create>[0]["data"]) =>
    db.listing.create({ data });

  // ---- Marketplace (SELL) ----
  const calcBook = await L({
    type: "SELL", title: "Calculus: Early Transcendentals (8th ed)",
    description:
      "Stewart's calculus, used for MATH 1061/1062. Clean pages, no highlighting, binding solid. Saves you $200 vs the bookstore.",
    category: "Textbooks & Course Materials", condition: "Like new", price: 45,
    photos: ["/seed/calc-textbook.svg"], ownerId: maya.id,
    createdAt: daysAgo(2), viewCount: 38,
  });
  await L({
    type: "SELL", title: "Organic Chemistry textbook + model kit",
    description:
      "Klein 4th edition with the molecular model kit thrown in. A few chapters have neat pencil notes (honestly helpful).",
    category: "Textbooks & Course Materials", condition: "Good", price: 60,
    photos: ["/seed/chem-textbook.svg"], ownerId: priya.id,
    createdAt: daysAgo(4), viewCount: 22,
  });
  const chair = await L({
    type: "SELL", title: "Adjustable desk chair",
    description:
      "Mesh-back desk chair, height + tilt adjust. No rips. Perfect for a dorm desk — I'm upgrading and it needs a new home.",
    category: "Furniture", condition: "Good", price: 35,
    photos: ["/seed/office-chair.svg"], ownerId: jordan.id,
    createdAt: daysAgo(1), viewCount: 17,
  });
  await L({
    type: "SELL", title: "Futon — folds flat, dark gray",
    description:
      "Standard dorm futon, folds flat for guests. Some wear on one armrest, photos honest. You haul (it fits in a sedan, barely).",
    category: "Furniture", condition: "Fair", price: 50,
    photos: ["/seed/futon.svg"], ownerId: sam.id,
    createdAt: daysAgo(6), viewCount: 41,
  });
  await L({
    type: "SELL", title: "Mini fridge (3.2 cu ft)",
    description:
      "Cold, quiet, ice tray included. Moving off campus to a place with a real fridge. Pickup at Calhoun garage is easiest.",
    category: "Dorm & Apartment Essentials", condition: "Good", price: 70,
    photos: ["/seed/mini-fridge.svg"], ownerId: devon.id,
    createdAt: daysAgo(3), viewCount: 55,
  });
  await L({
    type: "SELL", title: "TI-84 Plus CE graphing calculator",
    description:
      "Works perfectly, comes with charging cable and slide cover. Required for most calc and stats classes.",
    category: "Electronics", condition: "Like new", price: 65,
    photos: ["/seed/ti84.svg"], ownerId: priya.id,
    createdAt: daysAgo(5), viewCount: 33,
  });
  await L({
    type: "SELL", title: '24" monitor, 1080p, HDMI',
    description:
      "Acer 24-inch, great second screen for CS/IT homework. Includes HDMI cable. Small scuff on the stand, screen flawless.",
    category: "Electronics", condition: "Good", price: 55,
    photos: ["/seed/monitor.svg"], ownerId: maya.id,
    createdAt: daysAgo(8), viewCount: 29,
  });
  await L({
    type: "SELL", title: "UC Bearcats hoodie, size M",
    description:
      "Official bookstore hoodie, worn a handful of times. Too small for me now. No stains, no pilling.",
    category: "Clothing & Accessories", condition: "Like new", price: 20,
    photos: ["/seed/uc-hoodie.svg"], ownerId: sam.id,
    createdAt: daysAgo(2, 5), viewCount: 12,
  });
  await L({
    type: "SELL", title: "Bearcats basketball tickets (2) — Saturday",
    description:
      "Two student-section tickets for Saturday's home game. Can't make it anymore. Face value, no markup.",
    category: "Tickets & Events", condition: "New", price: 30,
    photos: ["/seed/bball-tickets.svg"], ownerId: jordan.id,
    createdAt: daysAgo(1, 8), viewCount: 64,
  });
  await L({
    type: "SELL", title: "5x7 area rug, neutral pattern",
    description:
      "Makes a dorm room instantly less echoey. Spot-cleaned, ready to go. Rolled up for easy carry.",
    category: "Dorm & Apartment Essentials", condition: "Good", price: 25,
    photos: ["/seed/rug.svg"], ownerId: devon.id,
    createdAt: daysAgo(9), viewCount: 19,
  });
  // Sold marketplace items (count toward impact)
  const soldBike = await L({
    type: "SELL", title: "Road bike — 54cm, recently tuned",
    description:
      "Commuter road bike, new brake pads, rides smooth. Selling because I'm studying abroad in the spring.",
    category: "Bikes & Transit", condition: "Good", price: 140,
    photos: ["/seed/bike.svg"], ownerId: jordan.id,
    status: "SOLD", createdAt: daysAgo(30), updatedAt: daysAgo(28), viewCount: 88,
  });
  const soldPsych = await L({
    type: "SELL", title: "PSYC 1001 textbook bundle",
    description: "Both required books for intro psych, good condition.",
    category: "Textbooks & Course Materials", condition: "Good", price: 38,
    photos: ["/seed/psych-textbook.svg"], ownerId: priya.id,
    status: "SOLD", createdAt: daysAgo(45), updatedAt: daysAgo(42), viewCount: 51,
  });
  await L({
    type: "SELL", title: "Winter coat, women's S",
    description: "Warm parka, perfect for the walk up the hill in January.",
    category: "Clothing & Accessories", condition: "Good", price: 28,
    photos: ["/seed/winter-coat.svg"], ownerId: maya.id,
    status: "SOLD", createdAt: daysAgo(60), updatedAt: daysAgo(55), viewCount: 47,
  });

  // ---- Donations (DONATE) ----
  await L({
    type: "DONATE", title: "Desk lamp with USB port",
    description:
      "Works great, just have two. LED bulb included. First come, first served — grab it before finals week.",
    category: "Dorm & Apartment Essentials", condition: "Good",
    photos: ["/seed/desk-lamp.svg"], ownerId: maya.id,
    createdAt: daysAgo(1, 3), viewCount: 26,
  });
  await L({
    type: "DONATE", title: "String lights (2 sets, warm white)",
    description:
      "Both sets work, every bulb checked. Make your dorm cozy for free.",
    category: "Dorm & Apartment Essentials", condition: "Like new",
    photos: ["/seed/string-lights.svg"], ownerId: sam.id,
    createdAt: daysAgo(3, 6), viewCount: 14,
  });
  await L({
    type: "DONATE", title: "Intro psych study guides + flashcards",
    description:
      "Handwritten study guides and two boxes of flashcards from PSYC 1001. Helped me get an A — pay it forward.",
    category: "Textbooks & Course Materials", condition: "Good",
    photos: ["/seed/psych-textbook.svg"], ownerId: priya.id,
    createdAt: daysAgo(7), viewCount: 9,
  });
  await L({
    type: "DONATE", title: "Healthy desk plant (pothos)",
    description:
      "Low-maintenance pothos in a ceramic pot. Survives neglect and dorm lighting. Free to a good windowsill.",
    category: "Other", condition: "Good",
    photos: ["/seed/plant.svg"], ownerId: devon.id,
    createdAt: daysAgo(2, 9), viewCount: 31,
  });
  // Completed donations (count toward impact)
  const givenLamp = await L({
    type: "DONATE", title: "Spare phone case + charging cables",
    description: "iPhone 13 case and two USB-C cables, all working.",
    category: "Electronics", condition: "Good",
    photos: ["/seed/airpods-case.svg"], ownerId: sam.id,
    status: "RESOLVED", createdAt: daysAgo(25), updatedAt: daysAgo(22), viewCount: 23,
  });
  await L({
    type: "DONATE", title: "Earbuds (sealed, won in a raffle)",
    description: "Brand new in box. I already have a pair I love.",
    category: "Electronics", condition: "New",
    photos: ["/seed/airpods.svg"], ownerId: devon.id,
    status: "RESOLVED", createdAt: daysAgo(70), updatedAt: daysAgo(65), viewCount: 39,
  });

  // ---- Lost (LOST) ----
  await L({
    type: "LOST", title: "Black JanSport backpack",
    description:
      "Lost Tuesday afternoon. Has a laptop sleeve, a red carabiner on the top handle, and chem notes inside. Reward: coffee on me.",
    category: "Clothing & Accessories", locationNote: "Braunstein Hall, room 300",
    photos: ["/seed/backpack.svg"], ownerId: sam.id,
    createdAt: daysAgo(1, 2), viewCount: 42,
  });
  await L({
    type: "LOST", title: "Car keys with a duck keychain",
    description:
      "Honda key fob plus two dorm keys on a ring with a tiny rubber duck. Probably dropped between DAAP and the shuttle stop.",
    category: "Other", locationNote: "DAAP courtyard / shuttle stop",
    photos: ["/seed/keys.svg"], ownerId: devon.id,
    createdAt: daysAgo(0, -5), viewCount: 18,
  });
  await L({
    type: "LOST", title: "Clear umbrella with white handle",
    description:
      "Left it drying by the door of the 4th floor study room in Langsam on Sunday evening. Sentimental value, please return!",
    category: "Other", locationNote: "Langsam Library, 4th floor",
    photos: ["/seed/umbrella.svg"], ownerId: priya.id,
    createdAt: daysAgo(2, 4), viewCount: 11,
  });

  // ---- Found (FOUND) ----
  const foundBottle = await L({
    type: "FOUND", title: "Teal water bottle (32oz)",
    description:
      "Found on a bench outside the CRC after the 6pm rush. Has a couple of stickers on it — describe them and it's yours.",
    category: "Sports & Fitness", locationNote: "CRC main entrance benches",
    photos: ["/seed/water-bottle.svg"], ownerId: jordan.id,
    createdAt: daysAgo(1, 6), viewCount: 27,
  });
  await L({
    type: "FOUND", title: "Silver laptop charger (USB-C, 65W)",
    description:
      "Left behind in TUC food court near the windows. Brand and a distinguishing mark will confirm it's yours.",
    category: "Electronics", locationNote: "TUC food court",
    photos: ["/seed/monitor.svg"], ownerId: maya.id,
    createdAt: daysAgo(3, 2), viewCount: 16,
  });
  // Resolved found item — reunited with its owner
  await L({
    type: "FOUND", title: "Student ID + bus pass in a clear sleeve",
    description: "Found by the Langsam printers. Returned to its owner.",
    category: "Other", locationNote: "Langsam Library printers",
    photos: ["/seed/keys.svg"], ownerId: priya.id,
    status: "RESOLVED", createdAt: daysAgo(12), updatedAt: daysAgo(11), viewCount: 21,
  });

  // ---- A draft (only its owner sees it) ----
  await L({
    type: "SELL", title: "Mechanical keyboard (needs new keycaps)",
    description:
      "Works fine, two keycaps missing. Drafting this until I find the spare caps in my moving boxes.",
    category: "Electronics", condition: "Fair", price: 25,
    photos: [], ownerId: maya.id,
    status: "DRAFT", createdAt: daysAgo(0, -2), viewCount: 0,
  });

  // ---- Conversations ----
  // 1. Sam asks Maya about the calculus textbook; meetup accepted.
  const convo1 = await db.conversation.create({
    data: {
      listingId: calcBook.id, starterId: sam.id,
      participantIds: [sam.id, maya.id],
      createdAt: daysAgo(1, 1), updatedAt: daysAgo(0, -1),
    },
  });
  await db.message.createMany({
    data: [
      {
        conversationId: convo1.id, senderId: sam.id, kind: "TEXT",
        body: "Hey! Is the calc book still available? I'm in 1061 this spring.",
        createdAt: daysAgo(1, 1), readAt: daysAgo(1, 2),
      },
      {
        conversationId: convo1.id, senderId: maya.id, kind: "TEXT",
        body: "Yep, still here! It's the exact edition for 1061.",
        createdAt: daysAgo(1, 2), readAt: daysAgo(1, 3),
      },
      {
        conversationId: convo1.id, senderId: sam.id, kind: "MEETUP_PROPOSAL",
        body: "Meetup proposed: Langsam Library lobby",
        meta: {
          spot: "Langsam Library lobby",
          datetime: daysAgo(-1, 4).toISOString(),
          status: "ACCEPTED",
        },
        createdAt: daysAgo(1, 3), readAt: daysAgo(1, 4),
      },
      {
        conversationId: convo1.id, senderId: maya.id, kind: "TEXT",
        body: "Perfect, see you there. I'll be by the front desk in a red jacket.",
        createdAt: daysAgo(0, -1),
      },
    ],
  });

  // 2. Devon claims Jordan's found water bottle (claim pending).
  const convo2 = await db.conversation.create({
    data: {
      listingId: foundBottle.id, starterId: devon.id,
      participantIds: [devon.id, jordan.id],
      createdAt: daysAgo(0, -3), updatedAt: daysAgo(0, -3),
    },
  });
  await db.message.create({
    data: {
      conversationId: convo2.id, senderId: devon.id, kind: "CLAIM",
      body: "It has a Cincinnati Zoo sticker on one side and a DAAP sticker that's half peeled off. There's a dent near the base too.",
      meta: { status: "PENDING" },
      createdAt: daysAgo(0, -3),
    },
  });

  // 3. Completed exchange behind the sold bike, with both-way ratings.
  const convo3 = await db.conversation.create({
    data: {
      listingId: soldBike.id, starterId: priya.id,
      participantIds: [priya.id, jordan.id],
      createdAt: daysAgo(31), updatedAt: daysAgo(29),
    },
  });
  await db.message.createMany({
    data: [
      {
        conversationId: convo3.id, senderId: priya.id, kind: "TEXT",
        body: "Hi! Is the bike still for sale? Would 130 work?",
        createdAt: daysAgo(31), readAt: daysAgo(31),
      },
      {
        conversationId: convo3.id, senderId: jordan.id, kind: "TEXT",
        body: "Let's meet in the middle at 135 and you've got a deal.",
        createdAt: daysAgo(30, 12), readAt: daysAgo(30, 13),
      },
      {
        conversationId: convo3.id, senderId: priya.id, kind: "MEETUP_PROPOSAL",
        body: "Meetup proposed: CRC front desk",
        meta: {
          spot: "CRC front desk",
          datetime: daysAgo(29, 5).toISOString(),
          status: "ACCEPTED",
        },
        createdAt: daysAgo(30, 14), readAt: daysAgo(30, 15),
      },
      {
        conversationId: convo3.id, senderId: jordan.id, kind: "TEXT",
        body: "Great doing business — enjoy the bike!",
        createdAt: daysAgo(29), readAt: daysAgo(29),
      },
    ],
  });

  // 4. Sold psych bundle conversation (rating prompt still open for Priya).
  const convo4 = await db.conversation.create({
    data: {
      listingId: soldPsych.id, starterId: devon.id,
      participantIds: [devon.id, priya.id],
      createdAt: daysAgo(44), updatedAt: daysAgo(43),
    },
  });
  await db.message.createMany({
    data: [
      {
        conversationId: convo4.id, senderId: devon.id, kind: "TEXT",
        body: "Taking psych next semester — I'll take the bundle!",
        createdAt: daysAgo(44), readAt: daysAgo(44),
      },
      {
        conversationId: convo4.id, senderId: priya.id, kind: "TEXT",
        body: "It's yours. TUC main entrance tomorrow at noon?",
        createdAt: daysAgo(43, 12), readAt: daysAgo(43, 13),
      },
    ],
  });

  // 5. Donation pickup behind the resolved phone-case donation.
  const convo5 = await db.conversation.create({
    data: {
      listingId: givenLamp.id, starterId: maya.id,
      participantIds: [maya.id, sam.id],
      createdAt: daysAgo(24), updatedAt: daysAgo(23),
    },
  });
  await db.message.createMany({
    data: [
      {
        conversationId: convo5.id, senderId: maya.id, kind: "TEXT",
        body: "I could use those cables if they're still free!",
        createdAt: daysAgo(24), readAt: daysAgo(24),
      },
      {
        conversationId: convo5.id, senderId: sam.id, kind: "TEXT",
        body: "All yours. I'm near MarketPointe most afternoons.",
        createdAt: daysAgo(23, 18), readAt: daysAgo(23, 19),
      },
    ],
  });

  // ---- Ratings ----
  await db.rating.createMany({
    data: [
      {
        fromUserId: priya.id, toUserId: jordan.id, listingId: soldBike.id,
        stars: 5, comment: "Bike was exactly as described and Jordan was right on time.",
        createdAt: daysAgo(28),
      },
      {
        fromUserId: jordan.id, toUserId: priya.id, listingId: soldBike.id,
        stars: 5, comment: "Easy, friendly exchange. Would sell to again!",
        createdAt: daysAgo(28),
      },
      {
        fromUserId: devon.id, toUserId: priya.id, listingId: soldPsych.id,
        stars: 4, comment: "Books in good shape, quick meetup at TUC.",
        createdAt: daysAgo(42),
      },
      {
        fromUserId: maya.id, toUserId: sam.id, listingId: givenLamp.id,
        stars: 5, comment: "Generous and flexible on pickup time. Thanks!",
        createdAt: daysAgo(22),
      },
    ],
  });

  // ================= Showcase demo account =================
  // demo@mail.uc.edu — staged so every feature is demonstrable from one
  // sign-in: active listings, a draft, unread messages, a meetup proposal
  // to answer, a pending L&F claim to judge, and an open rating prompt.
  const demo = await db.user.create({
    data: {
      email: "demo@mail.uc.edu",
      displayName: "Alex Demo",
      major: "Information Technology",
      year: "Junior",
      createdAt: daysAgo(300),
      emailVerified: daysAgo(300),
    },
  });

  // Reviewer persona — clean account for exploring freely. Also a moderator
  // so the moderation queue is demonstrable.
  const professor = await db.user.create({
    data: {
      email: "professor@mail.uc.edu",
      displayName: "Professor",
      createdAt: daysAgo(1),
      emailVerified: daysAgo(1),
      isModerator: true,
      role: "MODERATOR",
    },
  });

  await L({
    type: "SELL", title: "IKEA desk + chair set",
    description:
      "Micke desk and matching chair, both solid. Selling together only. Perfect starter setup for an apartment move.",
    category: "Furniture", condition: "Good", price: 45,
    photos: ["/seed/desk-set.svg"], ownerId: demo.id,
    createdAt: daysAgo(4, 2), viewCount: 24,
  });
  const demoHeadphones = await L({
    type: "SELL", title: "Sony noise-cancelling headphones",
    description:
      "WH-CH720N, bought last year. Great for the library during finals. Comes with the case and cable. Battery still lasts ~30h.",
    category: "Electronics", condition: "Like new", price: 80,
    photos: ["/seed/headphones.svg"], ownerId: demo.id,
    createdAt: daysAgo(2, 7), viewCount: 46,
  });
  await L({
    type: "DONATE", title: "Closet organizer + 30 hangers",
    description:
      "Hanging fabric organizer plus a big stack of matching hangers. Free — just come grab it before move-out.",
    category: "Dorm & Apartment Essentials", condition: "Good",
    photos: ["/seed/hangers.svg"], ownerId: demo.id,
    createdAt: daysAgo(5, 4), viewCount: 13,
  });
  await L({
    type: "LOST", title: "AirPods Pro case with carabiner",
    description:
      "Lost the charging case (AirPods were in my ears, of course). White case, small black carabiner clipped on, scratches on the bottom.",
    category: "Electronics", locationNote: "CRC locker room",
    photos: ["/seed/airpods-case.svg"], ownerId: demo.id,
    createdAt: daysAgo(1, 5), viewCount: 20,
  });
  const demoBeanie = await L({
    type: "FOUND", title: "Gray knit beanie",
    description:
      "Found a gray beanie left on a table in the TUC food court on Thursday evening. Describe the brand or any marks and it's yours.",
    category: "Clothing & Accessories", locationNote: "TUC food court",
    photos: ["/seed/beanie.svg"], ownerId: demo.id,
    createdAt: daysAgo(2, 1), viewCount: 15,
  });
  await L({
    type: "SELL", title: "Skateboard, barely used",
    description:
      "8.0 deck, smooth wheels. Realized I'm more of a bus person. Draft until I take real photos.",
    category: "Bikes & Transit", condition: "Like new", price: 35,
    photos: ["/seed/skateboard.svg"], ownerId: demo.id,
    status: "DRAFT", createdAt: daysAgo(0, -4), viewCount: 0,
  });
  const demoMicrowave = await L({
    type: "SELL", title: "Microwave (0.7 cu ft)",
    description: "Dorm-size microwave, works perfectly. Sold to Jordan.",
    category: "Dorm & Apartment Essentials", condition: "Good", price: 25,
    photos: ["/seed/microwave.svg"], ownerId: demo.id,
    status: "SOLD", createdAt: daysAgo(20), updatedAt: daysAgo(18), viewCount: 37,
  });

  // Unread thread: Maya wants the headphones and proposed a meetup.
  const demoConvo1 = await db.conversation.create({
    data: {
      listingId: demoHeadphones.id, starterId: maya.id,
      participantIds: [maya.id, demo.id],
      createdAt: daysAgo(0, -6), updatedAt: daysAgo(0, -1),
    },
  });
  await db.message.createMany({
    data: [
      {
        conversationId: demoConvo1.id, senderId: maya.id, kind: "TEXT",
        body: "Hi! Are the headphones still available?",
        createdAt: daysAgo(0, -6),
      },
      {
        conversationId: demoConvo1.id, senderId: maya.id, kind: "TEXT",
        body: "Would you take $70? I can meet anywhere on campus this week.",
        createdAt: daysAgo(0, -5),
      },
      {
        conversationId: demoConvo1.id, senderId: maya.id, kind: "MEETUP_PROPOSAL",
        body: "Meetup proposed: Langsam Library lobby",
        meta: {
          spot: "Langsam Library lobby",
          datetime: daysAgo(-2, 6).toISOString(),
          status: "PENDING",
        },
        createdAt: daysAgo(0, -1),
      },
    ],
  });

  // Pending ownership claim on the found beanie, for the demo user to judge.
  const demoConvo2 = await db.conversation.create({
    data: {
      listingId: demoBeanie.id, starterId: sam.id,
      participantIds: [sam.id, demo.id],
      createdAt: daysAgo(0, -8), updatedAt: daysAgo(0, -8),
    },
  });
  await db.message.create({
    data: {
      conversationId: demoConvo2.id, senderId: sam.id, kind: "CLAIM",
      body: "It's a gray Carhartt beanie — there's a small white paint stain on the fold from a studio project, and the tag inside is half torn off.",
      meta: { status: "PENDING" },
      createdAt: daysAgo(0, -8),
    },
  });

  // Completed sale where Jordan already rated; the demo user's rating
  // prompt is still open in this thread.
  const demoConvo3 = await db.conversation.create({
    data: {
      listingId: demoMicrowave.id, starterId: jordan.id,
      participantIds: [jordan.id, demo.id],
      createdAt: daysAgo(20), updatedAt: daysAgo(18),
    },
  });
  await db.message.createMany({
    data: [
      {
        conversationId: demoConvo3.id, senderId: jordan.id, kind: "TEXT",
        body: "I'll take the microwave if it's still around!",
        createdAt: daysAgo(20), readAt: daysAgo(20),
      },
      {
        conversationId: demoConvo3.id, senderId: demo.id, kind: "TEXT",
        body: "It's yours — TUC main entrance tomorrow at 2?",
        createdAt: daysAgo(19, 12), readAt: daysAgo(19, 13),
      },
      {
        conversationId: demoConvo3.id, senderId: jordan.id, kind: "TEXT",
        body: "Perfect, see you then.",
        createdAt: daysAgo(19, 14), readAt: daysAgo(19, 15),
      },
    ],
  });
  await db.rating.create({
    data: {
      fromUserId: jordan.id, toUserId: demo.id, listingId: demoMicrowave.id,
      stars: 5, comment: "Microwave works great, smooth handoff at TUC.",
      createdAt: daysAgo(17),
    },
  });

  // ================= Extra marketplace volume =================
  await L({
    type: "SELL", title: "Physics 2001 textbook",
    description:
      "University Physics vol. 1, used one semester. Light highlighting in two chapters, otherwise clean.",
    category: "Textbooks & Course Materials", condition: "Good", price: 30,
    photos: ["/seed/chem-textbook.svg"], ownerId: priya.id,
    createdAt: daysAgo(3, 9), viewCount: 18,
  });
  await L({
    type: "SELL", title: "Electric kettle, 1.7L",
    description:
      "Boils fast, auto shutoff. Essential for ramen and all-nighters. Descaled last month.",
    category: "Kitchen & Appliances", condition: "Good", price: 12,
    photos: ["/seed/kettle.svg"], ownerId: sam.id,
    createdAt: daysAgo(4, 6), viewCount: 21,
  });
  await L({
    type: "SELL", title: "MainStreet concert tickets (2)",
    description:
      "Two tickets for Friday's show at MainStreet. Can't go anymore — face value.",
    category: "Tickets & Events", condition: "New", price: 25,
    photos: ["/seed/bball-tickets.svg"], ownerId: devon.id,
    createdAt: daysAgo(0, -7), viewCount: 33,
  });
  await L({
    type: "SELL", title: "Women's rain jacket, size M",
    description:
      "Packable rain shell, great for the walk between Langsam and TUC. Zips into its own pocket.",
    category: "Clothing & Accessories", condition: "Like new", price: 18,
    photos: ["/seed/winter-coat.svg"], ownerId: maya.id,
    createdAt: daysAgo(6, 3), viewCount: 10,
  });
  await L({
    type: "DONATE", title: "Moving boxes (8) + packing paper",
    description:
      "Eight sturdy boxes, broken down flat, plus a roll of packing paper. Free to whoever's moving next.",
    category: "Other", condition: "Good",
    photos: ["/seed/boxes.svg"], ownerId: jordan.id,
    createdAt: daysAgo(1, 9), viewCount: 17,
  });
  await L({
    type: "DONATE", title: "Full-length mirror",
    description:
      "Door-hanging mirror, no cracks. Too heavy to ship home — free for pickup near campus.",
    category: "Dorm & Apartment Essentials", condition: "Good",
    photos: ["/seed/mirror.svg"], ownerId: maya.id,
    createdAt: daysAgo(5, 8), viewCount: 25,
  });
  await L({
    type: "LOST", title: "Silver ring with a blue stone",
    description:
      "Thin silver band with a small blue stone. Likely slipped off near the Sigma Sigma commons amphitheater. Huge sentimental value.",
    category: "Other", locationNote: "Sigma Sigma commons",
    photos: ["/seed/ring.svg"], ownerId: sam.id,
    createdAt: daysAgo(3, 5), viewCount: 29,
  });
  // One active listing per remaining category — no filter dead-ends.
  await L({
    type: "SELL", title: "Yamaha acoustic guitar + soft case",
    description:
      "FG800, great starter guitar. New strings last month. Selling because I upgraded — CCM friends, this one's honest.",
    category: "Music & Instruments", condition: "Good", price: 90,
    photos: ["/seed/guitar.svg"], ownerId: devon.id,
    createdAt: daysAgo(2, 8), viewCount: 22,
  });
  await L({
    type: "SELL", title: "Copic marker set (24, mostly new)",
    description:
      "24-color set from my first DAAP studio cycle. Three markers half-used, the rest barely touched. Huge savings vs the bookstore.",
    category: "Art & Design Supplies", condition: "Like new", price: 40,
    photos: ["/seed/markers.svg"], ownerId: devon.id,
    createdAt: daysAgo(1, 7), viewCount: 28,
  });
  await L({
    type: "SELL", title: "Yoga mat + two blocks",
    description:
      "Thick mat, wiped down, with cork blocks. Perfect for CRC classes or dorm-room stretching.",
    category: "Sports & Fitness", condition: "Good", price: 10,
    photos: ["/seed/yoga-mat.svg"], ownerId: priya.id,
    createdAt: daysAgo(3, 7), viewCount: 9,
  });
  await L({
    type: "SELL", title: "U-lock + bike lights set",
    description:
      "Kryptonite U-lock with two keys plus front/rear USB lights. Sold my bike, keeping you and yours safe instead.",
    category: "Bikes & Transit", condition: "Good", price: 15,
    photos: ["/seed/bike-lock.svg"], ownerId: jordan.id,
    createdAt: daysAgo(2, 6), viewCount: 14,
  });
  await L({
    type: "DONATE", title: "Desk organizer + planner bundle",
    description:
      "Mesh desk organizer, an unused 2026 planner, and a stack of sticky notes. Free to a fellow over-organizer.",
    category: "School & Office Supplies", condition: "Like new",
    photos: ["/seed/planner.svg"], ownerId: sam.id,
    createdAt: daysAgo(1, 1), viewCount: 11,
  });

  await L({
    type: "FOUND", title: "TI calculator in a green case",
    description:
      "Found after the 11am lecture let out. There's a name written inside the case lid — tell me the name and it's yours.",
    category: "Electronics", locationNote: "Swift Hall 800",
    photos: ["/seed/ti84.svg"], ownerId: devon.id,
    createdAt: daysAgo(1, 4), viewCount: 12,
  });

  // ================= V2 showcase data =================

  // A returned found item earns the demo user the "Good Samaritan" badge.
  await L({
    type: "FOUND", title: "Returned: blue Nalgene bottle",
    description: "Found near Langsam and reunited with its owner the same day.",
    category: "Sports & Fitness", locationNote: "Langsam Library",
    photos: ["/seed/water-bottle.svg"], ownerId: demo.id,
    status: "RESOLVED", createdAt: daysAgo(14), updatedAt: daysAgo(14), viewCount: 8,
  });

  // A "Looking for" want ad so the Wanted tab isn't empty.
  await L({
    type: "WANTED", title: "Looking for a mini fridge",
    description:
      "Moving into a single and need a small fridge (3–4 cu ft). Can pick up anywhere on campus. Reasonable price or free is amazing.",
    category: "Dorm & Apartment Essentials", ownerId: devon.id,
    createdAt: daysAgo(0, -2), viewCount: 9,
  });

  // A move-out batch (Sam clearing out) — shareable at /moveout/<batchId>.
  const moveoutBatchId = "demo-moveout-001";
  await Promise.all([
    L({
      type: "SELL", title: "Desk fan", description: "Quiet, two speeds. Move-out sale.",
      category: "Dorm & Apartment Essentials", condition: "Good", price: 8,
      photos: [], ownerId: sam.id, moveoutBatchId, createdAt: daysAgo(0, -1),
    }),
    L({
      type: "DONATE", title: "Stack of textbooks (free)",
      description: "Free — grab them before move-out.",
      category: "Textbooks & Course Materials", condition: "Fair",
      photos: [], ownerId: sam.id, moveoutBatchId, createdAt: daysAgo(0, -1),
    }),
    L({
      type: "SELL", title: "Shoe rack", description: "Holds 12 pairs. Move-out sale.",
      category: "Dorm & Apartment Essentials", condition: "Good", price: 10,
      photos: [], ownerId: sam.id, moveoutBatchId, createdAt: daysAgo(0, -1),
    }),
  ]);

  // Demo user's favorites, a notify-on saved search, and seeded notifications.
  await db.favorite.createMany({
    data: [
      { userId: demo.id, listingId: calcBook.id },
      { userId: demo.id, listingId: chair.id },
    ],
  });
  await db.savedSearch.create({
    data: {
      userId: demo.id,
      label: "Calculators under $80",
      q: "calculator",
      category: "Electronics",
      type: "SELL",
      maxPrice: 80,
      notify: true,
    },
  });
  await db.notification.createMany({
    data: [
      {
        userId: demo.id, kind: "SAVED_SEARCH_HIT",
        title: "New match: TI-84 Plus CE graphing calculator",
        body: "Matches your saved search “Calculators under $80”.",
        href: "/browse?q=calculator", createdAt: daysAgo(0, -3),
      },
      {
        userId: demo.id, kind: "MESSAGE",
        title: "New message from Maya C.",
        body: "Would you take $70? I can meet anywhere on campus this week.",
        href: `/messages/${demoConvo1.id}`, createdAt: daysAgo(0, -1),
      },
    ],
  });

  // An open report for the moderator (Professor) to review.
  await db.report.create({
    data: {
      reporterId: maya.id,
      listingId: chair.id,
      reason: "SPAM",
      detail: "Looks like a duplicate repost.",
      status: "OPEN",
      createdAt: daysAgo(0, -4),
    },
  });

  // ---- Completed-exchange backlog (campus-impact history) ----
  // A realistic history of past sales and donations so the impact numbers read
  // like a marketplace that's been running, not one seeded yesterday. These are
  // all completed (SOLD/given), so they never show on Browse — they only feed
  // the impact counters.
  const owners = [maya, jordan, sam, priya, devon];
  const soldGoods: [string, number, string][] = [
    ["Intro Bio textbook", 42, "Textbooks & Course Materials"],
    ["Statistics textbook (4th ed)", 35, "Textbooks & Course Materials"],
    ["Textbook bundle (3 courses)", 60, "Textbooks & Course Materials"],
    ["Dorm futon, charcoal", 70, "Furniture"],
    ["Desk + chair set", 60, "Furniture"],
    ["Bookshelf, 3-tier", 25, "Furniture"],
    ["Mini fridge, 2.6 cu ft", 55, "Dorm & Apartment Essentials"],
    ["Microwave, 0.7 cu ft", 30, "Dorm & Apartment Essentials"],
    ["Brita pitcher + filters", 12, "Dorm & Apartment Essentials"],
    ["Adjustable desk lamp", 14, "Dorm & Apartment Essentials"],
    ["Standing fan", 18, "Dorm & Apartment Essentials"],
    ["Area rug, 5x7", 28, "Dorm & Apartment Essentials"],
    ["Coffee maker", 16, "Dorm & Apartment Essentials"],
    ["Full-length mirror", 22, "Dorm & Apartment Essentials"],
    ["TI-84 Plus CE", 65, "Electronics"],
    ['24" monitor, 1080p', 110, "Electronics"],
    ["Mechanical keyboard", 45, "Electronics"],
    ["Bluetooth speaker", 22, "Electronics"],
    ["Wireless mouse", 10, "Electronics"],
    ["iPad (6th gen)", 150, "Electronics"],
    ["Nintendo Switch", 170, "Electronics"],
    ["Bearcats hoodie, M", 20, "Clothing & Accessories"],
    ["Winter coat, women's S", 35, "Clothing & Accessories"],
    ["Rain jacket, L", 18, "Clothing & Accessories"],
    ["Hydro Flask, 32oz", 15, "Clothing & Accessories"],
    ["Road bike, 54cm", 160, "Bikes & Transit"],
    ["U-lock + lights", 20, "Bikes & Transit"],
    ["Skateboard", 30, "Bikes & Transit"],
    ["Acoustic guitar + case", 120, "Music & Instruments"],
    ["Keyboard stand", 18, "Music & Instruments"],
    ["Drawing tablet", 90, "Art & Design Supplies"],
    ["Copic marker set (24)", 40, "Art & Design Supplies"],
    ["Bearcats game tickets (2)", 50, "Tickets & Events"],
    ["Concert tickets (2)", 45, "Tickets & Events"],
  ];
  const givenGoods: [string, string][] = [
    ["Moving boxes (10, flattened)", "Dorm & Apartment Essentials"],
    ["Packing paper + bubble wrap", "Dorm & Apartment Essentials"],
    ["Closet organizer", "Dorm & Apartment Essentials"],
    ["30 clothes hangers", "Dorm & Apartment Essentials"],
    ["String lights (2 sets)", "Dorm & Apartment Essentials"],
    ["Throw blanket", "Dorm & Apartment Essentials"],
    ["Shower caddy", "Dorm & Apartment Essentials"],
    ["Desk plant (pothos)", "Other"],
    ["Intro psych study guides", "Textbooks & Course Materials"],
    ["Spare phone cases", "Electronics"],
    ["Charging cables (3)", "Electronics"],
    ["Notebooks + pens", "Art & Design Supplies"],
    ["Ramen + snacks (sealed)", "Other"],
    ["Reusable water bottle", "Clothing & Accessories"],
  ];
  const conditions = ["Good", "Like new", "Fair", "New"];
  await Promise.all([
    ...soldGoods.map(([title, price, category], i) =>
      L({
        type: "SELL",
        title,
        price,
        category,
        condition: conditions[i % conditions.length],
        description: `${title} — sold to a fellow Bearcat.`,
        photos: [],
        ownerId: owners[i % owners.length].id,
        status: "SOLD",
        createdAt: daysAgo(40 + i),
        updatedAt: daysAgo(34 + i),
        viewCount: 18 + i,
      })
    ),
    ...givenGoods.map(([title, category], i) =>
      L({
        type: "DONATE",
        title,
        category,
        condition: "Good",
        description: `${title} — given away free to another student.`,
        photos: [],
        ownerId: owners[(i + 2) % owners.length].id,
        status: "SOLD",
        createdAt: daysAgo(28 + i),
        updatedAt: daysAgo(24 + i),
        viewCount: 9 + i,
      })
    ),
  ]);

  // Backfill completedAt for already-completed listings (= their updatedAt),
  // so time-to-completion analytics have data out of the box.
  const doneListings = await db.listing.findMany({
    where: { status: { in: ["SOLD", "RESOLVED"] } },
    select: { id: true, updatedAt: true },
  });
  await Promise.all(
    doneListings.map((l) =>
      db.listing.update({
        where: { id: l.id },
        data: { completedAt: l.updatedAt },
      })
    )
  );

  // ================= Search analytics (powers /funnel) =================
  // A realistic spread of searches over the last ~30 days: popular hits, a few
  // unmet-demand zero-result queries, across tabs and (some) categories.
  const searchers = [demo.id, maya.id, jordan.id, sam.id, priya.id, devon.id, null];
  const searchSpecs: [string, string, string | null, number, number][] = [
    // [query, tab, category, resultCount, timesRepeated]
    ["calculus", "Marketplace", "Textbooks & Course Materials", 3, 14],
    ["desk", "Marketplace", "Furniture", 5, 11],
    ["mini fridge", "Marketplace", "Kitchen & Appliances", 2, 9],
    ["headphones", "Marketplace", "Electronics", 4, 9],
    ["bike", "Marketplace", "Bikes & Transit", 3, 8],
    ["monitor", "Marketplace", "Electronics", 2, 7],
    ["textbook", "Marketplace", "Textbooks & Course Materials", 6, 7],
    ["futon", "Marketplace", "Furniture", 1, 6],
    ["lamp", "Marketplace", null, 4, 5],
    ["tickets", "Marketplace", "Tickets & Events", 2, 5],
    ["winter coat", "Marketplace", "Clothing & Accessories", 1, 4],
    ["plant", "Donations", null, 2, 4],
    // Unmet demand — zero results (the valuable signal):
    ["airpods pro", "Marketplace", "Electronics", 0, 12],
    ["graphing calculator ti-nspire", "Marketplace", null, 0, 8],
    ["standing desk", "Marketplace", "Furniture", 0, 7],
    ["parking pass", "Marketplace", null, 0, 6],
    ["mattress topper", "Marketplace", "Dorm & Apartment Essentials", 0, 5],
    ["nintendo switch", "Marketplace", "Electronics", 0, 5],
    ["lost airpods", "LostFound", null, 0, 4],
    ["wanted: roommate futon", "Wanted", "Furniture", 0, 3],
  ];
  let searchSeq = 0;
  const searchRows = searchSpecs.flatMap(([query, tab, category, resultCount, times]) =>
    Array.from({ length: times }, () => {
      const n = searchSeq++;
      return {
        query,
        tab,
        category,
        resultCount,
        userId: searchers[n % searchers.length],
        // Spread across the last 30 days, weighted toward recent.
        createdAt: daysAgo((n * 7) % 30, n % 24),
      };
    })
  );
  await db.searchEvent.createMany({ data: searchRows });

  const counts = {
    users: await db.user.count(),
    listings: await db.listing.count(),
    conversations: await db.conversation.count(),
    messages: await db.message.count(),
    ratings: await db.rating.count(),
    favorites: await db.favorite.count(),
    savedSearches: await db.savedSearch.count(),
    notifications: await db.notification.count(),
    reports: await db.report.count(),
    searchEvents: await db.searchEvent.count(),
  };
  console.log("Seeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
