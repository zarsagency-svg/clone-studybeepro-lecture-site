export interface NotificationItem {
  id: string;
  title: string;
  text: string;
  createdAt: number;
  likes: number;
  liked: boolean;
  tag?: string;
  imageUrl?: string;
}
