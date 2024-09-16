BEGIN;

CREATE TABLE block
(
  id          BIGINT PRIMARY KEY,
  slot        BIGINT  NOT NULL,
  header_hash VARCHAR NOT NULL
);

CREATE TABLE transaction
(
  id       BIGSERIAL PRIMARY KEY,
  tx_id    VARCHAR NOT NULL UNIQUE,
  block_id BIGINT  NOT NULL
);

CREATE TABLE pool_v1
(
  id                BIGSERIAL PRIMARY KEY,
  lp_asset          VARCHAR                  NOT NULL,
  asset_a           VARCHAR                  NOT NULL,
  asset_b           VARCHAR                  NOT NULL,
  reserve_a         DECIMAL                  NOT NULL,
  reserve_b         DECIMAL                  NOT NULL,
  root_k_last       DECIMAL                  NOT NULL,
  total_liquidity   DECIMAL                  NOT NULL,
  liquidity_share   DECIMAL                  NOT NULL,
  fee_to            VARCHAR,
  fee_to_datum_hash VARCHAR,
  created_tx_id     VARCHAR                  NOT NULL,
  tx_index          INTEGER                  NOT NULL,
  slot              BIGINT                   NOT NULL,
  action            VARCHAR                  NOT NULL,
  address           VARCHAR                  NOT NULL,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL,
  block_id          BIGINT                   NOT NULL
);

CREATE TABLE pool_v2
(
  id                    BIGSERIAL PRIMARY KEY,
  lp_asset              VARCHAR                  NOT NULL,
  asset_a               VARCHAR                  NOT NULL,
  asset_b               VARCHAR                  NOT NULL,
  datum_reserve_a       DECIMAL                  NOT NULL,
  datum_reserve_b       DECIMAL                  NOT NULL,
  value_reserve_a       DECIMAL                  NOT NULL,
  value_reserve_b       DECIMAL                  NOT NULL,
  tvl_ada               DECIMAL                  NOT NULL,
  acc_volume_a          DECIMAL                  NOT NULL,
  acc_volume_b          DECIMAL                  NOT NULL,
  acc_volume_ada        DECIMAL                  NOT NULL,
  batch_volume_a        DECIMAL                  NOT NULL,
  batch_volume_b        DECIMAL                  NOT NULL,
  batch_volume_ada      DECIMAL                  NOT NULL,
  total_liquidity       DECIMAL                  NOT NULL,
  base_fee_a_numerator  DECIMAL                  NOT NULL,
  base_fee_b_numerator  DECIMAL                  NOT NULL,
  fee_sharing_numerator DECIMAL,
  allow_dynamic_fee     BOOLEAN                  NOT NULL,
  action                VARCHAR                  NOT NULL,
  address               VARCHAR                  NOT NULL,
  created_tx_id         VARCHAR                  NOT NULL,
  tx_index              INTEGER                  NOT NULL,
  slot                  BIGINT                   NOT NULL,
  created_at            TIMESTAMP WITH TIME ZONE NOT NULL,
  block_id              BIGINT                   NOT NULL
);

CREATE TABLE stable_pool
(
  id                        BIGSERIAL PRIMARY KEY,
  lp_asset                  VARCHAR                  NOT NULL,
  total_liquidity           BIGINT                   NOT NULL,
  base_fee                  BIGINT                   NOT NULL,
  admin_fee                 BIGINT                   NOT NULL,
  fee_denominator           BIGINT                   NOT NULL,
  amplification_coefficient BIGINT                   NOT NULL,
  created_tx_id             VARCHAR                  NOT NULL,
  tx_index                  INTEGER                  NOT NULL,
  datum                     VARCHAR                  NOT NULL,
  slot                      BIGINT                   NOT NULL,
  action                    VARCHAR                  NOT NULL,
  value                     JSONB                    NOT NULL,
  balance                   JSONB                    NOT NULL,
  pool_volume               JSONB                    NOT NULL,
  asset_volume              JSONB                    NOT NULL,
  created_at                TIMESTAMP WITH TIME ZONE NOT NULL,
  block_id                  BIGINT                   NOT NULL
);

COMMIT;
