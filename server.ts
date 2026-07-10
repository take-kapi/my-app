import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { prisma } from './src/db/prisma';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'textbook-exchange-secret-key-123456';

// JSONのリクエストボディをパース
app.use(express.json());

// クッキーパーサー（ライブラリ依存を減らすためシンプルなヘルパーを自作）
function getCookie(req: express.Request, name: string): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    const [key, value] = cookie.split('=');
    if (key === name) return decodeURIComponent(value);
  }
  return null;
}

// Expressのリクエスト型を拡張してユーザープロパティを追加
export interface AuthenticatedRequest extends express.Request {
  user?: {
    id: number;
    email: string;
    name: string;
  };
}

// 認証チェック用のミドルウェア
const requireAuth = async (
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
) => {
  const token = getCookie(req, 'token');
  if (!token) {
    return res.status(401).json({ error: 'ログインが必要です' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
      name: string;
    };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'セッションの期限が切れました。再ログインしてください' });
  }
};

// ==========================================
// 【ユーザー認証API】
// ==========================================

// 1. 新規ユーザー登録
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'すべての必須項目（名前、メールアドレス、パスワード）を入力してください' });
  }

  // 慶應義塾大学メールアドレス制限の検証
  if (!/@([a-zA-Z0-9-]+\.)*keio\.jp$/i.test(email)) {
    return res.status(400).json({ error: '慶應義塾大学のメールアドレス（@keio.jpなど）のみ登録可能です' });
  }

  try {
    // 重複アカウントチェック
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
    }

    // パスワードの安全なハッシュ化
    const passwordHash = await bcrypt.hash(password, 10);

    // ユーザーデータベースへの保存
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
    });

    // セッション認証トークン（JWT）の生成
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // セキュアCookieとしてレスポンスに設定（JavaScriptからアクセス不可のHttpOnly属性付き）
    res.setHeader(
      'Set-Cookie',
      `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
    );

    res.json({
      message: 'アカウントの登録が完了しました！',
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'アカウントの登録中にサーバーでエラーが発生しました' });
  }
});

// 2. ログイン
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'メールアドレスとパスワードを入力してください' });
  }

  // ログイン時も念のため慶應メールアドレス検証
  if (!/@([a-zA-Z0-9-]+\.)*keio\.jp$/i.test(email)) {
    return res.status(400).json({ error: '慶應義塾大学のメールアドレスのみログイン可能です' });
  }

  try {
    // ユーザー検索
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
    }

    // ハッシュ値の比較検証
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
    }

    // トークン生成
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // クッキーを設定
    res.setHeader(
      'Set-Cookie',
      `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
    );

    res.json({
      message: 'ログインしました！',
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'ログイン処理中にサーバーでエラーが発生しました' });
  }
});

// 2.5 ログインパスワードを忘れたときの一時パスワード発行（メール送信）
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'メールアドレスを入力してください' });
  }

  if (!/@([a-zA-Z0-9-]+\.)*keio\.jp$/i.test(email)) {
    return res.status(400).json({ error: '慶應義塾大学のメールアドレスのみリセット可能です' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ error: 'このメールアドレスで登録されているユーザーが見つかりません' });
    }

    // ランダムな一時パスワードの生成 (keio-temp-xxxxxx)
    const tempPassword = 'keio-temp-' + Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // データベースを更新して一時パスワードを保存
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // メール送信設定
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');

    let emailSent = false;

    if (smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        await transporter.sendMail({
          from: `"慶應教科書交換プラットフォーム" <${smtpUser}>`,
          to: email,
          subject: '【慶應教科書交換】一時パスワード発行のお知らせ',
          text: `${user.name} 様\n\n慶應教科書交換プラットフォームをご利用いただきありがとうございます。\n\nログイン用の「一時パスワード」を発行いたしました。\n\n一時パスワード: ${tempPassword}\n\nログイン完了後、マイページよりパスワードを新しい安全なものに変更してください。\n※このメールに心当たりがない場合は、第三者が誤って入力した可能性がありますので無視してください。`,
        });
        emailSent = true;
      } catch (mailErr) {
        console.error('Mail delivery failed, falling back to console log:', mailErr);
      }
    }

    // 開発/デバッグ用としてコンソールログに確実に出力
    console.log(`[PASSWORD RESET] Email: ${email} | Temporary Password: ${tempPassword}`);

    res.json({
      message: emailSent
        ? '一時パスワードを登録メールアドレスに送信しました。受信トレイをご確認ください。'
        : '一時パスワードを発行しました。（開発環境のため画面に表示します）',
      tempPasswordForDebug: emailSent ? undefined : tempPassword, // SMTP未設定時に画面へ表示するデバッグ用フォールバック
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'パスワードのリセット処理中にエラーが発生しました' });
  }
});

// 2.6 プロフィール編集 (名前変更)
app.patch('/api/auth/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: '新しい名前を入力してください' });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name: name.trim() },
    });

    // ログイン中のセッションJWTトークンを更新
    const token = jwt.sign(
      { id: updatedUser.id, email: updatedUser.email, name: updatedUser.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.setHeader(
      'Set-Cookie',
      `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
    );

    res.json({
      message: 'プロフィール名を更新しました！',
      user: { id: updatedUser.id, email: updatedUser.email, name: updatedUser.name },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'プロフィールの更新に失敗しました' });
  }
});

// 2.7 ログインパスワード変更
app.patch('/api/auth/password', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: '現在のパスワードと新しいパスワードを入力してください' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: '現在のパスワードが正しくありません' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { passwordHash },
    });

    res.json({ message: 'パスワードを更新しました！' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'パスワードの更新に失敗しました' });
  }
});

// ==========================================
// 【お気に入り機能API】
// ==========================================

// 1. お気に入り一覧を取得
app.get('/api/favorites', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user!.id },
      include: {
        item: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      }
    });

    const items = favorites.map(f => f.item);
    res.json(items);
  } catch (error) {
    console.error('Fetch favorites error:', error);
    res.status(500).json({ error: 'お気に入り一覧の取得に失敗しました' });
  }
});

// 2. お気に入り追加
app.post('/api/items/:itemId/favorite', requireAuth, async (req: AuthenticatedRequest, res) => {
  const itemId = parseInt(req.params.itemId);
  if (isNaN(itemId)) {
    return res.status(400).json({ error: '不正な教科書IDです' });
  }

  try {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return res.status(404).json({ error: '指定された教科書が見つかりません' });
    }

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_itemId: {
          userId: req.user!.id,
          itemId,
        }
      }
    });

    if (existing) {
      return res.json({ message: '既にお気に入り登録されています' });
    }

    await prisma.favorite.create({
      data: {
        userId: req.user!.id,
        itemId,
      }
    });

    res.json({ message: 'お気に入りに追加しました！' });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ error: 'お気に入りの追加に失敗しました' });
  }
});

// 3. お気に入り削除
app.delete('/api/items/:itemId/favorite', requireAuth, async (req: AuthenticatedRequest, res) => {
  const itemId = parseInt(req.params.itemId);
  if (isNaN(itemId)) {
    return res.status(400).json({ error: '不正な教科書IDです' });
  }

  try {
    await prisma.favorite.deleteMany({
      where: {
        userId: req.user!.id,
        itemId,
      }
    });

    res.json({ message: 'お気に入りから削除しました！' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ error: 'お気に入りの削除に失敗しました' });
  }
});

// 3. ログアウト
app.post('/api/auth/logout', (req, res) => {
  // Max-Age=0 にしてクッキーを即時削除
  res.setHeader(
    'Set-Cookie',
    'token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );
  res.json({ message: 'ログアウトしました' });
});

// 4. 現在のログインユーザー情報（セッションチェック）
app.get('/api/auth/me', async (req: AuthenticatedRequest, res) => {
  const token = getCookie(req, 'token');
  if (!token) {
    return res.json({ user: null });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
      name: string;
    };
    res.json({ user: decoded });
  } catch (error) {
    res.json({ user: null });
  }
});

// ==========================================
// 【教科書管理API】
// ==========================================

// 1. 教科書一覧の取得（タイトル・著者・授業名の部分一致検索対応）
app.get('/api/items', async (req, res) => {
  const { search } = req.query;
  try {
    const whereClause: any = {
      isAvailable: true, // 交換可能なもののみをトップに表示
    };

    if (search && typeof search === 'string') {
      whereClause.OR = [
        { title: { contains: search } },
        { author: { contains: search } },
        { courseName: { contains: search } },
      ];
    }

    const items = await prisma.item.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(items);
  } catch (error) {
    console.error('Fetch items error:', error);
    res.status(500).json({ error: '教科書一覧の取得に失敗しました' });
  }
});

// 2. 自分の出品一覧の取得（マイページ用）
app.get('/api/items/my', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const items = await prisma.item.findMany({
      where: {
        userId: req.user!.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.json(items);
  } catch (error) {
    console.error('Fetch my items error:', error);
    res.status(500).json({ error: '自分の出品一覧の取得に失敗しました' });
  }
});

// 3. 教科書の新規出品登録
app.post('/api/items', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { title, author, courseName, condition, image, comment } = req.body;

  if (!title || !author || !courseName || !condition) {
    return res.status(400).json({ error: '必須項目（タイトル、著者、授業名、状態）を入力してください' });
  }

  try {
    const item = await prisma.item.create({
      data: {
        title,
        author,
        courseName,
        condition,
        image: image || '', // フロントエンドから送られてくる画像データ（Base64形式）
        comment: comment || '',
        userId: req.user!.id,
      },
    });

    res.json({ message: '教科書を出品しました！', item });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: '教科書の出品に失敗しました' });
  }
});

// 4. 教科書の編集（自分の出品のみ編集可能）
app.put('/api/items/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const itemId = parseInt(req.params.id);
  const { title, author, courseName, condition, image, comment } = req.body;

  if (isNaN(itemId)) {
    return res.status(400).json({ error: '不正な教科書IDです' });
  }

  try {
    const existingItem = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      return res.status(404).json({ error: '指定された教科書が見つかりません' });
    }

    // 権限チェック（自分の出品のみ編集可能）
    if (existingItem.userId !== req.user!.id) {
      return res.status(403).json({ error: '他のユーザーの出品は編集できません' });
    }

    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: {
        title: title !== undefined ? title : existingItem.title,
        author: author !== undefined ? author : existingItem.author,
        courseName: courseName !== undefined ? courseName : existingItem.courseName,
        condition: condition !== undefined ? condition : existingItem.condition,
        image: image !== undefined ? image : existingItem.image,
        comment: comment !== undefined ? comment : existingItem.comment,
      },
    });

    res.json({ message: '教科書情報を更新しました！', item: updatedItem });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: '教科書情報の更新に失敗しました' });
  }
});

// 5. 教科書の削除（自分の出品のみ削除可能）
app.delete('/api/items/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const itemId = parseInt(req.params.id);

  if (isNaN(itemId)) {
    return res.status(400).json({ error: '不正な教科書IDです' });
  }

  try {
    const existingItem = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      return res.status(404).json({ error: '指定された教科書が見つかりません' });
    }

    // 権限チェック（自分の出品のみ削除可能）
    if (existingItem.userId !== req.user!.id) {
      return res.status(403).json({ error: '他のユーザーの出品は削除できません' });
    }

    // 関連するリクエストもろとも削除 (schemaのonDelete: Cascadeにより自動で削除されます)
    await prisma.item.delete({
      where: { id: itemId },
    });

    res.json({ message: '教科書を削除しました' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: '教科書の削除に失敗しました' });
  }
});

// ==========================================
// 【交換リクエストAPI】
// ==========================================

// 1. 交換希望リクエストの送信
app.post('/api/trades', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { itemId } = req.body;

  if (!itemId) {
    return res.status(400).json({ error: '対象の教科書IDを指定してください' });
  }

  try {
    const item = await prisma.item.findUnique({
      where: { id: parseInt(itemId) },
    });

    if (!item) {
      return res.status(404).json({ error: '指定された教科書が見つかりません' });
    }

    if (!item.isAvailable) {
      return res.status(400).json({ error: 'この教科書は既に別のユーザーと交換済みです' });
    }

    // 自画自賛（自分への交換申請）の防止
    if (item.userId === req.user!.id) {
      return res.status(400).json({ error: '自分自身の出品に対して交換希望を送ることはできません' });
    }

    // 重複申請チェック
    const existingRequest = await prisma.tradeRequest.findFirst({
      where: {
        itemId: item.id,
        senderId: req.user!.id,
      },
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'この教科書には既に交換申請を送信済みです' });
    }

    // 交換リクエストレコードを作成
    const tradeRequest = await prisma.tradeRequest.create({
      data: {
        itemId: item.id,
        senderId: req.user!.id,
        receiverId: item.userId,
        status: 'PENDING',
      },
    });

    res.json({ message: '交換申請を送信しました！', tradeRequest });
  } catch (error) {
    console.error('Create trade request error:', error);
    res.status(500).json({ error: '交換希望の送信に失敗しました' });
  }
});

// 2. 交換申請・履歴一覧の取得（送信・受信の履歴）
app.get('/api/trades/history', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    // 自分が送信した（交換を申し込んだ）履歴
    const sent = await prisma.tradeRequest.findMany({
      where: { senderId: req.user!.id },
      include: {
        item: true,
        receiver: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 自分が受信した（出品に対して申し込まれた）履歴
    const received = await prisma.tradeRequest.findMany({
      where: { receiverId: req.user!.id },
      include: {
        item: true,
        sender: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ sent, received });
  } catch (error) {
    console.error('Fetch trade history error:', error);
    res.status(500).json({ error: '交換履歴の取得に失敗しました' });
  }
});

// 3. 交換リクエストの承認・拒否
app.post('/api/trades/:id/status', requireAuth, async (req: AuthenticatedRequest, res) => {
  const requestId = parseInt(req.params.id);
  const { status } = req.body; // "APPROVED" または "REJECTED"

  if (isNaN(requestId) || !['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: '無効なリクエストパラメータです' });
  }

  try {
    const tradeRequest = await prisma.tradeRequest.findUnique({
      where: { id: requestId },
      include: { item: true },
    });

    if (!tradeRequest) {
      return res.status(404).json({ error: '交換リクエストが見つかりません' });
    }

    // 受信者（出品者本人）であることを検証
    if (tradeRequest.receiverId !== req.user!.id) {
      return res.status(403).json({ error: 'このリクエストを操作する権限がありません' });
    }

    if (tradeRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'このリクエストは既に処理済みです' });
    }

    if (status === 'APPROVED') {
      // 承認時：
      // A. 対象の教科書を交換不可（取引成立）に設定
      await prisma.item.update({
        where: { id: tradeRequest.itemId },
        data: { isAvailable: false },
      });

      // B. 承認されたリクエスト自体のステータスを APPROVED に更新
      const updatedRequest = await prisma.tradeRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED' },
      });

      // C. 同じ教科書に対して並行して出されていた他のPENDINGリクエストを自動的にREJECTED（拒否）にする
      await prisma.tradeRequest.updateMany({
        where: {
          itemId: tradeRequest.itemId,
          id: { not: requestId },
          status: 'PENDING',
        },
        data: { status: 'REJECTED' },
      });

      return res.json({
        message: '交換リクエストを承認しました！取引が成立し、教科書を交換済みに設定しました。',
        tradeRequest: updatedRequest
      });
    } else {
      // 拒否時：
      // このリクエストのみ REJECTED に更新（教科書の交換可能状態は維持）
      const updatedRequest = await prisma.tradeRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' },
      });

      return res.json({
        message: '交換申請を辞退しました',
        tradeRequest: updatedRequest
      });
    }
  } catch (error) {
    console.error('Update trade status error:', error);
    res.status(500).json({ error: 'リクエストの処理中にサーバーでエラーが発生しました' });
  }
});

// ==========================================
// 【オープンチャット（コメント）API】
// ==========================================

// 1. 指定された教科書のコメント一覧を取得
app.get('/api/items/:itemId/comments', async (req, res) => {
  const itemId = parseInt(req.params.itemId);
  if (isNaN(itemId)) {
    return res.status(400).json({ error: '不正な教科書IDです' });
  }

  try {
    const comments = await prisma.comment.findMany({
      where: { itemId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc', // チャットなので古い順（時系列順）
      },
    });
    res.json(comments);
  } catch (error) {
    console.error('Fetch comments error:', error);
    res.status(500).json({ error: 'コメント一覧の取得に失敗しました' });
  }
});

// 2. コメントの新規投稿
app.post('/api/items/:itemId/comments', requireAuth, async (req: AuthenticatedRequest, res) => {
  const itemId = parseInt(req.params.itemId);
  const { text } = req.body;

  if (isNaN(itemId)) {
    return res.status(400).json({ error: '不正な教科書IDです' });
  }

  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'コメント内容を入力してください' });
  }

  try {
    // 対象の教科書が存在するかチェック
    const item = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return res.status(404).json({ error: '指定された教科書が見つかりません' });
    }

    const comment = await prisma.comment.create({
      data: {
        text,
        itemId,
        userId: req.user!.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({ message: 'コメントを投稿しました！', comment });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'コメントの投稿に失敗しました' });
  }
});

// ==========================================
// 【Vite ミドルウェア & 静的ファイル配信】
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // 開発環境：ViteデブサーバーをマウントしてHMRやアセットローダーを機能させる
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // 本番環境：ビルドされた静的ファイルを配信
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
