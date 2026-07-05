USE th_garments;

-- Disable foreign key checks for clean cleanup
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Cleanup Transactional/History Data
TRUNCATE TABLE `delivery_history`;
TRUNCATE TABLE `order_details`;
TRUNCATE TABLE `orders`;
TRUNCATE TABLE `processing_details`;
TRUNCATE TABLE `processing`;
TRUNCATE TABLE `cut_stock`;
TRUNCATE TABLE `cutting_details`;
TRUNCATE TABLE `cutting_process`;
TRUNCATE TABLE `attendance_log`;
TRUNCATE TABLE `emp_account`;
TRUNCATE TABLE `org_account`;
TRUNCATE TABLE `sales_detail`;
TRUNCATE TABLE `sales_history`;
TRUNCATE TABLE `selling_stock`;
TRUNCATE TABLE `receipt_logs`;

-- 2. Cleanup Master Data
TRUNCATE TABLE `cloth_quantity`;
TRUNCATE TABLE `cloth_detail`;
TRUNCATE TABLE `cloth_type`;
TRUNCATE TABLE `colors`;
TRUNCATE TABLE `design`;
TRUNCATE TABLE `quality`;
TRUNCATE TABLE `articles`;
TRUNCATE TABLE `orgs_articles`;
TRUNCATE TABLE `organization`;
TRUNCATE TABLE `emp_details`;
TRUNCATE TABLE `emp_roles`;
TRUNCATE TABLE `items`;
TRUNCATE TABLE `process_stage`;
TRUNCATE TABLE `price_list`;
TRUNCATE TABLE `label_stock`;
TRUNCATE TABLE `labelling`;
TRUNCATE TABLE `users`;

-- 3. Seed Employee Roles
INSERT INTO `emp_roles` (`id`, `role`) VALUES
(1, 'Manager'),
(2, 'Cutter'),
(3, 'Stitcher'),
(4, 'Helper'),
(5, 'Fabricator');

-- 4. Seed Employees
INSERT INTO `emp_details` (`name`, `adhaar`, `role_id`, `phone`) VALUES
('Deepak Sharma', '444455556666', 1, '9856789012'),
('Sunil Yadav', '400050006000', 2, '9823456789'),
('Rajesh Kumar', '100020003000', 3, '9812345678'),
('Karan Singh', '111122223333', 4, '9845678901'),
('Mohit Fabricators', '700080009000', 5, '9834567890');

-- 5. Seed Production Stages
INSERT INTO `process_stage` (`id`, `stage_name`) VALUES
(0, 'Yet to Process'),
(1, 'Pasting and Elastic'),
(2, 'Stitching'),
(3, 'Overlock'),
(4, 'Kaaj Button'),
(5, 'Thaaga Cutting'),
(6, 'Labelling'),
(7, 'Press & Packing'),
(8, 'Processed');

-- 6. Seed Organizations (Clients)
INSERT INTO `organization` (`id`, `name`, `org_name`, `phone`, `email`, `gstin`, `adhaar`, `branch`, `org_type`) VALUES
(1, 'Mr. Sharma', 'Global High School', '9911223344', 'contact@globalhigh.com', '07AAAAA0000A1Z5', '123412341234', 
'[{"id": "1", "name": "Main Office", "address": "Delhi", "phone": "9911223301"}, {"id": "2", "name": "West Wing", "address": "Rohini", "phone": "9911223302"}]', 'Wholesale'),

(2, 'Tech Admin', 'Innovate Tech Solutions', '9922334455', 'admin@innovate.com', '08BBBBB1111B2Z6', '567856785678', 
'[{"id": "5", "name": "HQ Gurgaon", "address": "Sector 44", "phone": "9922334401"}, {"id": "6", "name": "R&D Lab", "address": "Noida", "phone": "9922334402"}]', 'Retail'),

(3, 'Dr. Gupta', 'City Care Hospital', '9933445566', 'care@cityhospital.com', '09CCCCC2222C3Z7', '901290129012', 
'[{"id": "9", "name": "Main Emergency", "address": "New Delhi", "phone": "9933445501"}]', 'Distribution');

-- 7. Seed Items
INSERT INTO `items` (`id`, `name`, `symbol`, `item_type`, `gender`) VALUES
(1, 'School Shirt', 'SSH', 'tailor_made', 'U'),
(2, 'Corporate Trouser', 'CTR', 'tailor_made', 'M'),
(3, 'Nurse Tunic', 'NTU', 'tailor_made', 'F'),
(4, 'School Blazer', 'SBZ', 'tailor_made', 'U'),
(5, 'Pleated Skirt', 'PSK', 'tailor_made', 'F');

-- 8. Seed Fabric Master Data
INSERT INTO `cloth_type` (`id`, `type`) VALUES 
(1, 'Cotton'), (2, 'Linen'), (3, 'Polyester'), (4, 'Silk'), (5, 'Wool');

INSERT INTO `colors` (`id`, `color_name`, `applicability`) VALUES 
(1, 'Red', 'Universal'), (2, 'Blue', 'Universal'), (3, 'Green', 'Universal'), (4, 'Black', 'Universal'), (5, 'White', 'Universal'), (6, 'Sky Blue', NULL);

INSERT INTO `design` (`id`, `design_name`) VALUES 
(1, 'Plain'), (2, 'Striped'), (3, 'Checked'), (4, 'Printed');

INSERT INTO `quality` (`id`, `quality_name`) VALUES 
(1, 'Premium'), (2, 'Standard'), (3, 'Economy');

-- 9. Seed Cloth Inventory
-- Cotton White Plain Premium
INSERT INTO `cloth_detail` (`id`, `cloth_type_id`, `color_id`, `design_id`, `quality_id`, `total_quantity`) VALUES
(1, 1, 5, 1, 1, 1000.00), -- Cotton White Plain Premium
(2, 3, 2, 1, 2, 800.00),  -- Polyester Blue Plain Standard
(3, 1, 6, 3, 1, 500.00),  -- Cotton Sky Blue Checked Premium
(4, 5, 2, 1, 1, 300.00);  -- Wool Blue Plain Premium (Blazer)

-- Rolls for Stock
INSERT INTO `cloth_quantity` (`cloth_detail_id`, `roll_quantity`) VALUES
(1, 250.00), (1, 250.00), (1, 500.00),
(2, 400.00), (2, 400.00),
(3, 250.00), (3, 250.00),
(4, 150.00), (4, 150.00);

-- 10. Seed Articles (Master templates)
INSERT INTO `articles` (`id`, `item_id`, `cloth_detail_id`, `material_req`, `remarks`) VALUES
(1, 1, 1, '1.5m', '{"ct":1, "d":1, "q":1}'), -- Cotton White Plain Premium
(2, 4, 4, '2.5m', '{"ct":5, "d":1, "q":1}'), -- Wool Blue Plain Premium (Blazer)
(3, 5, 1, '1.2m', '{"ct":1, "d":1, "q":1}'), -- Cotton White Plain Premium (Skirt)
(4, 2, 2, '1.2m', '{"ct":3, "d":1, "q":2}'), -- Polyester Blue Plain Standard (Trouser)
(5, 3, 3, '2.0m', '{"ct":1, "d":3, "q":1}'); -- Cotton Checked Premium (Tunic)

-- 11. Seed Orgs Articles Junction
INSERT INTO `orgs_articles` (`article_id`, `org_id`, `dress_name`, `status`, `stage_code`) VALUES
(1, 1, 'GHS White Shirt', 1, 'SSH'),
(2, 1, 'GHS Navy Blazer', 1, 'SBZ'),
(3, 1, 'GHS Pleated Skirt', 1, 'PSK'),
(4, 2, 'Tech Blue Trouser', 1, 'CTR'),
(5, 3, 'City Care Tunic', 1, 'NTU');

-- 12. Seed Price List
INSERT INTO `price_list` (`article_id`, `size`, `price`) VALUES
(1, 'S', 250.00), (1, 'M', 280.00), (1, 'L', 300.00),
(2, 'S', 1200.00), (2, 'M', 1300.00), (2, 'L', 1400.00),
(3, 'S', 350.00), (3, 'M', 380.00), (3, 'L', 400.00),
(4, 'S', 500.00), (4, 'M', 550.00), (4, 'L', 600.00),
(5, 'S', 450.00), (5, 'M', 480.00), (5, 'L', 500.00);

-- 13. Seed Default Admin User
-- Email: admin@demo.com, Password: admin123
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`) VALUES
(1, 'Demo Admin', 'admin@demo.com', '$2a$10$dZYiPTgBOt9zvMTh6ecTheDj92KIGzYMBZBtr4UDpYl34nNzNqzou', 'admin');

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
