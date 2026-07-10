import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { BookOpen, UploadCloud, X, AlertCircle, Plus, Edit2, Sparkles } from 'lucide-react';
import { Item } from '../types';

interface ItemFormProps {
  editingItem?: Item | null;
  onSuccess: () => void;
  onCancel?: () => void;
}

const CONDITIONS = [
  '新品同様',
  '目立った傷なし',
  'やや傷や汚れあり',
  '書き込み・使用感あり',
];

export default function ItemForm({ editingItem, onSuccess, onCancel }: ItemFormProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [courseName, setCourseName] = useState('');
  const [condition, setCondition] = useState(CONDITIONS[0]);
  const [image, setImage] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 編集モード時の初期データ流し込み
  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title);
      setAuthor(editingItem.author);
      setCourseName(editingItem.courseName);
      setCondition(editingItem.condition);
      setImage(editingItem.image || '');
      setComment(editingItem.comment || '');
    } else {
      // フォームのクリア
      setTitle('');
      setAuthor('');
      setCourseName('');
      setCondition(CONDITIONS[0]);
      setImage('');
      setComment('');
    }
  }, [editingItem]);

  // ファイルをBase64に変換するヘルパー
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('画像ファイル（PNG、JPEGなど）を選択してください');
      return;
    }

    // サイズ上限 (約 3MB)
    if (file.size > 3 * 1024 * 1024) {
      setError('画像サイズは3MB未満にしてください');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        setImage(e.target.result);
        setError(''); // クリア
      }
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // ドラッグ＆ドロップのハンドリング
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveImage = () => {
    setImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !author.trim() || !courseName.trim() || !condition) {
      setError('必須項目を入力してください');
      return;
    }

    setLoading(true);

    const url = editingItem ? `/api/items/${editingItem.id}` : '/api/items';
    const method = editingItem ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          author,
          courseName,
          condition,
          image,
          comment,
        }),
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
        throw new Error(data.error || '通信エラーが発生しました');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="item-form-container" className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-xs border border-gray-100">
      <div id="item-form-header" className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-4">
        <div className="rounded-xl bg-teal-50 p-2.5 text-teal-600">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight font-sans">
            {editingItem ? '教科書情報の編集' : '教科書を出品する'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {editingItem ? '出品した教科書情報を最新の状態に更新します' : 'いらなくなった教科書を登録して、キャンパス内でほしい人を探しましょう'}
          </p>
        </div>
      </div>

      {error && (
        <div id="form-error-alert" className="mb-5 flex items-start gap-2.5 rounded-xl bg-red-50 p-3.5 text-sm text-red-600">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form id="item-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label htmlFor="item-title" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
            教科書タイトル <span className="text-rose-500">*</span>
          </label>
          <input
            id="item-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：ミクロ経済学 第2版"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-4 text-sm text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all"
          />
        </div>

        {/* Author & Course in Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Author */}
          <div>
            <label htmlFor="item-author" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              著者名 <span className="text-rose-500">*</span>
            </label>
            <input
              id="item-author"
              type="text"
              required
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="例：慶應 太郎、サミュエルソン"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-4 text-sm text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all"
            />
          </div>

          {/* Course Name */}
          <div>
            <label htmlFor="item-course" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              対象の授業名 / 学部 <span className="text-rose-500">*</span>
            </label>
            <input
              id="item-course"
              type="text"
              required
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="例：ミクロ経済学基礎、商学部必修"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-4 text-sm text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all"
            />
          </div>
        </div>

        {/* Condition Selection */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            教科書の状態 <span className="text-rose-500">*</span>
          </label>
          <div id="condition-radio-group" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {CONDITIONS.map((cond) => {
              const active = condition === cond;
              return (
                <button
                  id={`cond-opt-${cond}`}
                  key={cond}
                  type="button"
                  onClick={() => setCondition(cond)}
                  className={`rounded-xl border py-2.5 px-3 text-xs font-medium text-center transition-all cursor-pointer ${
                    active
                      ? 'border-teal-600 bg-teal-50 text-teal-700 font-semibold shadow-xs shadow-teal-600/5'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {cond}
                </button>
              );
            })}
          </div>
        </div>

        {/* Image File Upload */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
            教科書カバー写真
          </label>

          {image ? (
            /* Image Preview Card */
            <div id="image-preview-card" className="relative mt-2 flex items-center justify-center overflow-hidden rounded-xl border border-gray-150 bg-gray-50 p-4 max-h-[220px]">
              <img
                src={image}
                alt="教科書カバー"
                className="max-h-[180px] max-w-full rounded-lg object-contain shadow-xs"
                referrerPolicy="no-referrer"
              />
              <button
                id="remove-image-btn"
                type="button"
                onClick={handleRemoveImage}
                className="absolute right-3 top-3 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
                title="写真を削除"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            /* Drag and Drop Zone */
            <div
              id="upload-dropzone"
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-2 flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-8 px-4 text-center transition-all cursor-pointer ${
                dragActive
                  ? 'border-teal-600 bg-teal-50/50 scale-101'
                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100/50 hover:border-gray-300'
              }`}
            >
              <UploadCloud className={`h-8 w-8 mb-2.5 transition-colors ${dragActive ? 'text-teal-600' : 'text-gray-400'}`} />
              <p className="text-xs font-semibold text-gray-700">
                クリックして写真を選択、またはここにドラッグ＆ドロップ
              </p>
              <p className="mt-1 text-[10px] text-gray-400">
                PNG, JPG, WEBP (最大 3MB)
              </p>
              <input
                id="file-upload-input"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleChange}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Comment / Comment */}
        <div>
          <label htmlFor="item-comment" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
            コメント・状態詳細
          </label>
          <textarea
            id="item-comment"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="例：数ページほど蛍光ペンでのマークがあります。全体的にカバーは綺麗です。三田キャンパス、または日吉キャンパスで手渡し可能です！"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-4 text-sm text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all resize-none"
          />
        </div>

        {/* Buttons */}
        <div id="form-button-box" className="flex items-center justify-end gap-3 border-t border-gray-100 pt-5">
          {onCancel && (
            <button
              id="cancel-form-btn"
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-gray-200 py-2.5 px-5 text-sm font-semibold text-gray-600 hover:bg-gray-50 active:scale-98 transition-all cursor-pointer"
            >
              キャンセル
            </button>
          )}
          <button
            id="submit-form-btn"
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 py-2.5 px-6 text-sm font-bold text-white shadow-md shadow-teal-600/10 hover:bg-teal-700 active:scale-98 disabled:bg-gray-300 disabled:shadow-none transition-all cursor-pointer"
          >
            {editingItem ? <Edit2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span>{loading ? '送信中...' : editingItem ? '更新する' : '出品を登録する'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
