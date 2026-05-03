/** Request and response JSON schemas describing one backend adapter. */
export interface AdapterSchema {
  /** Example/JSON schema of the request body the adapter accepts. */
  request: unknown;
  /** Example/JSON schema of the response body the adapter returns. */
  response: unknown;
}

/** One adapter the user can pick for an endpoint. */
export interface AdapterOption {
  /** Stable adapter id used in saved config  */
  key: string;
  /** Human-readable label shown in the picker. */
  name: string;
  /** Optional request/response schemas, shown in the preview dialog. */
  schema?: AdapterSchema;
}

/** Open-state payload for the schema preview dialog. */
export interface SchemaDialogState {
  /** Adapter display name shown in the dialog title. */
  name: string;
  /** Schemas rendered as pretty-printed JSON inside the dialog. */
  schema: AdapterSchema;
}
