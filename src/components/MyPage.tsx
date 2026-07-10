import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Package, Inbox, Send, Edit, Trash2, Mail, Check, X, CheckCircle, ArrowRight, Book, Heart, User, KeyRound, Save } from 'lucide-react';
import { Item, TradeRequest, User as UserType } from '../types';

interface MyPageProps {
  currentUser: UserType | null;
  onUpdateUser: (user: UserType) => void;
  myItems: Item[];
  receivedRequests: TradeRequest[];
  sentRequests: TradeRequest[];
  onEditItem: (item: Item) => void;
  onDeleteItem: (itemId: number) => void;
  onRespondRequest: (requestId: number, status: 'APPROVED' | 'REJECTED') => void;
  loading: boolean;
}

export default function MyPage({
  currentUser,
  onUpdateUser,
  myItems,
  receivedRequests,
  sentRequests,
  onEditItem,
  onDeleteItem,
  onRespondRequest,
  loading,
}: MyPageProps) {
  const [activeSubTab, setActiveSubTab] = useState<'listings' | 'received' | 'sent' | 'favorites'>('listings');
  const [processingId, setProcessingId] = useState<number | null>(null);

  // プロフィール編集ステート
  const [editNameMode, setEditNameMode] = useState(false);
  const [newName, setNewName] = useState(currentUser?.name || '');
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [profileLoading, setProfileLoading] = useState(false);

  // パスワード変更ステート
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // お気に入りステート
  const [favorites, setFavorites] = useState<Item[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setNewName(currentUser.name);
      fetchFavorites();
    }
  }, [currentUser]);

  const fetchFavorites = async () => {
    setFavoritesLoading(true);
    try {
      const response = await fetch('/api/favorites');
      if (response.ok) {
        const data = await response.json();
        setFavorites(data);
      }
    } catch (err) {
      console.error('Failed to fetch favorites:', err);
    } finally {
      setFavoritesLoading(false);
    }
  };

  const handleRemoveFavorite = async (itemId: number) => {
    try {
      const response = await fetch(`/api/items/${itemId}/favorite`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setFavorites(favorites.filter(item => item.id !== itemId));
        // カスタムイベント等でグローバルな同期を促す
        window.dispatchEvent(new CustomEvent('favoritesUpdated'));
      }
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    }
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setProfileLoading(true);
    setProfileMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '名前の更新に失敗しました');
      }

      onUpdateUser(data.user);
      setProfileMessage({ type: 'success', text: 'お名前を更新しました！' });
      setEditNameMode(false);
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err.message });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;

    setPasswordLoading(true);
    setPasswordMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'パスワードの更新に失敗しました');
      }

      setPasswordMessage({ type: 'success', text: 'パスワードを更新しました！' });
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setShowPasswordForm(false), 2000);
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err.message });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAction = async (requestId: number, status: 'APPROVED' | 'REJECTED') => {
    setProcessingId(requestId);
    try {
      await onRespondRequest(requestId, status);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REJECTED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return '承認済み (交換成立)';
      case 'REJECTED':
        return '見送り (辞退)';
      default:
        return '回答待ち (保留中)';
    }
  };

  return (
    <div id="mypage-container" className="space-y-6">
      {/* ==================== プロフィール設定 ==================== */}
      <div id="profile-settings-card" className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 font-bold border border-teal-100">
              <User className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {editNameMode ? (
                  <form onSubmit={handleUpdateName} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="rounded-lg border border-gray-300 px-2.5 py-1 text-sm focus:border-teal-500 focus:outline-none"
                      required
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={profileLoading}
                      className="rounded-lg bg-teal-600 p-1.5 text-white hover:bg-teal-700 cursor-pointer"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewName(currentUser?.name || '');
                        setEditNameMode(false);
                      }}
                      className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <>
                    <h3 className="text-base font-bold text-gray-900">{currentUser?.name}</h3>
                    <button
                      onClick={() => setEditNameMode(true)}
                      className="text-xs text-gray-400 hover:text-teal-600 cursor-pointer flex items-center gap-0.5"
                    >
                      <Edit className="h-3 w-3" />
                      <span>編集</span>
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{currentUser?.email}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="flex items-center gap-1.5 rounded-xl border border-gray-250 bg-white py-2 px-4 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>パスワード変更</span>
            </button>
          </div>
        </div>

        {profileMessage.text && (
          <div className={`mb-4 rounded-xl p-3 text-xs font-semibold border ${
            profileMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
          }`}>
            {profileMessage.text}
          </div>
        )}

        {/* パスワード変更フォーム */}
        {showPasswordForm && (
          <form onSubmit={handleUpdatePassword} className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3 mb-4 animate-fade-in">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">セキュリティ設定：パスワードの更新</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">現在のパスワード</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="現在のパスワード"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">新しいパスワード</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="新しいパスワード"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>
            {passwordMessage.text && (
              <p className={`text-xs font-semibold ${passwordMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                {passwordMessage.text}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowPasswordForm(false)}
                className="rounded-lg border border-gray-250 bg-white py-1.5 px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={passwordLoading}
                className="rounded-lg bg-teal-600 py-1.5 px-4 text-xs font-bold text-white hover:bg-teal-700 cursor-pointer shadow-sm shadow-teal-600/10"
              >
                {passwordLoading ? '更新中...' : 'パスワードを保存'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Sub Tabs Navigation */}
      <div id="mypage-sub-nav" className="flex border-b border-gray-100 bg-white rounded-xl p-1.5 shadow-xs border overflow-x-auto">
        <button
          id="tab-my-listings"
          onClick={() => setActiveSubTab('listings')}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'listings'
              ? 'bg-teal-550/10 text-teal-700 font-bold bg-teal-50'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>マイ出品 ({myItems.length})</span>
        </button>

        <button
          id="tab-received-requests"
          onClick={() => setActiveSubTab('received')}
          className={`flex-1 min-w-[125px] flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'received'
              ? 'bg-teal-550/10 text-teal-700 font-bold bg-teal-50'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Inbox className="h-4 w-4" />
          <span>届いた申請 ({receivedRequests.filter(r => r.status === 'PENDING').length})</span>
        </button>

        <button
          id="tab-sent-requests"
          onClick={() => setActiveSubTab('sent')}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'sent'
              ? 'bg-teal-550/10 text-teal-700 font-bold bg-teal-50'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Send className="h-4 w-4" />
          <span>送った希望 ({sentRequests.length})</span>
        </button>

        <button
          id="tab-favorite-listings"
          onClick={() => setActiveSubTab('favorites')}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'favorites'
              ? 'bg-rose-50 text-rose-700 border border-rose-100 font-bold'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
          <span>お気に入り ({favorites.length})</span>
        </button>
      </div>

      {loading ? (
        <div id="mypage-loading" className="py-12 text-center text-sm text-gray-500">
          データをロード中...
        </div>
      ) : (
        <div id="mypage-content-area" className="min-h-[300px]">
          {/* ==================== 1. MY LISTINGS ==================== */}
          {activeSubTab === 'listings' && (
            <div id="my-listings-list" className="space-y-4">
              {myItems.length === 0 ? (
                <div id="no-listings-fallback" className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-6">
                  <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-600">出品している教科書はありません</p>
                  <p className="text-xs text-gray-400 mt-1">「教科書を出品する」タブから不要な教科書を登録しましょう</p>
                </div>
              ) : (
                <div id="listings-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myItems.map((item) => (
                    <div
                      id={`my-item-${item.id}`}
                      key={item.id}
                      className="flex items-center gap-4 rounded-xl border border-gray-150 bg-white p-4 hover:border-teal-100 transition-all shadow-xs"
                    >
                      {/* Left thumbnail cover */}
                      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-50 border flex items-center justify-center">
                        {item.image ? (
                          <img src={item.image} alt={item.title} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Book className="h-6 w-6 text-teal-500/50" />
                        )}
                      </div>

                      {/* Info & action triggers */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-sm font-bold text-gray-900 truncate">{item.title}</h4>
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold border shrink-0 ${
                              item.isAvailable
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-gray-100 text-gray-500 border-gray-200'
                            }`}
                          >
                            {item.isAvailable ? '交換受付中' : '交換完了'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">著者: {item.author}</p>
                        <p className="text-[11px] text-gray-500 mt-1 truncate">授業: {item.courseName}</p>

                        <div className="mt-3 flex items-center gap-3 border-t border-gray-50 pt-2.5">
                          <button
                            id={`edit-my-item-${item.id}`}
                            onClick={() => onEditItem(item)}
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-teal-600 font-semibold cursor-pointer"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            <span>編集</span>
                          </button>
                          <button
                            id={`delete-my-item-${item.id}`}
                            onClick={() => {
                              if (confirm(`「${item.title}」を本当に削除しますか？`)) {
                                onDeleteItem(item.id);
                              }
                            }}
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-rose-600 font-semibold cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>削除</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== 2. RECEIVED REQUESTS ==================== */}
          {activeSubTab === 'received' && (
            <div id="received-requests-list" className="space-y-4">
              {receivedRequests.length === 0 ? (
                <div id="no-received-fallback" className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-6">
                  <Inbox className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-600">届いた交換申請はありません</p>
                  <p className="text-xs text-gray-400 mt-1">他のユーザーからあなたの教科書へ申請が来ると、ここに表示されます</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {receivedRequests.map((req) => (
                    <div
                      id={`received-req-${req.id}`}
                      key={req.id}
                      className={`rounded-2xl border bg-white p-5 shadow-xs transition-all ${
                        req.status === 'APPROVED' ? 'border-emerald-200' : 'border-gray-100'
                      }`}
                    >
                      {/* Flex header */}
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        {/* Requester & Target book info */}
                        <div className="flex items-center gap-3.5">
                          <div className="h-14 w-11 shrink-0 overflow-hidden rounded-md bg-gray-50 border flex items-center justify-center">
                            {req.item.image ? (
                              <img src={req.item.image} alt={req.item.title} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <Book className="h-5 w-5 text-teal-500/50" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 text-sm">{req.sender?.name || '匿名希望'}</span>
                              <span className="text-xs text-gray-400">さんからの申請</span>
                            </div>
                            <h4 className="text-xs font-bold text-teal-700 mt-1 truncate">
                              対象の教科書: {req.item.title}
                            </h4>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              申請日時: {new Date(req.createdAt).toLocaleDateString('ja-JP')}
                            </p>
                          </div>
                        </div>

                        {/* Status / Actions */}
                        <div id={`req-actions-${req.id}`} className="shrink-0">
                          {req.status === 'PENDING' ? (
                            <div className="flex items-center gap-2">
                              <button
                                id={`reject-req-btn-${req.id}`}
                                disabled={processingId === req.id}
                                onClick={() => handleAction(req.id, 'REJECTED')}
                                className="flex items-center gap-1 rounded-lg border border-gray-200 py-1.5 px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:bg-gray-50 cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5" />
                                <span>辞退</span>
                              </button>
                              <button
                                id={`approve-req-btn-${req.id}`}
                                disabled={processingId === req.id}
                                onClick={() => handleAction(req.id, 'APPROVED')}
                                className="flex items-center gap-1 rounded-lg bg-teal-600 py-1.5 px-3.5 text-xs font-bold text-white hover:bg-teal-700 disabled:bg-teal-300 shadow-sm shadow-teal-600/5 cursor-pointer"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>交換を承認する</span>
                              </button>
                            </div>
                          ) : (
                            <span className={`inline-block rounded-lg border px-2.5 py-1 text-xs font-bold ${getStatusBadge(req.status)}`}>
                              {getStatusLabel(req.status)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* APPROVED SUCCESS BANNER */}
                      {req.status === 'APPROVED' && (
                        <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-xs text-emerald-800">
                          <div className="flex items-center gap-1.5 font-bold mb-1.5">
                            <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
                            <span>交換取引が成立しました！</span>
                          </div>
                          <p className="leading-relaxed text-emerald-700 mb-3">
                            おめでとうございます！相手の連絡用メールアドレスが開示されました。以下のメールアドレス宛てに連絡を送り、大学キャンパス等での引き渡し日程・場所（例：「学食1F」「生協前」など）を相談してください。
                          </p>
                          <div className="inline-flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-emerald-200 shadow-xs">
                            <Mail className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span className="font-bold font-mono text-emerald-900 select-all">{req.sender?.email}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== 3. SENT REQUESTS ==================== */}
          {activeSubTab === 'sent' && (
            <div id="sent-requests-list" className="space-y-4">
              {sentRequests.length === 0 ? (
                <div id="no-sent-fallback" className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-6">
                  <Send className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-600">送信した交換希望はありません</p>
                  <p className="text-xs text-gray-400 mt-1">「教科書を探す」から、欲しい本に交換申請を送りましょう！</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sentRequests.map((req) => (
                    <div
                      id={`sent-req-${req.id}`}
                      key={req.id}
                      className={`rounded-2xl border bg-white p-5 shadow-xs transition-all ${
                        req.status === 'APPROVED' ? 'border-emerald-200 animate-pulse-subtle' : 'border-gray-100'
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        {/* Book thumbnail and details */}
                        <div className="flex items-center gap-3.5">
                          <div className="h-14 w-11 shrink-0 overflow-hidden rounded-md bg-gray-50 border flex items-center justify-center">
                            {req.item.image ? (
                              <img src={req.item.image} alt={req.item.title} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <Book className="h-5 w-5 text-teal-500/50" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm truncate leading-snug">
                              {req.item.title}
                            </h4>
                            <p className="text-xs text-gray-400 mt-0.5">著者: {req.item.author}</p>
                            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-gray-500">
                              <span>相手: <strong>{req.receiver?.name || '出品者'}</strong></span>
                              <span>•</span>
                              <span>授業: {req.item.courseName}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          <span className={`inline-block rounded-lg border px-2.5 py-1 text-xs font-bold ${getStatusBadge(req.status)}`}>
                            {getStatusLabel(req.status)}
                          </span>
                        </div>
                      </div>

                      {/* APPROVED SUCCESS BANNER */}
                      {req.status === 'APPROVED' && (
                        <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-xs text-emerald-800">
                          <div className="flex items-center gap-1.5 font-bold mb-1.5">
                            <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
                            <span>交換申請が承認されました！</span>
                          </div>
                          <p className="leading-relaxed text-emerald-700 mb-3">
                            おめでとうございます！出品者の <strong>{req.receiver?.name}</strong> さんがあなたの交換申請を承認しました。以下の連絡用メールアドレスに連絡を送り、大学キャンパス等の引き渡し日程を調整してください。
                          </p>
                          <div className="inline-flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-emerald-200 shadow-xs">
                            <Mail className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span className="font-bold font-mono text-emerald-900 select-all">{req.receiver?.email}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== 4. FAVORITES ==================== */}
          {activeSubTab === 'favorites' && (
            <div id="favorite-listings-list" className="space-y-4">
              {favoritesLoading ? (
                <div className="py-12 text-center text-sm text-gray-500">お気に入りを読み込み中...</div>
              ) : favorites.length === 0 ? (
                <div id="no-favorites-fallback" className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-6">
                  <Heart className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-600">お気に入り登録した教科書はありません</p>
                  <p className="text-xs text-gray-400 mt-1">「教科書を探す」タブから、気になる教科書をお気に入りに登録しましょう</p>
                </div>
              ) : (
                <div id="favorites-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {favorites.map((item) => (
                    <div
                      id={`favorite-item-${item.id}`}
                      key={item.id}
                      className="flex items-center gap-4 rounded-xl border border-gray-150 bg-white p-4 hover:border-teal-100 transition-all shadow-xs"
                    >
                      {/* Left cover */}
                      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-50 border flex items-center justify-center">
                        {item.image ? (
                          <img src={item.image} alt={item.title} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Book className="h-6 w-6 text-teal-500/50" />
                        )}
                      </div>

                      {/* Info & remove triggers */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-sm font-bold text-gray-900 truncate">{item.title}</h4>
                          <button
                            onClick={() => handleRemoveFavorite(item.id)}
                            className="text-rose-500 hover:text-rose-600 p-1 rounded-full hover:bg-rose-50 cursor-pointer shrink-0 transition-colors"
                            title="お気に入りから削除"
                          >
                            <Heart className="h-4.5 w-4.5 fill-rose-500" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 truncate">著者: {item.author}</p>
                        <p className="text-[11px] text-gray-500 mt-1 truncate">授業: {item.courseName}</p>
                        
                        <div className="flex items-center justify-between border-t border-gray-50 pt-2.5 mt-2.5">
                          <span className="text-[10px] text-gray-400 truncate max-w-[140px]">
                            出品者: {item.user?.name}
                          </span>
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold border shrink-0 ${
                              item.isAvailable
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-gray-100 text-gray-500 border-gray-200'
                            }`}
                          >
                            {item.isAvailable ? '交換受付中' : '交換完了'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

