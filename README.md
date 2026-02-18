# ANYbotics Time-Series Backend

Backend system for processing time-series data from ANYmal inspection robots, powering the Data Navigator platform.

## Architecture

```
Robot Fleet ──MQTT──▶ Edge Gateway ──Kafka──▶ Stream Processor ──▶ TimescaleDB
                                                    │                    │
                                                    ▼                    ▼
                                            Anomaly Detection      API Service ◀── Data Navigator
                                                    │
                                                    ▼
                                            Redis Pub/Sub ──▶ WebSocket Alerts
```

**Services:**

| Service | Port | Description |
|---|---|---|
| API | 3000 | REST/WebSocket/Swagger — main interface for Data Navigator |
| Edge Gateway | 3001 | MQTT → Kafka bridge, binary data routing to MinIO |
| Stream Processor | 3002 | Kafka consumer, TimescaleDB writer, anomaly detection |
| Batch Processor | 3003 | BullMQ scheduled jobs (downsampling, retention, cleanup) |

**Infrastructure:**

| Component | Port | Purpose |
|---|---|---|
| EMQX | 1883 / 18083 | MQTT 5.0 broker (dashboard at :18083) |
| Redpanda | 19092 / 18081 | Kafka-compatible event streaming |
| TimescaleDB | 5432 | Time-series + relational database |
| Redis | 6379 | Caching, queues, pub/sub |
| MinIO | 9000 / 9001 | S3-compatible blob storage (console at :9001) |

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+
- npm 10+

### 1. Start infrastructure

```bash
docker compose up -d emqx redpanda timescaledb redis minio redpanda-init minio-init
```

Wait for all services to be healthy:

```bash
docker compose ps
```

### 2. Install dependencies

```bash
npm install
```

### 3. Build shared packages

```bash
npm run build --workspace=@anybotics/common
```

### 4. Start services (development)

In separate terminals:

```bash
# API
npm run dev --workspace=@anybotics/api

# Edge Gateway
npm run dev --workspace=@anybotics/edge-gateway

# Stream Processor
npm run dev --workspace=@anybotics/stream-processor

# Batch Processor
npm run dev --workspace=@anybotics/batch-processor
```

### 5. Run the robot simulator

```bash
npx ts-node scripts/simulate-robot.ts
```

### Full Docker (all services)

To run everything in Docker:

```bash
docker compose up --build
```

## API Documentation

Once the API is running, Swagger docs are available at:

```
http://localhost:3000/docs
```

### Key Endpoints

```
POST   /api/v1/auth/login              # Authenticate
POST   /api/v1/auth/register           # Register user

GET    /api/v1/robots                   # List robots
GET    /api/v1/robots/:id/telemetry     # Robot time-series data

GET    /api/v1/assets                   # List assets
GET    /api/v1/assets/:id/readings      # Asset sensor readings

GET    /api/v1/anomalies                # List anomalies
PATCH  /api/v1/anomalies/:id/acknowledge # Acknowledge anomaly

POST   /api/v1/missions                 # Create mission
GET    /api/v1/missions                 # List missions

GET    /api/v1/analytics/trends         # Trendline data
GET    /api/v1/analytics/comparison     # Period comparison
```

### WebSocket

Connect to `ws://localhost:3000/alerts` for real-time anomaly alerts.

## Project Structure

```
anybotics/
├── packages/
│   ├── common/              Shared types, config, constants, utils
│   ├── edge-gateway/        MQTT → Kafka bridge service
│   ├── stream-processor/    Kafka → TimescaleDB + anomaly detection
│   ├── batch-processor/     BullMQ scheduled jobs
│   └── api/                 NestJS REST/WebSocket API
├── proto/                   Protobuf schema definitions
├── infra/
│   └── timescaledb/         Database initialization scripts
├── scripts/
│   └── simulate-robot.ts    MQTT robot data simulator
├── docker-compose.yml       Full stack (infra + services)
└── ARCHITECTURE.md          Detailed architecture document
```

## Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20, TypeScript 5 |
| Framework | NestJS 10 + Fastify |
| MQTT | EMQX 5.x |
| Streaming | Redpanda (Kafka-compatible) |
| Time-Series DB | TimescaleDB (PostgreSQL 16) |
| Object Storage | MinIO (S3-compatible) |
| Cache / Queues | Redis 7 |
| Job Queue | BullMQ |
| ORM | Prisma |
| Auth | JWT + bcrypt |
| Serialization | Protocol Buffers |
| Monorepo | Turborepo + npm workspaces |

## Environment Variables

Copy `.env.example` to `.env` and adjust values as needed:

```bash
cp .env.example .env
```

See `.env.example` for all available configuration options.
