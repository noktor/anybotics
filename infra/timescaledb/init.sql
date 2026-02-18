-- ANYbotics Time-Series Backend: Database Initialization
-- TimescaleDB schema for sensor readings, anomaly events, and metadata

CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ════════════════════════════════════════════════════════════
-- TIME-SERIES TABLES (Hypertables)
-- ════════════════════════════════════════════════════════════

CREATE TABLE sensor_readings (
    time        TIMESTAMPTZ      NOT NULL,
    robot_id    UUID             NOT NULL,
    asset_id    UUID             NOT NULL,
    sensor_id   TEXT             NOT NULL,
    sensor_type TEXT             NOT NULL,
    value       DOUBLE PRECISION NOT NULL,
    unit        TEXT             NOT NULL,
    metadata    JSONB,
    quality     SMALLINT         DEFAULT 100
);

SELECT create_hypertable('sensor_readings', 'time',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

CREATE INDEX idx_sensor_readings_robot ON sensor_readings (robot_id, time DESC);
CREATE INDEX idx_sensor_readings_asset ON sensor_readings (asset_id, time DESC);
CREATE INDEX idx_sensor_readings_sensor ON sensor_readings (sensor_id, time DESC);
CREATE INDEX idx_sensor_readings_type ON sensor_readings (sensor_type, time DESC);

ALTER TABLE sensor_readings SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'robot_id, asset_id, sensor_id',
    timescaledb.compress_orderby = 'time DESC'
);
SELECT add_compression_policy('sensor_readings', INTERVAL '7 days');
SELECT add_retention_policy('sensor_readings', INTERVAL '90 days');

-- ── Anomaly Events ────────────────────────────────────────

CREATE TABLE anomaly_events (
    time          TIMESTAMPTZ NOT NULL,
    anomaly_id    UUID        NOT NULL DEFAULT uuid_generate_v4(),
    robot_id      UUID        NOT NULL,
    asset_id      UUID        NOT NULL,
    sensor_id     TEXT        NOT NULL,
    severity      TEXT        NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    anomaly_type  TEXT        NOT NULL,
    description   TEXT,
    value         DOUBLE PRECISION,
    threshold     DOUBLE PRECISION,
    blob_ref      TEXT,
    acknowledged  BOOLEAN     DEFAULT FALSE,
    metadata      JSONB
);

SELECT create_hypertable('anomaly_events', 'time',
    chunk_time_interval => INTERVAL '7 days',
    if_not_exists => TRUE
);

CREATE INDEX idx_anomaly_events_asset ON anomaly_events (asset_id, time DESC);
CREATE INDEX idx_anomaly_events_severity ON anomaly_events (severity, time DESC);
CREATE INDEX idx_anomaly_events_robot ON anomaly_events (robot_id, time DESC);

-- ════════════════════════════════════════════════════════════
-- CONTINUOUS AGGREGATES
-- ════════════════════════════════════════════════════════════

CREATE MATERIALIZED VIEW sensor_readings_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    robot_id,
    asset_id,
    sensor_id,
    sensor_type,
    AVG(value)    AS avg_value,
    MIN(value)    AS min_value,
    MAX(value)    AS max_value,
    STDDEV(value) AS stddev_value,
    COUNT(*)      AS sample_count
FROM sensor_readings
GROUP BY bucket, robot_id, asset_id, sensor_id, sensor_type
WITH NO DATA;

SELECT add_continuous_aggregate_policy('sensor_readings_hourly',
    start_offset    => INTERVAL '3 hours',
    end_offset      => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour'
);

CREATE MATERIALIZED VIEW sensor_readings_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', time) AS bucket,
    robot_id,
    asset_id,
    sensor_id,
    sensor_type,
    AVG(value)    AS avg_value,
    MIN(value)    AS min_value,
    MAX(value)    AS max_value,
    STDDEV(value) AS stddev_value,
    COUNT(*)      AS sample_count
FROM sensor_readings
GROUP BY bucket, robot_id, asset_id, sensor_id, sensor_type
WITH NO DATA;

SELECT add_continuous_aggregate_policy('sensor_readings_daily',
    start_offset    => INTERVAL '3 days',
    end_offset      => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day'
);

-- ════════════════════════════════════════════════════════════
-- ROBOT POSE TRACKING
-- ════════════════════════════════════════════════════════════

CREATE TABLE robot_poses (
    time          TIMESTAMPTZ NOT NULL,
    robot_id      UUID        NOT NULL,
    x             DOUBLE PRECISION NOT NULL,
    y             DOUBLE PRECISION NOT NULL,
    z             DOUBLE PRECISION DEFAULT 0,
    heading       DOUBLE PRECISION DEFAULT 0,
    speed         DOUBLE PRECISION DEFAULT 0,
    battery_level DOUBLE PRECISION DEFAULT 100,
    site_id       UUID,
    mission_id    TEXT,
    waypoint_idx  INT,
    metadata      JSONB
);

SELECT create_hypertable('robot_poses', 'time',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

CREATE INDEX idx_robot_poses_robot ON robot_poses (robot_id, time DESC);
CREATE INDEX idx_robot_poses_site ON robot_poses (site_id, time DESC);

-- ════════════════════════════════════════════════════════════
-- METADATA TABLES (standard relational)
-- ════════════════════════════════════════════════════════════

CREATE TABLE sites (
    site_id     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT        NOT NULL,
    description TEXT,
    latitude    DOUBLE PRECISION,
    longitude   DOUBLE PRECISION,
    metadata    JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE assets (
    asset_id        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id         UUID        NOT NULL REFERENCES sites(site_id),
    parent_asset_id UUID        REFERENCES assets(asset_id),
    name            TEXT        NOT NULL,
    asset_type      TEXT        NOT NULL CHECK (asset_type IN ('area', 'equipment', 'inspection_point')),
    description     TEXT,
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    metadata        JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assets_site ON assets (site_id);
CREATE INDEX idx_assets_parent ON assets (parent_asset_id);

CREATE TABLE robots (
    robot_id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name             TEXT        NOT NULL,
    model            TEXT        NOT NULL DEFAULT 'ANYmal X',
    firmware_version TEXT,
    site_id          UUID        REFERENCES sites(site_id),
    status           TEXT        NOT NULL DEFAULT 'offline'
                     CHECK (status IN ('online', 'offline', 'charging', 'on_mission', 'error', 'maintenance', 'disabled')),
    last_seen_at     TIMESTAMPTZ,
    metadata         JSONB,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
    user_id       UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    name          TEXT        NOT NULL,
    role          TEXT        NOT NULL DEFAULT 'viewer'
                  CHECK (role IN ('admin', 'operator', 'maintenance_engineer', 'viewer')),
    site_ids      UUID[]      DEFAULT '{}',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE missions (
    mission_id     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    robot_id       UUID        REFERENCES robots(robot_id),
    site_id        UUID        NOT NULL REFERENCES sites(site_id),
    name           TEXT        NOT NULL,
    description    TEXT,
    status         TEXT        NOT NULL DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled', 'dispatched', 'running', 'completed', 'failed', 'cancelled')),
    cron_expression TEXT,
    inspection_points JSONB   DEFAULT '[]',
    scheduled_at   TIMESTAMPTZ,
    started_at     TIMESTAMPTZ,
    completed_at   TIMESTAMPTZ,
    metadata       JSONB,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_missions_robot ON missions (robot_id);
CREATE INDEX idx_missions_site ON missions (site_id);
CREATE INDEX idx_missions_status ON missions (status);

CREATE TABLE anomaly_rules (
    rule_id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id             UUID        REFERENCES assets(asset_id),
    sensor_type          TEXT        NOT NULL,
    rule_type            TEXT        NOT NULL
                         CHECK (rule_type IN ('absolute_threshold', 'rate_of_change', 'z_score', 'bollinger_band', 'ewma')),
    min_threshold        DOUBLE PRECISION,
    max_threshold        DOUBLE PRECISION,
    rate_of_change_limit DOUBLE PRECISION,
    window_size          INT         DEFAULT 1000,
    z_score_threshold    DOUBLE PRECISION DEFAULT 3.0,
    severity             TEXT        NOT NULL DEFAULT 'medium'
                         CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    enabled              BOOLEAN     DEFAULT TRUE,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_anomaly_rules_sensor ON anomaly_rules (sensor_type);
CREATE INDEX idx_anomaly_rules_asset ON anomaly_rules (asset_id);

-- ════════════════════════════════════════════════════════════
-- SEED DATA
-- ════════════════════════════════════════════════════════════

INSERT INTO sites (site_id, name, description, latitude, longitude) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Zurich Power Plant', 'Main power generation facility', 47.3769, 8.5417),
    ('a0000000-0000-0000-0000-000000000002', 'Basel Chemical Works', 'Chemical processing plant', 47.5596, 7.5886);

INSERT INTO assets (asset_id, site_id, name, asset_type, description) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Turbine Hall', 'area', 'Main turbine area'),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Turbine T-101', 'equipment', 'Primary gas turbine'),
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Bearing B-101', 'inspection_point', 'Main bearing of T-101');

INSERT INTO assets (asset_id, site_id, parent_asset_id, name, asset_type, description) VALUES
    ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Pump P-201', 'equipment', 'Cooling water pump');

INSERT INTO robots (robot_id, name, model, firmware_version, site_id, status) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'ANYmal-Alpha',   'ANYmal X', '4.2.1', 'a0000000-0000-0000-0000-000000000001', 'offline'),
    ('c0000000-0000-0000-0000-000000000002', 'ANYmal-Bravo',   'ANYmal X', '4.2.1', 'a0000000-0000-0000-0000-000000000002', 'offline'),
    ('c0000000-0000-0000-0000-000000000003', 'ANYmal-Charlie', 'ANYmal X', '4.2.1', 'a0000000-0000-0000-0000-000000000001', 'offline'),
    ('c0000000-0000-0000-0000-000000000004', 'ANYmal-Delta',   'ANYmal X', '4.2.1', 'a0000000-0000-0000-0000-000000000002', 'offline'),
    ('c0000000-0000-0000-0000-000000000005', 'ANYmal-Echo',    'ANYmal X', '4.2.1', 'a0000000-0000-0000-0000-000000000001', 'offline'),
    ('c0000000-0000-0000-0000-000000000006', 'ANYmal-Foxtrot', 'ANYmal X', '4.2.1', 'a0000000-0000-0000-0000-000000000002', 'disabled'),
    ('c0000000-0000-0000-0000-000000000007', 'ANYmal-Golf',    'ANYmal X', '4.2.1', 'a0000000-0000-0000-0000-000000000001', 'disabled'),
    ('c0000000-0000-0000-0000-000000000008', 'ANYmal-Hotel',   'ANYmal X', '4.2.1', 'a0000000-0000-0000-0000-000000000002', 'disabled'),
    ('c0000000-0000-0000-0000-000000000009', 'ANYmal-India',   'ANYmal X', '4.2.1', 'a0000000-0000-0000-0000-000000000001', 'disabled'),
    ('c0000000-0000-0000-0000-00000000000a', 'ANYmal-Juliet',  'ANYmal X', '4.2.1', 'a0000000-0000-0000-0000-000000000002', 'disabled');

INSERT INTO anomaly_rules (sensor_type, rule_type, max_threshold, z_score_threshold, severity, enabled) VALUES
    ('temperature', 'absolute_threshold', 85.0, 3.0, 'critical', true),
    ('temperature', 'rate_of_change', NULL, 3.0, 'high', true),
    ('vibration', 'absolute_threshold', 12.0, 3.0, 'high', true),
    ('vibration', 'z_score', NULL, 5.0, 'medium', false),
    ('pressure', 'absolute_threshold', 150.0, 3.0, 'critical', true);

UPDATE anomaly_rules SET rate_of_change_limit = 5.0 WHERE rule_type = 'rate_of_change';

-- Default admin user (password: admin123 — bcrypt hash)
INSERT INTO users (email, password_hash, name, role, site_ids) VALUES
    ('admin@anybotics.com', '$2b$10$2IvO0j4j9iuZvAgq2z9gXO3VcPThh8g17aJAX44u.xWUEQtm8b/tO', 'Admin', 'admin', ARRAY['a0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid]);
