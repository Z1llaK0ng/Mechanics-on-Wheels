-- ============================================================
-- Mechanics-on-Wheels — Global Database Schema
-- MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS mechanics_on_wheels
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE mechanics_on_wheels;

-- ============================================================
-- 1. SHOP  (independent — no foreign keys)
-- ============================================================
CREATE TABLE IF NOT EXISTS shop (
    shop_id     INT             NOT NULL AUTO_INCREMENT,
    shop_name   VARCHAR(200)    NOT NULL,
    location    VARCHAR(300)    NOT NULL,

    PRIMARY KEY (shop_id),
    UNIQUE  KEY uq_shop_name (shop_name),
    INDEX   idx_shop_name    (shop_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 2. SUBSCRIPTIONS  (independent — no foreign keys)
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    subscription_id  INT            NOT NULL AUTO_INCREMENT,
    name             VARCHAR(100)   NOT NULL,
    payment_period   VARCHAR(50)    NOT NULL,   -- e.g. 'monthly', 'yearly'

    PRIMARY KEY (subscription_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 3. ACTIVE_SUBS  (links shop ↔ subscription)
-- ============================================================
CREATE TABLE IF NOT EXISTS active_subs (
    id                INT       NOT NULL AUTO_INCREMENT,
    shop_id           INT       NOT NULL,
    subscription_id   INT       NOT NULL,
    date_of_activation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_active_subs_shop
        FOREIGN KEY (shop_id)
        REFERENCES shop (shop_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_active_subs_subscription
        FOREIGN KEY (subscription_id)
        REFERENCES subscriptions (subscription_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 4. MECHANICS  (depends on shop)
-- ============================================================
CREATE TABLE IF NOT EXISTS mechanics (
    id              INT             NOT NULL AUTO_INCREMENT,
    first_name      VARCHAR(100)    NOT NULL,
    last_name       VARCHAR(100)    NOT NULL,
    email           VARCHAR(255)    NOT NULL,
    hashed_password VARCHAR(255)    NOT NULL,
    shop_id         INT             NOT NULL,
    active_status   TINYINT(1)      NOT NULL DEFAULT 1,   -- 1 = active

    PRIMARY KEY (id),
    UNIQUE  KEY uq_mechanic_email (email),
    INDEX   idx_mechanic_email   (email),

    CONSTRAINT fk_mechanics_shop
        FOREIGN KEY (shop_id)
        REFERENCES shop (shop_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 5. VEHICLE_OWNERS  (independent — CRM data)
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_owners (
    vo_id   INT             NOT NULL AUTO_INCREMENT,
    name    VARCHAR(200)    NOT NULL,
    phone   VARCHAR(20)     DEFAULT NULL,
    email   VARCHAR(255)    DEFAULT NULL,

    PRIMARY KEY (vo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 6. VEHICLES  (depends on vehicle_owners)
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
    registry       VARCHAR(20)   NOT NULL,             -- license plate (PK)
    vin            VARCHAR(17)   NOT NULL,
    company        VARCHAR(100)  NOT NULL,             -- manufacturer
    brand          VARCHAR(100)  NOT NULL,             -- model
    active_status  TINYINT(1)    NOT NULL DEFAULT 1,   -- 1 = active
    owner_id       INT           DEFAULT NULL,

    PRIMARY KEY (registry),
    UNIQUE  KEY uq_vehicle_vin (vin),
    INDEX   idx_vehicle_vin   (vin),

    CONSTRAINT fk_vehicles_owner
        FOREIGN KEY (owner_id)
        REFERENCES vehicle_owners (vo_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 7. JOB_CARDS  (depends on vehicles + mechanics)
-- ============================================================
CREATE TABLE IF NOT EXISTS job_cards (
    job_card_id       INT           NOT NULL AUTO_INCREMENT,
    vehicle_vin       VARCHAR(17)   NOT NULL,
    vehicle_registry  VARCHAR(20)   NOT NULL,
    upload_mechanic   INT           NOT NULL,
    parts_affected    TEXT          NOT NULL,           -- JSON or comma-separated
    details           TEXT          NOT NULL,           -- symptoms / diagnosis
    status            VARCHAR(50)   NOT NULL DEFAULT 'pending',  -- pending | in-progress | completed
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (job_card_id),

    CONSTRAINT fk_job_cards_vin
        FOREIGN KEY (vehicle_vin)
        REFERENCES vehicles (vin)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_job_cards_registry
        FOREIGN KEY (vehicle_registry)
        REFERENCES vehicles (registry)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_job_cards_mechanic
        FOREIGN KEY (upload_mechanic)
        REFERENCES mechanics (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
