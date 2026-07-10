import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Book, User, GraduationCap, MapPin, Send, CheckCircle2, MessageSquare, Heart } from 'lucide-react';
import { Item, User as UserType } from '../types';
import ChatModal from './ChatModal';

interface ItemGridProps {
  items: Item[];
  currentUser: UserType | null;
  onOpenAuth: () => void;
  onTradeRequested: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function ItemGrid({
  items,
  currentUser,
  onOpenAuth,
  onTradeRequested,
  searchQuery,
  setSearchQuery,
}: ItemGridProps) {
  const [requestingId, setRequestingId] = useState<number | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);
  const [errorText, setErrorText] = useState('');
  const [activeChatItem, setActiveChatItem] = useState<Item | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (currentUser) {
      fetchFavorites();
    } else {
      setFavoriteIds(new Set());
    }
  }, [currentUser]);

  useEffect(() => {
    const handleSync = () => {
      if (currentUser) fetchFavorites();
    };
    window.addEventListener('favoritesUpdated', handleSync);
    return () => window.removeEventListener('favoritesUpdated', handleSync);
  }, [currentUser]);

  const fetchFavorites = async () => {
    try {
      const response = await fetch('/api/favorites');
      if (response.ok) {
        const data = await response.json();
        const ids = new Set<number>(data.map((item: any) => item.id));
        setFavoriteIds(ids);
      }
    } catch (err) {
      console.error('Failed to fetch favorite ids:', err);
    }
  };

  const handleToggleFavorite = async (itemId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    const isFav = favoriteIds.has(itemId);
    const method = isFav ? 'DELETE' : 'POST';

    try {
      const response = await fetch(`/api/items/${itemId}/favorite`, { method });
      if (response.ok) {
        const newIds = new Set(favoriteIds);
        if (isFav) {
          newIds.delete(itemId);
        } else {
          newIds.add(itemId);
        }
        setFavoriteIds(newIds);
        window.dispatchEvent(new CustomEvent('favoritesUpdated'));
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleRequestTrade = async (itemId: number) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    setRequestingId(itemId);
    setErrorText('');

    try {
      const response = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });

      let data: any = {};
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const textResponse = await response.text();
        throw new Error(textResponse || `サーバーエラーが発生しました (ステータス: ${response.status})`);
      }

      if (!response.ok) {
        throw new Error(data.error || '交換申請に失敗しました');
      }

      setSuccessId(itemId);
      onTradeRequested();

      // 3秒後に成功メッセージを消す
      setTimeout(() => {
        setSuccessId(null);
      }, 3000);
    } catch (err: any) {
      setErrorText(err.message);
      // エラー表示を3秒後に消す
      setTimeout(() => {
        setErrorText('');
      }, 3000);
    } finally {
      setRequestingId(null);
    }
  };

  const getConditionStyle = (condition: string) => {
    switch (condition) {
      case '新品同様':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case '目立った傷なし':
        return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'やや傷や汚れあり':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case '書き込み・使用感あり':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  return (
    <div id="item-grid-section" className="space-y-8">
      {/* Search Header */}
      <div id="search-container" className="rounded-2xl bg-white p-6 shadow-xs border border-gray-100">
        <div id="search-title-box" className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight font-sans">
            教科書を探す
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            タイトル、授業名、著者名から今学期必要な教科書をクイック検索
          </p>
        </div>

        <div id="search-input-wrapper" className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
            <Search className="h-5 w-5" />
          </span>
          <input
            id="textbook-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="例：ミクロ経済学、統計学、慶應 太郎、プログラミング基礎..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-12 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Grid List */}
      {items.length === 0 ? (
        <div id="no-items-fallback" className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 px-4 text-center border border-dashed border-gray-200">
          <div className="rounded-full bg-teal-50 p-4 text-teal-600 mb-4">
            <Book className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 font-sans">
            該当する教科書が見つかりません
          </h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm">
            検索キーワードを変えるか、まだ誰も登録していない可能性があります。自分で出品してみませんか？
          </p>
        </div>
      ) : (
        <div id="textbooks-grid" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const isOwnItem = currentUser && item.userId === currentUser.id;

            return (
              <motion.div
                id={`book-card-${item.id}`}
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="group flex flex-col overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-xs hover:shadow-md hover:border-teal-100 transition-all duration-300 relative"
              >
                {/* Book Cover Area */}
                <div id={`cover-wrapper-${item.id}`} className="relative aspect-[4/3] w-full overflow-hidden bg-gray-50 border-b border-gray-100 flex items-center justify-center">
                  {item.image ? (
                    <img
                      id={`book-image-${item.id}`}
                      src={item.image}
                      alt={item.title}
                      className="h-full w-full object-cover group-hover:scale-102 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    // Beautiful custom book graphic as fallback
                    <div id={`book-placeholder-${item.id}`} className="h-full w-full bg-gradient-to-br from-teal-500/10 to-emerald-500/5 p-4 flex flex-col justify-between relative overflow-hidden">
                      {/* Decorative pattern */}
                      <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-teal-600/5" />
                      <div className="absolute -left-12 -bottom-12 w-32 h-32 rounded-full bg-emerald-600/5" />
                      
                      <div className="flex justify-between items-center z-10">
                        <span className="text-[10px] font-bold font-mono tracking-widest text-teal-700/60 uppercase">
                          Academic Book
                        </span>
                        <Book className="h-5 w-5 text-teal-600/40" />
                      </div>

                      <div className="my-auto text-center px-4 z-10">
                        <span className="block text-base font-bold text-gray-800 line-clamp-2 leading-snug tracking-tight mb-1">
                          {item.title}
                        </span>
                        <span className="block text-xs text-gray-500 truncate">
                          {item.author}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-teal-800/50 font-medium z-10 border-t border-teal-500/10 pt-2">
                        <span>授業: {item.courseName}</span>
                        <span>Univ. Ex</span>
                      </div>
                    </div>
                  )}

                  {/* Absolute badges (top left) */}
                  <div className="absolute left-3 top-3 flex flex-col gap-2.5 z-10">
                    <span
                      id={`condition-badge-${item.id}`}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-xs ${getConditionStyle(
                        item.condition
                      )}`}
                    >
                      {item.condition}
                    </span>

                    {isOwnItem && (
                      <span
                        id={`own-badge-${item.id}`}
                        className="rounded-lg bg-teal-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs"
                      >
                        自分の出品
                      </span>
                    )}
                  </div>

                  {/* Favorite toggle button (top right) */}
                  <button
                    id={`fav-toggle-btn-${item.id}`}
                    onClick={(e) => handleToggleFavorite(item.id, e)}
                    className="absolute right-3 top-3 z-10 flex h-8.5 w-8.5 items-center justify-center rounded-full bg-white/85 backdrop-blur-xs text-gray-500 hover:text-rose-500 hover:bg-white shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    title={favoriteIds.has(item.id) ? 'お気に入りから外す' : 'お気に入りに追加'}
                  >
                    <Heart
                      className={`h-4.5 w-4.5 transition-all ${
                        favoriteIds.has(item.id) ? 'fill-rose-500 text-rose-500 scale-110' : 'text-gray-400 hover:text-rose-400'
                      }`}
                    />
                  </button>
                </div>

                {/* Content Details */}
                <div id={`details-${item.id}`} className="flex flex-1 flex-col p-5">
                  <div className="flex-1 space-y-3.5">
                    {/* Title */}
                    <div>
                      <h3 className="text-base font-bold text-gray-900 group-hover:text-teal-600 transition-colors line-clamp-1 leading-snug font-sans">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">著者: {item.author}</p>
                    </div>

                    {/* Metadata items */}
                    <div className="space-y-2 text-xs text-gray-600 border-t border-gray-50 pt-3">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-teal-500/70" />
                        <span className="font-medium truncate">授業名: <strong className="text-gray-900 font-normal">{item.courseName}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-teal-500/70" />
                        <span className="font-medium">出品者: <span className="text-gray-900">{item.user?.name || '匿名ユーザー'}</span></span>
                      </div>
                    </div>

                    {/* Comment */}
                    {item.comment && (
                      <div className="rounded-xl bg-gray-50 p-2.5 text-xs text-gray-500 flex gap-2 items-start">
                        <MessageSquare className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                        <p className="line-clamp-2 italic leading-relaxed">
                          「{item.comment}」
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div id={`action-box-${item.id}`} className="mt-5 border-t border-gray-50 pt-4 space-y-2">
                    {successId === item.id ? (
                      <div id={`success-alert-${item.id}`} className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-2.5 text-sm font-bold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>交換申請を送信しました！</span>
                      </div>
                    ) : isOwnItem ? (
                      <div className="space-y-2">
                        <button
                          id={`own-chat-btn-${item.id}`}
                          onClick={() => setActiveChatItem(item)}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-50 py-2.5 font-semibold text-teal-700 hover:bg-teal-100 transition-all cursor-pointer text-sm"
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span>オープンチャットを開く</span>
                        </button>
                        <div className="text-center text-[10px] text-gray-400 font-medium">
                          ※マイページから編集・削除が可能です
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          id={`chat-btn-${item.id}`}
                          onClick={() => setActiveChatItem(item)}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer text-sm"
                          title="オープンチャットを開く"
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span className="sm:inline">チャット</span>
                        </button>
                        <button
                          id={`request-trade-btn-${item.id}`}
                          onClick={() => handleRequestTrade(item.id)}
                          disabled={requestingId === item.id}
                          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 font-semibold text-white hover:bg-teal-700 disabled:bg-gray-100 disabled:text-gray-400 transition-all cursor-pointer text-sm"
                        >
                          <Send className="h-4 w-4" />
                          <span>{requestingId === item.id ? '申請送信中...' : '交換を希望'}</span>
                        </button>
                      </div>
                    )}

                    {errorText && successId !== item.id && (
                      <p className="mt-1.5 text-center text-[10px] font-medium text-red-500">
                        {errorText}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Item Open Chat Modal */}
      {activeChatItem && (
        <ChatModal
          item={activeChatItem}
          currentUser={currentUser}
          onClose={() => setActiveChatItem(null)}
          onOpenAuth={onOpenAuth}
        />
      )}
    </div>
  );
}
