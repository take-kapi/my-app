import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, AlertCircle, KeyRound, CheckCircle } from 'lucide-react';
import { User as UserType } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserType) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [debugPassword, setDebugPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setDebugPassword('');
    setLoading(true);

    if (isForgotPassword) {
      try {
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
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
          throw new Error(data.error || 'エラーが発生しました');
        }

        setSuccessMessage(data.message);
        if (data.tempPasswordForDebug) {
          setDebugPassword(data.tempPasswordForDebug);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    const url = isSignUp ? '/api/auth/register' : '/api/auth/login';
    const body = isSignUp ? { name, email, password } : { email, password };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
        throw new Error(data.error || 'エラーが発生しました');
      }

      onSuccess(data.user);
      onClose();
      // フォームリセット
      setName('');
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (mode: 'login' | 'signup' | 'forgot') => {
    setError('');
    setSuccessMessage('');
    setDebugPassword('');
    if (mode === 'login') {
      setIsSignUp(false);
      setIsForgotPassword(false);
    } else if (mode === 'signup') {
      setIsSignUp(true);
      setIsForgotPassword(false);
    } else {
      setIsForgotPassword(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div id="auth-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <motion.div
        id="auth-modal-card"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-xl border border-gray-100"
      >
        {/* Close Button */}
        <button
          id="close-auth-modal"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div id="auth-modal-header" className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 font-sans tracking-tight">
            {isForgotPassword ? 'パスワード再発行' : isSignUp ? 'アカウント新規登録' : 'ログイン'}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {isForgotPassword
              ? 'ご登録いただいている慶應メールに一時パスワードを発行します'
              : isSignUp
              ? '慶應義塾大学の学生・教職員専用の教科書交換プラットフォーム'
              : '登録した慶應メールアドレスでログインしてください'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div id="auth-error-alert" className="mb-4 flex items-start gap-2.5 rounded-xl bg-red-50 p-3.5 text-sm text-red-600">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div id="auth-success-alert" className="mb-4 rounded-xl bg-teal-50 p-4 border border-teal-100">
            <div className="flex items-start gap-2.5 text-sm text-teal-800">
              <CheckCircle className="h-5 w-5 shrink-0 text-teal-600" />
              <div>
                <p className="font-semibold">{successMessage}</p>
                {debugPassword && (
                  <div className="mt-3 rounded-lg bg-white p-3 border border-teal-200 shadow-xs">
                    <p className="text-xs text-teal-600 font-semibold mb-1">開発デバッグ用一時パスワード：</p>
                    <code className="text-sm font-mono font-bold bg-teal-50 px-2.5 py-1 rounded-md text-teal-900 select-all select-text block text-center border border-teal-100">
                      {debugPassword}
                    </code>
                    <p className="text-[11px] text-gray-400 mt-1.5 text-center">この一時パスワードをコピーして、ログイン画面からログインできます。</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Auth Form */}
        <form id="auth-form" onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && !isForgotPassword && (
            <div>
              <label htmlFor="auth-name" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                お名前 (ニックネーム)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <User className="h-4 w-4" />
                </span>
                <input
                  id="auth-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="慶應 太郎"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="auth-email" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                慶應メールアドレス
              </label>
              <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                @keio.jp 限定
              </span>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <Mail className="h-4 w-4" />
              </span>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="taro.keio@keio.jp"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
              />
            </div>
          </div>

          {!isForgotPassword && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="auth-password" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  パスワード
                </label>
                {!isSignUp && (
                  <button
                    id="forgot-password-link"
                    type="button"
                    onClick={() => handleModeChange('forgot')}
                    className="text-xs font-semibold text-teal-600 hover:underline cursor-pointer"
                  >
                    パスワードを忘れましたか？
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="auth-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                />
              </div>
            </div>
          )}

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-teal-600 py-3 font-semibold text-white shadow-md shadow-teal-600/10 hover:bg-teal-700 active:scale-98 disabled:bg-gray-300 disabled:shadow-none transition-all cursor-pointer"
          >
            {loading ? '処理中...' : isForgotPassword ? '一時パスワードを発行' : isSignUp ? '登録する' : 'ログインする'}
          </button>
        </form>

        {/* Tab Switcher Link */}
        <div id="auth-modal-footer" className="mt-6 text-center text-sm text-gray-500 border-t border-gray-100 pt-4">
          {isForgotPassword ? (
            <p>
              ログイン画面に戻りますか？{' '}
              <button
                id="back-to-login"
                onClick={() => handleModeChange('login')}
                className="font-semibold text-teal-600 hover:underline cursor-pointer"
              >
                ログイン
              </button>
            </p>
          ) : isSignUp ? (
            <p>
              すでにアカウントをお持ちですか？{' '}
              <button
                id="switch-to-login"
                onClick={() => handleModeChange('login')}
                className="font-semibold text-teal-600 hover:underline cursor-pointer"
              >
                ログイン
              </button>
            </p>
          ) : (
            <p>
              アカウントを新規作成しますか？{' '}
              <button
                id="switch-to-register"
                onClick={() => handleModeChange('signup')}
                className="font-semibold text-teal-600 hover:underline cursor-pointer"
              >
                新規登録
              </button>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
