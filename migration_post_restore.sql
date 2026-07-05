-- REFINED POST-RESTORATION MIGRATION SCRIPT
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Create the Junction Table (Bridge)
CREATE TABLE IF NOT EXISTS `orgs_articles` (
  `article_id` int(11) NOT NULL,
  `org_id` int(11) NOT NULL,
  `dress_name` varchar(255) NOT NULL,
  `status` tinyint(1) DEFAULT 1,
  `stage_code` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`article_id`,`org_id`),
  KEY `fk_oa_org` (`org_id`),
  CONSTRAINT `fk_oa_article` FOREIGN KEY (`article_id`) REFERENCES `org_dress` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_oa_org` FOREIGN KEY (`org_id`) REFERENCES `organization` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Populate the Junction Table from legacy data (WHILE IT IS STILL org_dress)
INSERT INTO `orgs_articles` (`article_id`, `org_id`, `dress_name`, `status`, `stage_code`)
SELECT `id`, `org_id`, `org_dress_name`, 1, (SELECT symbol FROM items WHERE id = item_id) FROM `org_dress`;

-- 3. Rename core tables
RENAME TABLE `org_dress` TO `articles`;
RENAME TABLE `org_dress_extension` TO `article_extension`;

-- 4. Update Articles table structure
-- MySQL renames the FK to articles_ibfk_1 automatically during RENAME.
ALTER TABLE `articles` DROP FOREIGN KEY `articles_ibfk_1`;
ALTER TABLE `articles` DROP COLUMN `org_id`;
ALTER TABLE `articles` DROP COLUMN `org_dress_name`;
ALTER TABLE `articles` DROP COLUMN `processing_rate`;
ALTER TABLE `articles` CHANGE COLUMN `color_id` `cloth_detail_id` int(11) NOT NULL;

-- 5. Update Cutting Process table
ALTER TABLE `cutting_process` DROP FOREIGN KEY `cutting_process_ibfk_2`;
ALTER TABLE `cutting_process` CHANGE COLUMN `org_dress_id` `article_id` int(11) NOT NULL;
ALTER TABLE `cutting_process` ADD CONSTRAINT `fk_cutting_article` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`);

-- 6. Update Order Details table
ALTER TABLE `order_details` DROP FOREIGN KEY `order_details_ibfk_2`;
ALTER TABLE `order_details` CHANGE COLUMN `org_dress_id` `article_id` int(11) NOT NULL;
ALTER TABLE `order_details` ADD CONSTRAINT `fk_order_article` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`);

-- 7. Update Labelling table
ALTER TABLE `labelling` DROP FOREIGN KEY `labelling_ibfk_1`;
ALTER TABLE `labelling` ADD COLUMN `org_id` int(11) DEFAULT NULL;
ALTER TABLE `labelling` CHANGE COLUMN `org_dress_id` `article_id` int(11) NOT NULL;
ALTER TABLE `labelling` ADD KEY `fk_labelling_org` (`org_id`);
ALTER TABLE `labelling` ADD CONSTRAINT `fk_labelling_org` FOREIGN KEY (`org_id`) REFERENCES `organization` (`id`) ON DELETE SET NULL;
ALTER TABLE `labelling` ADD CONSTRAINT `fk_labelling_article` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON DELETE CASCADE;

-- 8. Update Price List table
ALTER TABLE `price_list` DROP FOREIGN KEY `price_list_ibfk_1`;
ALTER TABLE `price_list` CHANGE COLUMN `org_dress_id` `article_id` int(11) NOT NULL;
ALTER TABLE `price_list` ADD CONSTRAINT `fk_price_article` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON DELETE CASCADE;

-- 9. Update Selling Stock table
ALTER TABLE `selling_stock` DROP FOREIGN KEY `selling_stock_ibfk_1`;
ALTER TABLE `selling_stock` CHANGE COLUMN `org_dress_id` `article_id` int(11) NOT NULL;
ALTER TABLE `selling_stock` ADD CONSTRAINT `fk_selling_article` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON DELETE CASCADE;

-- 10. Update Article Extension table
ALTER TABLE `article_extension` DROP FOREIGN KEY `article_extension_ibfk_1`;
ALTER TABLE `article_extension` CHANGE COLUMN `org_dress_id` `article_id` int(11) NOT NULL;
ALTER TABLE `article_extension` ADD CONSTRAINT `fk_ext_article` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON DELETE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;
