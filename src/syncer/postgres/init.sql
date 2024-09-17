BEGIN;

CREATE TABLE block
(
  id          BIGINT PRIMARY KEY,
  slot        BIGINT  NOT NULL,
  header_hash VARCHAR NOT NULL
);

-- CREATE TABLE transaction
-- (
--   id       BIGSERIAL PRIMARY KEY,
--   tx_id    VARCHAR NOT NULL UNIQUE,
--   block_id BIGINT  NOT NULL
-- );

CREATE TABLE pool_v1
(
  id               BIGSERIAL PRIMARY KEY,
  lp_asset         VARCHAR NOT NULL,
  asset_a          VARCHAR NOT NULL,
  asset_b          VARCHAR NOT NULL,
  reserve_a        DECIMAL NOT NULL,
  reserve_b        DECIMAL NOT NULL,
  total_liquidity  DECIMAL NOT NULL,
  created_tx_id    VARCHAR NOT NULL,
  created_tx_index INTEGER NOT NULL,
  pool_address     VARCHAR NOT NULL,
  slot             BIGINT  NOT NULL,
  block_id         BIGINT  NOT NULL
);

CREATE TABLE pool_v2
(
  id               BIGSERIAL PRIMARY KEY,
  lp_asset         VARCHAR NOT NULL,
  asset_a          VARCHAR NOT NULL,
  asset_b          VARCHAR NOT NULL,
  datum_reserve_a  DECIMAL NOT NULL,
  datum_reserve_b  DECIMAL NOT NULL,
  value_reserve_a  DECIMAL NOT NULL,
  value_reserve_b  DECIMAL NOT NULL,
  total_liquidity  DECIMAL NOT NULL,
  pool_address     VARCHAR NOT NULL,
  created_tx_id    VARCHAR NOT NULL,
  created_tx_index INTEGER NOT NULL,
  slot             BIGINT  NOT NULL,
  block_id         BIGINT  NOT NULL
);

CREATE TABLE stable_pool
(
  id               BIGSERIAL PRIMARY KEY,
  lp_asset         VARCHAR NOT NULL,
  total_liquidity  DECIMAL NOT NULL,
  created_tx_id    VARCHAR NOT NULL,
  created_tx_index INTEGER NOT NULL,
  datum            VARCHAR NOT NULL,
  slot             BIGINT  NOT NULL,
  block_id         BIGINT  NOT NULL
);

COMMIT;
