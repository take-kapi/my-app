import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

// データベースに接続するための準備じゃ
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["query"] });

async function main() {
  // 試しにユーザーを 1 人作ってみるぞ
  await prisma.user.create({
    data: { name: `修行中のわんこ ${new Date().toLocaleTimeString()}` },
  });

  // 登録されたユーザーを全員連れてくるのじゃ
  const users = await prisma.user.findMany();
  console.log("現在のユーザー一覧:", users);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => Promise.all([prisma.$disconnect(), pool.end()]));
