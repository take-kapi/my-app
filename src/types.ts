export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Item {
  id: number;
  title: string;
  author: string;
  courseName: string;
  condition: string; // e.g. "新品同様", "目立った傷なし", "やや傷や汚れあり", "書き込み・使用感あり"
  image: string; // Base64データまたはプレースホルダー
  comment: string | null;
  isAvailable: boolean;
  userId: number;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TradeRequest {
  id: number;
  senderId: number;
  sender?: {
    id: number;
    name: string;
    email: string;
  };
  receiverId: number;
  receiver?: {
    id: number;
    name: string;
    email: string;
  };
  itemId: number;
  item: Item;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

export type ActiveTab = 'home' | 'sell' | 'mypage';

export interface Comment {
  id: number;
  text: string;
  itemId: number;
  userId: number;
  user: {
    id: number;
    name: string;
  };
  createdAt: string;
}