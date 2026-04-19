export type NoticeTone = "default" | "info" | "success" | "warning" | "error";

export interface NoticeOptions {
  tone?: NoticeTone;
  /** When true, the snackbar auto-dismisses after a longer, text-length-based duration */
  persistent?: boolean;
  /** When true, the snackbar stays until the next notice replaces it (for async progress) */
  loading?: boolean;
  /** When set, a Retry button appears on the notice that re-triggers the failed operation */
  retryAction?: () => void;
}

/** Toast notification shown via NotificationSnackbar */
export interface Notice extends NoticeOptions {
  message: string;
}

/** Standard return type from workflow services — carries success/failure + a user-facing notice */
export type WorkflowResult = {
  ok: boolean;
  notice: Notice;
};

