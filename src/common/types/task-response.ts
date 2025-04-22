export interface TaskResponse {
  id: number;
  status: "pending" | "completed" | "failed";
  result?: any;
  createdAt: string;
  completedAt?: string;
}
