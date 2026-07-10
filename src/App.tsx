import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, GraduationCap, PlusCircle, User, LogOut, LogIn, ArrowLeftRight, HelpCircle, RefreshCw } from 'lucide-react';
import { User as UserType, Item, TradeRequest, ActiveTab } from './types';
import AuthModal from './components/AuthModal';
import ItemGrid from './components/ItemGrid';
import ItemForm from './components/ItemForm';
import MyPage from './components/MyPage';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  
  // Data States
  const [items, setItems] = useState<Item[]>([]);
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<TradeRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<TradeRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Loading & Edit states
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingMyPage, setLoadingMyPage] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // 1. 初回マウント時：セッションユーザーの確認
  useEffect(() => {
    checkUserSession();
  }, []);

  // 2. 検索キーワードまたはアクティブタブの変更時に教科書一覧を取得
  useEffect(() => {
    fetchItems();
  }, [searchQuery, activeTab]);

  // 3. マイページタブまたはログイン状態の変化時にマイページデータを取得
  useEffect(() => {
    if (activeTab === 'mypage' && currentUser) {
      fetchMyPageData();
    }
  }, [activeTab, currentUser]);

  const checkUserSession = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      if (data.user) {
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error('Session check failed:', err);
    }
  };

  const fetchItems = async () => {
    setLoadingItems(true);
    try {
      const url = searchQuery
        ? `/api/items?search=${encodeURIComponent(searchQuery)}`
        : '/api/items';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (err) {
      console.error('Failed to fetch items:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  const fetchMyPageData = async () => {
    setLoadingMyPage(true);
    try {
      // 自分の出品の取得
      const itemsRes = await fetch('/api/items/my');
      const itemsData = await itemsRes.json();
      
      // 交換履歴の取得
      const historyRes = await fetch('/api/trades/history');
      const historyData = await historyRes.json();

      if (itemsRes.ok && historyRes.ok) {
        setMyItems(itemsData);
        setReceivedRequests(historyData.received || []);
        setSentRequests(historyData.sent || []);
      }
    } catch (err) {
      console.error('Failed to fetch mypage data:', err);
    } finally {
      setLoadingMyPage(false);
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        setCurrentUser(null);
        setActiveTab('home');
        setMyItems([]);
        setReceivedRequests([]);
        setSentRequests([]);
      }
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // 認証成功時
  const handleAuthSuccess = (user: UserType) => {
    setCurrentUser(user);
    // モーダルを閉じ、もともと開こうとしていたページをリロード
    setIsAuthOpen(false);
  };

  // 出品削除処理
  const handleDeleteItem = async (itemId: number) => {
    try {
      const response = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
      if (response.ok) {
        fetchMyPageData(); // マイページの再ロード
        fetchItems(); // ホーム一覧の同期
      } else {
        const data = await response.json();
        alert(data.error || '削除に失敗しました');
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // 交換申請への回答 (承認 / 拒否)
  const handleRespondRequest = async (requestId: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      const response = await fetch(`/api/trades/${requestId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        await fetchMyPageData(); // ステータス変更後にデータをリロード
        fetchItems(); // 交換完了に伴いavailableから除外するためホームを同期
      } else {
        const data = await response.json();
        alert(data.error || '申請の回答処理に失敗しました');
      }
    } catch (err) {
      console.error('Respond request failed:', err);
    }
  };

  // タブ切り替え時のインターセプト（ログインチェック）
  const handleTabChange = (tab: ActiveTab) => {
    if ((tab === 'sell' || tab === 'mypage') && !currentUser) {
      setIsAuthOpen(true);
      return;
    }
    setEditingItem(null); // 出品フォームを開く前に編集状態をクリア
    setActiveTab(tab);
  };

  return (
    <div id="app-root" className="min-h-screen bg-gray-50 flex flex-col text-gray-800 selection:bg-teal-500 selection:text-white">
      {/* 1. Global Navigation Header */}
      <header id="main-header" className="sticky top-0 z-40 w-full bg-white border-b border-gray-150 shadow-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo */}
            <div
              id="app-logo"
              onClick={() => { setActiveTab('home'); setEditingItem(null); }}
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 active:scale-99 transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-emerald-500 text-white shadow-md shadow-teal-600/15">
                <ArrowLeftRight className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-base font-bold text-gray-900 tracking-tight font-sans leading-none">
                  Textbook Exchange
                </span>
                <span className="text-[10px] text-gray-400 font-medium tracking-wide">
                  キャンパス教科書交換
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav id="header-nav" className="hidden md:flex items-center gap-1.5">
              <button
                id="nav-btn-home"
                onClick={() => handleTabChange('home')}
                className={`flex items-center gap-2 rounded-xl py-2 px-4 text-sm font-semibold tracking-wide transition-all cursor-pointer ${
                  activeTab === 'home'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <BookOpen className="h-4.5 w-4.5" />
                <span>教科書を探す</span>
              </button>

              <button
                id="nav-btn-sell"
                onClick={() => handleTabChange('sell')}
                className={`flex items-center gap-2 rounded-xl py-2 px-4 text-sm font-semibold tracking-wide transition-all cursor-pointer ${
                  activeTab === 'sell'
                    ? 'bg-teal-550/10 text-teal-700 font-bold bg-teal-50'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <PlusCircle className="h-4.5 w-4.5" />
                <span>出品する</span>
              </button>

              <button
                id="nav-btn-mypage"
                onClick={() => handleTabChange('mypage')}
                className={`flex items-center gap-2 rounded-xl py-2 px-4 text-sm font-semibold tracking-wide transition-all cursor-pointer ${
                  activeTab === 'mypage'
                    ? 'bg-teal-550/10 text-teal-700 font-bold bg-teal-50'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <User className="h-4.5 w-4.5" />
                <span>マイページ</span>
              </button>
            </nav>

            {/* User Session Utilities */}
            <div id="session-box" className="flex items-center gap-3">
              {currentUser ? (
                <div className="flex items-center gap-3">
                  {/* Logged in info */}
                  <div className="hidden sm:flex flex-col items-end text-right">
                    <span className="text-xs font-bold text-gray-900 leading-none">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-1 font-medium">
                      ログイン中
                    </span>
                  </div>
                  {/* Logout Button */}
                  <button
                    id="header-logout-btn"
                    onClick={handleLogout}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600 active:scale-98 transition-all cursor-pointer"
                    title="ログアウト"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                  </button>
                </div>
              ) : (
                <button
                  id="header-login-btn"
                  onClick={() => setIsAuthOpen(true)}
                  className="flex items-center gap-2 rounded-xl bg-teal-600 py-2.5 px-4.5 text-xs font-bold text-white shadow-md shadow-teal-600/10 hover:bg-teal-700 active:scale-98 transition-all cursor-pointer"
                >
                  <LogIn className="h-4 w-4" />
                  <span>ログイン / 新規登録</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Workspace */}
      <main id="main-content" className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <ItemGrid
                items={items}
                currentUser={currentUser}
                onOpenAuth={() => setIsAuthOpen(true)}
                onTradeRequested={fetchItems} // 自身の交換申請時に表示リロード
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            </motion.div>
          )}

          {activeTab === 'sell' && (
            <motion.div
              key="sell-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <ItemForm
                editingItem={editingItem}
                onSuccess={() => {
                  setEditingItem(null);
                  setActiveTab('mypage'); // 登録後はマイページ(出品一覧)に飛ばす
                }}
                onCancel={editingItem ? () => setEditingItem(null) : undefined}
              />
            </motion.div>
          )}

          {activeTab === 'mypage' && currentUser && (
            <motion.div
              key="mypage-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* If editing nested item within mypage, show overlay form */}
              {editingItem ? (
                <div id="mypage-edit-container">
                  <div className="mb-4">
                    <button
                      id="exit-edit-mode"
                      onClick={() => setEditingItem(null)}
                      className="flex items-center gap-1.5 text-xs text-teal-600 font-bold hover:underline cursor-pointer"
                    >
                      &larr; 戻る
                    </button>
                  </div>
                  <ItemForm
                    editingItem={editingItem}
                    onSuccess={() => {
                      setEditingItem(null);
                      fetchMyPageData();
                    }}
                    onCancel={() => setEditingItem(null)}
                  />
                </div>
              ) : (
                <MyPage
                  currentUser={currentUser}
                  onUpdateUser={(updatedUser) => {
                    setCurrentUser(updatedUser);
                  }}
                  myItems={myItems}
                  receivedRequests={receivedRequests}
                  sentRequests={sentRequests}
                  onEditItem={(item) => setEditingItem(item)}
                  onDeleteItem={handleDeleteItem}
                  onRespondRequest={handleRespondRequest}
                  loading={loadingMyPage}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 3. Mobile Footer Sticky Navigation */}
      <footer id="mobile-sticky-nav" className="sticky bottom-0 z-40 w-full border-t border-gray-150 bg-white md:hidden shadow-lg">
        <div className="grid grid-cols-3 h-14">
          <button
            id="mobile-nav-home"
            onClick={() => handleTabChange('home')}
            className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'home' ? 'text-teal-600 font-bold' : 'text-gray-400'
            }`}
          >
            <BookOpen className="h-5 w-5" />
            <span className="text-[10px]">探す</span>
          </button>

          <button
            id="mobile-nav-sell"
            onClick={() => handleTabChange('sell')}
            className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'sell' ? 'text-teal-600 font-bold' : 'text-gray-400'
            }`}
          >
            <PlusCircle className="h-5 w-5" />
            <span className="text-[10px]">出品</span>
          </button>

          <button
            id="mobile-nav-mypage"
            onClick={() => handleTabChange('mypage')}
            className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'mypage' ? 'text-teal-600 font-bold' : 'text-gray-400'
            }`}
          >
            <User className="h-5 w-5" />
            <span className="text-[10px]">マイページ</span>
          </button>
        </div>
      </footer>

      {/* 4. Global Auth Modal Overlay */}
      <AnimatePresence>
        {isAuthOpen && (
          <AuthModal
            isOpen={isAuthOpen}
            onClose={() => setIsAuthOpen(false)}
            onSuccess={handleAuthSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
