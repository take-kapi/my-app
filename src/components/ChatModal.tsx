import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, MessageSquare, User, Clock, Loader2, LogIn } from 'lucide-react';
import { Item, User as UserType, Comment } from '../types';

interface ChatModalProps {
  item: Item;
  currentUser: UserType | null;
  onClose: () => void;
  onOpenAuth: () => void;
}

export default function ChatModal({ item, currentUser, onClose, onOpenAuth }: ChatModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // コメント一覧の取得
  const fetchComments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/items/${item.id}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Fetch comments error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    
    // 5秒ごとに自動更新（疑似リアルタイムチャット）
    const interval = setInterval(() => {
      fetchComments();
    }, 5000);

    return () => clearInterval(interval);
  }, [item.id]);

  // 新しいコメント追加時やオープン時に一番下までスクロール
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (!newComment.trim()) return;

    setSubmitting(true);
    setErrorText('');

    try {
      const response = await fetch(`/api/items/${item.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newComment }),
      });

      let data: any = {};
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const textResponse = await response.text();
        throw new Error(textResponse || `サーバーから無効なレスポンスが返されました (ステータス: ${response.status})`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'コメントの送信に失敗しました');
      }

      setComments((prev) => [...prev, data.comment]);
      setNewComment('');
    } catch (err: any) {
      setErrorText(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } catch (e) {
      return '';
    }
  };

  return (
    <div id="chat-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
      <motion.div
        id="chat-modal-content"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="flex flex-col w-full max-w-lg h-[85vh] max-h-[680px] bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100"
      >
        {/* Modal Header */}
        <div id="chat-modal-header" className="relative p-5 border-b border-gray-100 flex items-center justify-between bg-teal-50/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-teal-100 p-2.5 text-teal-700">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base leading-snug font-sans truncate max-w-[280px]">
                {item.title} のオープンチャット
              </h3>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                出品者: {item.user?.name || '匿名'} • 授業名: {item.courseName}
              </p>
            </div>
          </div>
          <button
            id="chat-modal-close-btn"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Comment Thread List */}
        <div id="chat-messages-container" className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50">
          {loading && comments.length === 0 ? (
            <div id="chat-loading-spinner" className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
              <span className="text-xs">チャットを読み込み中...</span>
            </div>
          ) : comments.length === 0 ? (
            <div id="chat-empty-state" className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400">
              <MessageSquare className="h-10 w-10 text-teal-200 mb-2.5" />
              <p className="text-sm font-bold text-gray-700">まだチャットがありません</p>
              <p className="text-xs text-gray-400 mt-1 max-w-[260px]">
                受け渡し場所や教科書の状態について、出品者に気軽に質問してみましょう！
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => {
                const isMe = currentUser && comment.userId === currentUser.id;
                const isSeller = comment.userId === item.userId;

                return (
                  <div
                    id={`chat-bubble-wrapper-${comment.id}`}
                    key={comment.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    {/* User Label / Seller Tag */}
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[11px] font-bold text-gray-600">
                        {comment.user?.name || '匿名ユーザー'}
                      </span>
                      {isSeller && (
                        <span className="text-[9px] font-extrabold bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded-sm">
                          出品者
                        </span>
                      )}
                    </div>

                    {/* Chat Bubble */}
                    <div
                      id={`chat-bubble-${comment.id}`}
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
                        isMe
                          ? 'bg-teal-600 text-white rounded-tr-none'
                          : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{comment.text}</p>
                    </div>

                    {/* Timestamp */}
                    <span className="text-[10px] text-gray-400 mt-1 px-1 flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" />
                      {formatTime(comment.createdAt)}
                    </span>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input Box Footer */}
        <div id="chat-input-footer" className="p-4 border-t border-gray-100 bg-white shrink-0">
          {currentUser ? (
            <form id="chat-message-form" onSubmit={handleSubmit} className="flex gap-2">
              <input
                id="chat-message-input"
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="質問や取引の連絡を書き込む..."
                disabled={submitting}
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all disabled:opacity-50"
              />
              <button
                id="chat-submit-btn"
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="rounded-xl bg-teal-600 p-2.5 text-white hover:bg-teal-700 disabled:bg-gray-100 disabled:text-gray-400 transition-all flex items-center justify-center shrink-0 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </form>
          ) : (
            <div id="chat-auth-cta" className="rounded-2xl bg-teal-50/50 p-4 border border-teal-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-teal-900">
                  チャットに参加しませんか？
                </p>
                <p className="text-[11px] text-teal-700">
                  質問やコメントを投稿するには、アカウントにログインしてください。
                </p>
              </div>
              <button
                id="chat-auth-login-btn"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 transition-all shrink-0 cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>ログインする</span>
              </button>
            </div>
          )}
          {errorText && (
            <p className="mt-2 text-xs font-medium text-red-500 text-center">
              {errorText}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
