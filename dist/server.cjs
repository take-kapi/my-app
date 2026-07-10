var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var import_nodemailer = __toESM(require("nodemailer"), 1);

// src/db/prisma.ts
var import_config = require("dotenv/config");
var import_pg = require("pg");
var import_adapter_pg = require("@prisma/adapter-pg");
var import_client = require("@prisma/client");
console.log("DATABASE_URL =", process.env.DATABASE_URL);
var pool = new import_pg.Pool({
  connectionString: process.env.DATABASE_URL
});
var adapter = new import_adapter_pg.PrismaPg(pool);
var globalForPrisma = global;
var prisma = globalForPrisma.prisma ?? new import_client.PrismaClient({
  adapter,
  log: ["query", "warn", "error"]
});
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// server.ts
var app = (0, import_express.default)();
var PORT = 3e3;
var JWT_SECRET = process.env.JWT_SECRET || "textbook-exchange-secret-key-123456";
app.use(import_express.default.json());
function getCookie(req, name) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [key, value] = cookie.split("=");
    if (key === name) return decodeURIComponent(value);
  }
  return null;
}
var requireAuth = async (req, res, next) => {
  const token = getCookie(req, "token");
  if (!token) {
    return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059" });
  }
  try {
    const decoded = import_jsonwebtoken.default.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "\u30BB\u30C3\u30B7\u30E7\u30F3\u306E\u671F\u9650\u304C\u5207\u308C\u307E\u3057\u305F\u3002\u518D\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044" });
  }
};
app.post("/api/auth/register", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "\u3059\u3079\u3066\u306E\u5FC5\u9808\u9805\u76EE\uFF08\u540D\u524D\u3001\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u3001\u30D1\u30B9\u30EF\u30FC\u30C9\uFF09\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" });
  }
  if (!/@([a-zA-Z0-9-]+\.)*keio\.jp$/i.test(email)) {
    return res.status(400).json({ error: "\u6176\u61C9\u7FA9\u587E\u5927\u5B66\u306E\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\uFF08@keio.jp\u306A\u3069\uFF09\u306E\u307F\u767B\u9332\u53EF\u80FD\u3067\u3059" });
  }
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    if (existingUser) {
      return res.status(400).json({ error: "\u3053\u306E\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u306F\u65E2\u306B\u767B\u9332\u3055\u308C\u3066\u3044\u307E\u3059" });
    }
    const passwordHash = await import_bcryptjs.default.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name
      }
    });
    const token = import_jsonwebtoken.default.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.setHeader(
      "Set-Cookie",
      `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
    );
    res.json({
      message: "\u30A2\u30AB\u30A6\u30F3\u30C8\u306E\u767B\u9332\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F\uFF01",
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "\u30A2\u30AB\u30A6\u30F3\u30C8\u306E\u767B\u9332\u4E2D\u306B\u30B5\u30FC\u30D0\u30FC\u3067\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F" });
  }
});
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u3068\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" });
  }
  if (!/@([a-zA-Z0-9-]+\.)*keio\.jp$/i.test(email)) {
    return res.status(400).json({ error: "\u6176\u61C9\u7FA9\u587E\u5927\u5B66\u306E\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u306E\u307F\u30ED\u30B0\u30A4\u30F3\u53EF\u80FD\u3067\u3059" });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });
    if (!user) {
      return res.status(400).json({ error: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u307E\u305F\u306F\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093" });
    }
    const isMatch = await import_bcryptjs.default.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u307E\u305F\u306F\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093" });
    }
    const token = import_jsonwebtoken.default.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.setHeader(
      "Set-Cookie",
      `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
    );
    res.json({
      message: "\u30ED\u30B0\u30A4\u30F3\u3057\u307E\u3057\u305F\uFF01",
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "\u30ED\u30B0\u30A4\u30F3\u51E6\u7406\u4E2D\u306B\u30B5\u30FC\u30D0\u30FC\u3067\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F" });
  }
});
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" });
  }
  if (!/@([a-zA-Z0-9-]+\.)*keio\.jp$/i.test(email)) {
    return res.status(400).json({ error: "\u6176\u61C9\u7FA9\u587E\u5927\u5B66\u306E\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u306E\u307F\u30EA\u30BB\u30C3\u30C8\u53EF\u80FD\u3067\u3059" });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });
    if (!user) {
      return res.status(404).json({ error: "\u3053\u306E\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u3067\u767B\u9332\u3055\u308C\u3066\u3044\u308B\u30E6\u30FC\u30B6\u30FC\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    }
    const tempPassword = "keio-temp-" + Math.random().toString(36).slice(-8);
    const passwordHash = await import_bcryptjs.default.hash(tempPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    let emailSent = false;
    if (smtpUser && smtpPass) {
      try {
        const transporter = import_nodemailer.default.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });
        await transporter.sendMail({
          from: `"\u6176\u61C9\u6559\u79D1\u66F8\u4EA4\u63DB\u30D7\u30E9\u30C3\u30C8\u30D5\u30A9\u30FC\u30E0" <${smtpUser}>`,
          to: email,
          subject: "\u3010\u6176\u61C9\u6559\u79D1\u66F8\u4EA4\u63DB\u3011\u4E00\u6642\u30D1\u30B9\u30EF\u30FC\u30C9\u767A\u884C\u306E\u304A\u77E5\u3089\u305B",
          text: `${user.name} \u69D8

\u6176\u61C9\u6559\u79D1\u66F8\u4EA4\u63DB\u30D7\u30E9\u30C3\u30C8\u30D5\u30A9\u30FC\u30E0\u3092\u3054\u5229\u7528\u3044\u305F\u3060\u304D\u3042\u308A\u304C\u3068\u3046\u3054\u3056\u3044\u307E\u3059\u3002

\u30ED\u30B0\u30A4\u30F3\u7528\u306E\u300C\u4E00\u6642\u30D1\u30B9\u30EF\u30FC\u30C9\u300D\u3092\u767A\u884C\u3044\u305F\u3057\u307E\u3057\u305F\u3002

\u4E00\u6642\u30D1\u30B9\u30EF\u30FC\u30C9: ${tempPassword}

\u30ED\u30B0\u30A4\u30F3\u5B8C\u4E86\u5F8C\u3001\u30DE\u30A4\u30DA\u30FC\u30B8\u3088\u308A\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u65B0\u3057\u3044\u5B89\u5168\u306A\u3082\u306E\u306B\u5909\u66F4\u3057\u3066\u304F\u3060\u3055\u3044\u3002
\u203B\u3053\u306E\u30E1\u30FC\u30EB\u306B\u5FC3\u5F53\u305F\u308A\u304C\u306A\u3044\u5834\u5408\u306F\u3001\u7B2C\u4E09\u8005\u304C\u8AA4\u3063\u3066\u5165\u529B\u3057\u305F\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059\u306E\u3067\u7121\u8996\u3057\u3066\u304F\u3060\u3055\u3044\u3002`
        });
        emailSent = true;
      } catch (mailErr) {
        console.error("Mail delivery failed, falling back to console log:", mailErr);
      }
    }
    console.log(`[PASSWORD RESET] Email: ${email} | Temporary Password: ${tempPassword}`);
    res.json({
      message: emailSent ? "\u4E00\u6642\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u767B\u9332\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u306B\u9001\u4FE1\u3057\u307E\u3057\u305F\u3002\u53D7\u4FE1\u30C8\u30EC\u30A4\u3092\u3054\u78BA\u8A8D\u304F\u3060\u3055\u3044\u3002" : "\u4E00\u6642\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u767A\u884C\u3057\u307E\u3057\u305F\u3002\uFF08\u958B\u767A\u74B0\u5883\u306E\u305F\u3081\u753B\u9762\u306B\u8868\u793A\u3057\u307E\u3059\uFF09",
      tempPasswordForDebug: emailSent ? void 0 : tempPassword
      // SMTP未設定時に画面へ表示するデバッグ用フォールバック
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "\u30D1\u30B9\u30EF\u30FC\u30C9\u306E\u30EA\u30BB\u30C3\u30C8\u51E6\u7406\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F" });
  }
});
app.patch("/api/auth/profile", requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === "") {
    return res.status(400).json({ error: "\u65B0\u3057\u3044\u540D\u524D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" });
  }
  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { name: name.trim() }
    });
    const token = import_jsonwebtoken.default.sign(
      { id: updatedUser.id, email: updatedUser.email, name: updatedUser.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.setHeader(
      "Set-Cookie",
      `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
    );
    res.json({
      message: "\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u540D\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F\uFF01",
      user: { id: updatedUser.id, email: updatedUser.email, name: updatedUser.name }
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u306E\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.patch("/api/auth/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "\u73FE\u5728\u306E\u30D1\u30B9\u30EF\u30FC\u30C9\u3068\u65B0\u3057\u3044\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    if (!user) {
      return res.status(404).json({ error: "\u30E6\u30FC\u30B6\u30FC\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    }
    const isMatch = await import_bcryptjs.default.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: "\u73FE\u5728\u306E\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093" });
    }
    const passwordHash = await import_bcryptjs.default.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash }
    });
    res.json({ message: "\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F\uFF01" });
  } catch (error) {
    console.error("Update password error:", error);
    res.status(500).json({ error: "\u30D1\u30B9\u30EF\u30FC\u30C9\u306E\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.get("/api/favorites", requireAuth, async (req, res) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user.id },
      include: {
        item: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    const items = favorites.map((f) => f.item);
    res.json(items);
  } catch (error) {
    console.error("Fetch favorites error:", error);
    res.status(500).json({ error: "\u304A\u6C17\u306B\u5165\u308A\u4E00\u89A7\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.post("/api/items/:itemId/favorite", requireAuth, async (req, res) => {
  const itemId = parseInt(req.params.itemId);
  if (isNaN(itemId)) {
    return res.status(400).json({ error: "\u4E0D\u6B63\u306A\u6559\u79D1\u66F8ID\u3067\u3059" });
  }
  try {
    const item = await prisma.item.findUnique({
      where: { id: itemId }
    });
    if (!item) {
      return res.status(404).json({ error: "\u6307\u5B9A\u3055\u308C\u305F\u6559\u79D1\u66F8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    }
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_itemId: {
          userId: req.user.id,
          itemId
        }
      }
    });
    if (existing) {
      return res.json({ message: "\u65E2\u306B\u304A\u6C17\u306B\u5165\u308A\u767B\u9332\u3055\u308C\u3066\u3044\u307E\u3059" });
    }
    await prisma.favorite.create({
      data: {
        userId: req.user.id,
        itemId
      }
    });
    res.json({ message: "\u304A\u6C17\u306B\u5165\u308A\u306B\u8FFD\u52A0\u3057\u307E\u3057\u305F\uFF01" });
  } catch (error) {
    console.error("Add favorite error:", error);
    res.status(500).json({ error: "\u304A\u6C17\u306B\u5165\u308A\u306E\u8FFD\u52A0\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.delete("/api/items/:itemId/favorite", requireAuth, async (req, res) => {
  const itemId = parseInt(req.params.itemId);
  if (isNaN(itemId)) {
    return res.status(400).json({ error: "\u4E0D\u6B63\u306A\u6559\u79D1\u66F8ID\u3067\u3059" });
  }
  try {
    await prisma.favorite.deleteMany({
      where: {
        userId: req.user.id,
        itemId
      }
    });
    res.json({ message: "\u304A\u6C17\u306B\u5165\u308A\u304B\u3089\u524A\u9664\u3057\u307E\u3057\u305F\uFF01" });
  } catch (error) {
    console.error("Remove favorite error:", error);
    res.status(500).json({ error: "\u304A\u6C17\u306B\u5165\u308A\u306E\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.post("/api/auth/logout", (req, res) => {
  res.setHeader(
    "Set-Cookie",
    "token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  );
  res.json({ message: "\u30ED\u30B0\u30A2\u30A6\u30C8\u3057\u307E\u3057\u305F" });
});
app.get("/api/auth/me", async (req, res) => {
  const token = getCookie(req, "token");
  if (!token) {
    return res.json({ user: null });
  }
  try {
    const decoded = import_jsonwebtoken.default.verify(token, JWT_SECRET);
    res.json({ user: decoded });
  } catch (error) {
    res.json({ user: null });
  }
});
app.get("/api/items", async (req, res) => {
  const { search } = req.query;
  try {
    const whereClause = {
      isAvailable: true
      // 交換可能なもののみをトップに表示
    };
    if (search && typeof search === "string") {
      whereClause.OR = [
        { title: { contains: search } },
        { author: { contains: search } },
        { courseName: { contains: search } }
      ];
    }
    const items = await prisma.item.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    res.json(items);
  } catch (error) {
    console.error("Fetch items error:", error);
    res.status(500).json({ error: "\u6559\u79D1\u66F8\u4E00\u89A7\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.get("/api/items/my", requireAuth, async (req, res) => {
  try {
    const items = await prisma.item.findMany({
      where: {
        userId: req.user.id
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    res.json(items);
  } catch (error) {
    console.error("Fetch my items error:", error);
    res.status(500).json({ error: "\u81EA\u5206\u306E\u51FA\u54C1\u4E00\u89A7\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.post("/api/items", requireAuth, async (req, res) => {
  const { title, author, courseName, condition, image, comment } = req.body;
  if (!title || !author || !courseName || !condition) {
    return res.status(400).json({ error: "\u5FC5\u9808\u9805\u76EE\uFF08\u30BF\u30A4\u30C8\u30EB\u3001\u8457\u8005\u3001\u6388\u696D\u540D\u3001\u72B6\u614B\uFF09\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" });
  }
  try {
    const item = await prisma.item.create({
      data: {
        title,
        author,
        courseName,
        condition,
        image: image || "",
        // フロントエンドから送られてくる画像データ（Base64形式）
        comment: comment || "",
        userId: req.user.id
      }
    });
    res.json({ message: "\u6559\u79D1\u66F8\u3092\u51FA\u54C1\u3057\u307E\u3057\u305F\uFF01", item });
  } catch (error) {
    console.error("Create item error:", error);
    res.status(500).json({ error: "\u6559\u79D1\u66F8\u306E\u51FA\u54C1\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.put("/api/items/:id", requireAuth, async (req, res) => {
  const itemId = parseInt(req.params.id);
  const { title, author, courseName, condition, image, comment } = req.body;
  if (isNaN(itemId)) {
    return res.status(400).json({ error: "\u4E0D\u6B63\u306A\u6559\u79D1\u66F8ID\u3067\u3059" });
  }
  try {
    const existingItem = await prisma.item.findUnique({
      where: { id: itemId }
    });
    if (!existingItem) {
      return res.status(404).json({ error: "\u6307\u5B9A\u3055\u308C\u305F\u6559\u79D1\u66F8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    }
    if (existingItem.userId !== req.user.id) {
      return res.status(403).json({ error: "\u4ED6\u306E\u30E6\u30FC\u30B6\u30FC\u306E\u51FA\u54C1\u306F\u7DE8\u96C6\u3067\u304D\u307E\u305B\u3093" });
    }
    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: {
        title: title !== void 0 ? title : existingItem.title,
        author: author !== void 0 ? author : existingItem.author,
        courseName: courseName !== void 0 ? courseName : existingItem.courseName,
        condition: condition !== void 0 ? condition : existingItem.condition,
        image: image !== void 0 ? image : existingItem.image,
        comment: comment !== void 0 ? comment : existingItem.comment
      }
    });
    res.json({ message: "\u6559\u79D1\u66F8\u60C5\u5831\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F\uFF01", item: updatedItem });
  } catch (error) {
    console.error("Update item error:", error);
    res.status(500).json({ error: "\u6559\u79D1\u66F8\u60C5\u5831\u306E\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.delete("/api/items/:id", requireAuth, async (req, res) => {
  const itemId = parseInt(req.params.id);
  if (isNaN(itemId)) {
    return res.status(400).json({ error: "\u4E0D\u6B63\u306A\u6559\u79D1\u66F8ID\u3067\u3059" });
  }
  try {
    const existingItem = await prisma.item.findUnique({
      where: { id: itemId }
    });
    if (!existingItem) {
      return res.status(404).json({ error: "\u6307\u5B9A\u3055\u308C\u305F\u6559\u79D1\u66F8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    }
    if (existingItem.userId !== req.user.id) {
      return res.status(403).json({ error: "\u4ED6\u306E\u30E6\u30FC\u30B6\u30FC\u306E\u51FA\u54C1\u306F\u524A\u9664\u3067\u304D\u307E\u305B\u3093" });
    }
    await prisma.item.delete({
      where: { id: itemId }
    });
    res.json({ message: "\u6559\u79D1\u66F8\u3092\u524A\u9664\u3057\u307E\u3057\u305F" });
  } catch (error) {
    console.error("Delete item error:", error);
    res.status(500).json({ error: "\u6559\u79D1\u66F8\u306E\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.post("/api/trades", requireAuth, async (req, res) => {
  const { itemId } = req.body;
  if (!itemId) {
    return res.status(400).json({ error: "\u5BFE\u8C61\u306E\u6559\u79D1\u66F8ID\u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044" });
  }
  try {
    const item = await prisma.item.findUnique({
      where: { id: parseInt(itemId) }
    });
    if (!item) {
      return res.status(404).json({ error: "\u6307\u5B9A\u3055\u308C\u305F\u6559\u79D1\u66F8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    }
    if (!item.isAvailable) {
      return res.status(400).json({ error: "\u3053\u306E\u6559\u79D1\u66F8\u306F\u65E2\u306B\u5225\u306E\u30E6\u30FC\u30B6\u30FC\u3068\u4EA4\u63DB\u6E08\u307F\u3067\u3059" });
    }
    if (item.userId === req.user.id) {
      return res.status(400).json({ error: "\u81EA\u5206\u81EA\u8EAB\u306E\u51FA\u54C1\u306B\u5BFE\u3057\u3066\u4EA4\u63DB\u5E0C\u671B\u3092\u9001\u308B\u3053\u3068\u306F\u3067\u304D\u307E\u305B\u3093" });
    }
    const existingRequest = await prisma.tradeRequest.findFirst({
      where: {
        itemId: item.id,
        senderId: req.user.id
      }
    });
    if (existingRequest) {
      return res.status(400).json({ error: "\u3053\u306E\u6559\u79D1\u66F8\u306B\u306F\u65E2\u306B\u4EA4\u63DB\u7533\u8ACB\u3092\u9001\u4FE1\u6E08\u307F\u3067\u3059" });
    }
    const tradeRequest = await prisma.tradeRequest.create({
      data: {
        itemId: item.id,
        senderId: req.user.id,
        receiverId: item.userId,
        status: "PENDING"
      }
    });
    res.json({ message: "\u4EA4\u63DB\u7533\u8ACB\u3092\u9001\u4FE1\u3057\u307E\u3057\u305F\uFF01", tradeRequest });
  } catch (error) {
    console.error("Create trade request error:", error);
    res.status(500).json({ error: "\u4EA4\u63DB\u5E0C\u671B\u306E\u9001\u4FE1\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.get("/api/trades/history", requireAuth, async (req, res) => {
  try {
    const sent = await prisma.tradeRequest.findMany({
      where: { senderId: req.user.id },
      include: {
        item: true,
        receiver: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    const received = await prisma.tradeRequest.findMany({
      where: { receiverId: req.user.id },
      include: {
        item: true,
        sender: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json({ sent, received });
  } catch (error) {
    console.error("Fetch trade history error:", error);
    res.status(500).json({ error: "\u4EA4\u63DB\u5C65\u6B74\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.post("/api/trades/:id/status", requireAuth, async (req, res) => {
  const requestId = parseInt(req.params.id);
  const { status } = req.body;
  if (isNaN(requestId) || !["APPROVED", "REJECTED"].includes(status)) {
    return res.status(400).json({ error: "\u7121\u52B9\u306A\u30EA\u30AF\u30A8\u30B9\u30C8\u30D1\u30E9\u30E1\u30FC\u30BF\u3067\u3059" });
  }
  try {
    const tradeRequest = await prisma.tradeRequest.findUnique({
      where: { id: requestId },
      include: { item: true }
    });
    if (!tradeRequest) {
      return res.status(404).json({ error: "\u4EA4\u63DB\u30EA\u30AF\u30A8\u30B9\u30C8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    }
    if (tradeRequest.receiverId !== req.user.id) {
      return res.status(403).json({ error: "\u3053\u306E\u30EA\u30AF\u30A8\u30B9\u30C8\u3092\u64CD\u4F5C\u3059\u308B\u6A29\u9650\u304C\u3042\u308A\u307E\u305B\u3093" });
    }
    if (tradeRequest.status !== "PENDING") {
      return res.status(400).json({ error: "\u3053\u306E\u30EA\u30AF\u30A8\u30B9\u30C8\u306F\u65E2\u306B\u51E6\u7406\u6E08\u307F\u3067\u3059" });
    }
    if (status === "APPROVED") {
      await prisma.item.update({
        where: { id: tradeRequest.itemId },
        data: { isAvailable: false }
      });
      const updatedRequest = await prisma.tradeRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED" }
      });
      await prisma.tradeRequest.updateMany({
        where: {
          itemId: tradeRequest.itemId,
          id: { not: requestId },
          status: "PENDING"
        },
        data: { status: "REJECTED" }
      });
      return res.json({
        message: "\u4EA4\u63DB\u30EA\u30AF\u30A8\u30B9\u30C8\u3092\u627F\u8A8D\u3057\u307E\u3057\u305F\uFF01\u53D6\u5F15\u304C\u6210\u7ACB\u3057\u3001\u6559\u79D1\u66F8\u3092\u4EA4\u63DB\u6E08\u307F\u306B\u8A2D\u5B9A\u3057\u307E\u3057\u305F\u3002",
        tradeRequest: updatedRequest
      });
    } else {
      const updatedRequest = await prisma.tradeRequest.update({
        where: { id: requestId },
        data: { status: "REJECTED" }
      });
      return res.json({
        message: "\u4EA4\u63DB\u7533\u8ACB\u3092\u8F9E\u9000\u3057\u307E\u3057\u305F",
        tradeRequest: updatedRequest
      });
    }
  } catch (error) {
    console.error("Update trade status error:", error);
    res.status(500).json({ error: "\u30EA\u30AF\u30A8\u30B9\u30C8\u306E\u51E6\u7406\u4E2D\u306B\u30B5\u30FC\u30D0\u30FC\u3067\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F" });
  }
});
app.get("/api/items/:itemId/comments", async (req, res) => {
  const itemId = parseInt(req.params.itemId);
  if (isNaN(itemId)) {
    return res.status(400).json({ error: "\u4E0D\u6B63\u306A\u6559\u79D1\u66F8ID\u3067\u3059" });
  }
  try {
    const comments = await prisma.comment.findMany({
      where: { itemId },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "asc"
        // チャットなので古い順（時系列順）
      }
    });
    res.json(comments);
  } catch (error) {
    console.error("Fetch comments error:", error);
    res.status(500).json({ error: "\u30B3\u30E1\u30F3\u30C8\u4E00\u89A7\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.post("/api/items/:itemId/comments", requireAuth, async (req, res) => {
  const itemId = parseInt(req.params.itemId);
  const { text } = req.body;
  if (isNaN(itemId)) {
    return res.status(400).json({ error: "\u4E0D\u6B63\u306A\u6559\u79D1\u66F8ID\u3067\u3059" });
  }
  if (!text || text.trim() === "") {
    return res.status(400).json({ error: "\u30B3\u30E1\u30F3\u30C8\u5185\u5BB9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" });
  }
  try {
    const item = await prisma.item.findUnique({
      where: { id: itemId }
    });
    if (!item) {
      return res.status(404).json({ error: "\u6307\u5B9A\u3055\u308C\u305F\u6559\u79D1\u66F8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    }
    const comment = await prisma.comment.create({
      data: {
        text,
        itemId,
        userId: req.user.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    res.json({ message: "\u30B3\u30E1\u30F3\u30C8\u3092\u6295\u7A3F\u3057\u307E\u3057\u305F\uFF01", comment });
  } catch (error) {
    console.error("Create comment error:", error);
    res.status(500).json({ error: "\u30B3\u30E1\u30F3\u30C8\u306E\u6295\u7A3F\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
