use sqlx::postgres::PgPool;
use opensearch::OpenSearch;
use reqwest::Client;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub opensearch: OpenSearch,
    pub http_client: Client,
    pub tx: tokio::sync::broadcast::Sender<String>,
}
