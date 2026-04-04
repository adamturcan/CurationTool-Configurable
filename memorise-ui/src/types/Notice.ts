export type NoticeTone = "default" | "info" | "success" | "warning" | "error";

export interface NoticeOptions {
  tone?: NoticeTone;
  /** When true, the snackbar stays until manually dismissed */
  persistent?: boolean;
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

