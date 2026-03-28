-- ============================================================
-- E-Spec Manager - Additional Tables Setup
-- Run this AFTER importing your existing espec.sql
-- ============================================================

USE production;

-- Messages table for TECH <-> PPC spec chat
CREATE TABLE IF NOT EXISTS `spec_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `spec_id` int NOT NULL,
  `sender_nip` varchar(50) DEFAULT NULL,
  `sender_name` varchar(100) DEFAULT NULL,
  `sender_role` varchar(50) DEFAULT NULL,
  `message` text,
  `tagged_users` varchar(500) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `spec_id` (`spec_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Alerts / notification table
CREATE TABLE IF NOT EXISTS `spec_alerts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `spec_id` int DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL COMMENT 'new_upload | unrelease | released | coret',
  `message` text,
  `sender_role` varchar(50) DEFAULT NULL,
  `target_role` varchar(50) DEFAULT NULL,
  `is_read` tinyint DEFAULT 0,
  `expires_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `target_role` (`target_role`),
  KEY `is_read` (`is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Sample masterlogin data for testing
-- Password: 'admin123' (plain text for legacy - update to bcrypt in prod)
-- ============================================================

INSERT IGNORE INTO `masterlogin` (`nip`, `name`, `password`, `page`, `dept`) VALUES
('ADM001', 'Admin User',   'admin123', 'all',    'Admin'),
('TCH001', 'Tech User 1',  'tech123',  'master', 'Tech'),
('TCH002', 'Tech User 2',  'tech123',  'master', 'Tech'),
('PPC001', 'PPC User 1',   'ppc123',   'master', 'PPC'),
('PPC002', 'PPC User 2',   'ppc123',   'master', 'PPC');

-- ============================================================
-- Add pic_temp column to espec if not exists (for annotations)
-- ============================================================
ALTER TABLE `espec` MODIFY COLUMN `pic_temp` longblob DEFAULT NULL;

SELECT 'Setup complete!' AS status;
