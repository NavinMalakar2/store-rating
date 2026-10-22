import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// Deliberately fictional LOCAL DEMO data. Names are 20–60 chars; passwords satisfy the policy.
const ADMIN_PW = 'Admin@123';
const USER_PW = 'User@1234';
const OWNER_PW = 'Owner@123';

const users = [
  { name: 'System Administrator Account', email: 'admin@storerating.dev', address: '1 Admin Plaza, Demo City, 452001', role: Role.ADMIN, pw: ADMIN_PW },
  { name: 'Rahul Sharma Demo Customer', email: 'rahul@storerating.dev', address: '12 Palasia Square, Indore, 452001', role: Role.USER, pw: USER_PW },
  { name: 'Priya Verma Demo Customer', email: 'priya@storerating.dev', address: '48 Vijay Nagar, Indore, 452010', role: Role.USER, pw: USER_PW },
  { name: 'Amit Patel Demo Customer Account', email: 'amit@storerating.dev', address: '7 Race Course Road, Indore, 452003', role: Role.USER, pw: USER_PW },
  { name: 'Sunita Rao Fictional Store Owner', email: 'sunita.owner@storerating.dev', address: '3 Market Lane, Indore, 452002', role: Role.STORE_OWNER, pw: OWNER_PW },
  { name: 'Vikram Singh Fictional Store Owner', email: 'vikram.owner@storerating.dev', address: '9 Station Road, Indore, 452004', role: Role.STORE_OWNER, pw: OWNER_PW },
];

const stores = [
  { name: 'Sunrise Fresh Groceries and More', email: 'contact@sunrise-fresh.example', address: '3 Market Lane, Indore, 452002', owner: 'sunita.owner@storerating.dev' },
  { name: 'Vikram Electronics and Gadgets Hub', email: 'hello@vikram-electronics.example', address: '9 Station Road, Indore, 452004', owner: 'vikram.owner@storerating.dev' },
  { name: 'Green Leaf Organic Cafe and Bakery', email: 'hi@greenleaf-cafe.example', address: '21 Rajwada Street, Indore, 452007', owner: null },
  { name: 'Bookworm Corner Used Books Emporium', email: 'info@bookworm-corner.example', address: '5 College Road, Indore, 452009', owner: null },
];

// [user email, store email, rating]
const ratings: [string, string, number][] = [
  ['rahul@storerating.dev', 'contact@sunrise-fresh.example', 5],
  ['priya@storerating.dev', 'contact@sunrise-fresh.example', 4],
  ['amit@storerating.dev', 'contact@sunrise-fresh.example', 4],
  ['rahul@storerating.dev', 'hello@vikram-electronics.example', 3],
  ['priya@storerating.dev', 'hello@vikram-electronics.example', 2],
  ['rahul@storerating.dev', 'hi@greenleaf-cafe.example', 5],
];

async function main() {
  const ids = new Map<string, string>();
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.pw, 10);
    const row = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, address: u.address, passwordHash },
      create: { name: u.name, email: u.email, address: u.address, role: u.role, passwordHash },
    });
    ids.set(u.email, row.id);
  }
  const storeIds = new Map<string, string>();
  for (const s of stores) {
    const ownerId = s.owner ? ids.get(s.owner)! : null;
    const row = await prisma.store.upsert({
      where: { email: s.email },
      update: { name: s.name, address: s.address, ownerId },
      create: { name: s.name, email: s.email, address: s.address, ownerId },
    });
    storeIds.set(s.email, row.id);
  }
  for (const [ue, se, rating] of ratings) {
    const userId = ids.get(ue)!;
    const storeId = storeIds.get(se)!;
    await prisma.rating.upsert({
      where: { userId_storeId: { userId, storeId } },
      update: { rating },
      create: { userId, storeId, rating },
    });
  }
  console.log(`Seeded ${users.length} users, ${stores.length} stores, ${ratings.length} ratings.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
