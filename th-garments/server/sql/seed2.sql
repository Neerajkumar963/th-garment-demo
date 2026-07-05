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
TRUNCATE TABLE `org_dress`;
TRUNCATE TABLE `organization`;
TRUNCATE TABLE `emp_details`;
TRUNCATE TABLE `emp_roles`;
TRUNCATE TABLE `items`;
TRUNCATE TABLE `process_stage`;
TRUNCATE TABLE `price_list`;
TRUNCATE TABLE `label_stock`;
TRUNCATE TABLE `labelling`;

-- 3. Seed Employee Roles (Original)
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

-- 5. Seed Production Stages (Original)
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

-- 6. Seed Organizations (Clients) with Expanded Branches
INSERT INTO `organization` (`id`, `name`, `org_name`, `phone`, `email`, `gstin`, `adhaar`, `branch`, `org_type`) VALUES
(1, 'Mr. Sharma', 'Global High School', '9911223344', 'contact@globalhigh.com', '07AAAAA0000A1Z5', '123412341234', 
'[{"id": "1", "name": "Main Office", "address": "Delhi", "phone": "9911223301"}, {"id": "2", "name": "West Wing", "address": "Rohini", "phone": "9911223302"}, {"id": "3", "name": "North Branch", "address": "Pitampura", "phone": "9911223303"}, {"id": "4", "name": "South Campus", "address": "Saket", "phone": "9911223304"}]', 'Wholesale'),

(2, 'Tech Admin', 'Innovate Tech Solutions', '9922334455', 'admin@innovate.com', '08BBBBB1111B2Z6', '567856785678', 
'[{"id": "5", "name": "HQ Gurgaon", "address": "Sector 44", "phone": "9922334401"}, {"id": "6", "name": "R&D Lab", "address": "Noida", "phone": "9922334402"}, {"id": "7", "name": "Sales CP", "address": "Connaught Place", "phone": "9922334403"}, {"id": "8", "name": "Production Unit", "address": "Manesar", "phone": "9922334404"}]', 'Retail'),

(3, 'Dr. Gupta', 'City Care Hospital', '9933445566', 'care@cityhospital.com', '09CCCCC2222C3Z7', '901290129012', 
'[{"id": "9", "name": "Main Emergency", "address": "New Delhi", "phone": "9933445501"}, {"id": "10", "name": "OPD Unit", "address": "Dwarka", "phone": "9933445502"}, {"id": "11", "name": "Pathology Lab", "address": "Janakpuri", "phone": "9933445503"}]', 'Distribution');

-- 7. Seed Items
INSERT INTO `items` (`id`, `name`, `symbol`, `item_type`, `gender`) VALUES
(1, 'School Shirt', 'SSH', 'tailor_made', 'U'),
(2, 'Corporate Trouser', 'CTR', 'tailor_made', 'M'),
(3, 'Nurse Tunic', 'NTU', 'tailor_made', 'F'),
(4, 'School Blazer', 'SBZ', 'tailor_made', 'U'),
(5, 'Pleated Skirt', 'PSK', 'tailor_made', 'F');

-- 8. Seed Fabric Master Data (Original)
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

-- 10. Seed Organization Dress (Mapping to corrected IDs)
INSERT INTO `org_dress` (`org_dress_name`, `org_id`, `item_id`, `color_id`, `material_req`, `processing_rate`, `remarks`) VALUES
('GHS White Shirt', 1, 1, 5, '1.5m', 45.00, '{"ct":1, "d":1, "q":1}'), -- Cotton, Plain, Premium
('GHS Navy Blazer', 1, 4, 2, '2.5m', 150.00, '{"ct":5, "d":1, "q":1}'), -- Wool, Plain, Premium
('GHS Pleated Skirt', 1, 5, 2, '1.2m', 60.00, '{"ct":1, "d":1, "q":1}'), -- Cotton, Plain, Premium
('Tech Blue Trouser', 2, 2, 2, '1.2m', 60.00, '{"ct":3, "d":1, "q":2}'), -- Polyester, Plain, Standard
('City Care Tunic', 3, 3, 6, '2.0m', 55.00, '{"ct":1, "d":3, "q":1}'); -- Cotton, Checked, Premium

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;