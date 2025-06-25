export interface Env {
  SYNC_STATE: KVNamespace;
  TRIGGER_TOKEN: string;
  RAINDROP_TOKEN: string;
  RAINDROP_TAG: string;
  WP_ENDPOINT: string;
  WP_USERNAME: string;
  WP_APP_PASSWORD: string;
  DRY_RUN?: string;
}