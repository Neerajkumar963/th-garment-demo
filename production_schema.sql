-- MySQL dump 10.13  Distrib 8.4.8, for Linux (x86_64)
--
-- Host: localhost    Database: th_garments
-- ------------------------------------------------------
-- Server version	8.4.8-0ubuntu0.25.10.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `attendance_log`
--

DROP TABLE IF EXISTS `attendance_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `emp_id` int NOT NULL,
  `attendance_details` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `day_rate` decimal(10,2) DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_general_ci,
  `created_on` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY `emp_id` (`emp_id`),
  CONSTRAINT `attendance_log_ibfk_1` FOREIGN KEY (`emp_id`) REFERENCES `emp_details` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cloth_detail`
--

DROP TABLE IF EXISTS `cloth_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cloth_detail` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cloth_type_id` int NOT NULL,
  `color_id` int NOT NULL,
  `design_id` int NOT NULL,
  `quality_id` int NOT NULL,
  `total_quantity` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `cloth_type_id` (`cloth_type_id`),
  KEY `color_id` (`color_id`),
  KEY `design_id` (`design_id`),
  KEY `quality_id` (`quality_id`),
  CONSTRAINT `cloth_detail_ibfk_1` FOREIGN KEY (`cloth_type_id`) REFERENCES `cloth_type` (`id`),
  CONSTRAINT `cloth_detail_ibfk_2` FOREIGN KEY (`color_id`) REFERENCES `colors` (`id`),
  CONSTRAINT `cloth_detail_ibfk_3` FOREIGN KEY (`design_id`) REFERENCES `design` (`id`),
  CONSTRAINT `cloth_detail_ibfk_4` FOREIGN KEY (`quality_id`) REFERENCES `quality` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=118 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cloth_quantity`
--

DROP TABLE IF EXISTS `cloth_quantity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cloth_quantity` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cloth_detail_id` int NOT NULL,
  `roll_quantity` decimal(10,2) DEFAULT NULL,
  `created_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `unit` enum('Kg.','Mtr.') COLLATE utf8mb4_general_ci DEFAULT 'Mtr.',
  PRIMARY KEY (`id`),
  KEY `cloth_detail_id` (`cloth_detail_id`),
  CONSTRAINT `cloth_quantity_ibfk_1` FOREIGN KEY (`cloth_detail_id`) REFERENCES `cloth_detail` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=553 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cloth_type`
--

DROP TABLE IF EXISTS `cloth_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cloth_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `created_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `colors`
--

DROP TABLE IF EXISTS `colors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `colors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `color_name` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `applicability` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_color_name` (`color_name`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cut_stock`
--

DROP TABLE IF EXISTS `cut_stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cut_stock` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cutting_process_id` int NOT NULL,
  `sq` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `created_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `cutting_process_id` (`cutting_process_id`),
  CONSTRAINT `cut_stock_ibfk_1` FOREIGN KEY (`cutting_process_id`) REFERENCES `cutting_process` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cut_stock_chk_1` CHECK (json_valid(`sq`))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cutting_details`
--

DROP TABLE IF EXISTS `cutting_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cutting_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cutting_process_id` int NOT NULL,
  `cloth_quantity_id` int NOT NULL,
  `bal_cloth` decimal(10,2) NOT NULL,
  `cut_type` enum('primary','secondary','pocket','kharcha') COLLATE utf8mb4_general_ci NOT NULL,
  `cut_rate` decimal(10,2) DEFAULT NULL,
  `created_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `cutting_process_id` (`cutting_process_id`),
  KEY `cloth_quantity_id` (`cloth_quantity_id`),
  CONSTRAINT `cutting_details_ibfk_1` FOREIGN KEY (`cutting_process_id`) REFERENCES `cutting_process` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cutting_details_ibfk_2` FOREIGN KEY (`cloth_quantity_id`) REFERENCES `cloth_quantity` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cutting_process`
--

DROP TABLE IF EXISTS `cutting_process`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cutting_process` (
  `id` int NOT NULL AUTO_INCREMENT,
  `emp_id` int NOT NULL,
  `org_dress_id` int NOT NULL,
  `order_id` int NOT NULL,
  `sq` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `pattern_series` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'Pending',
  `remarks` text COLLATE utf8mb4_general_ci,
  `created_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `emp_id` (`emp_id`),
  KEY `org_dress_id` (`org_dress_id`),
  KEY `order_id` (`order_id`),
  CONSTRAINT `cutting_process_ibfk_1` FOREIGN KEY (`emp_id`) REFERENCES `emp_details` (`id`),
  CONSTRAINT `cutting_process_ibfk_2` FOREIGN KEY (`org_dress_id`) REFERENCES `org_dress` (`id`),
  CONSTRAINT `cutting_process_ibfk_3` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `cutting_process_chk_1` CHECK (json_valid(`sq`))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `design`
--

DROP TABLE IF EXISTS `design`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `design` (
  `id` int NOT NULL AUTO_INCREMENT,
  `design_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `emp_account`
--

DROP TABLE IF EXISTS `emp_account`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emp_account` (
  `id` int NOT NULL AUTO_INCREMENT,
  `emp_id` int NOT NULL,
  `transaction` enum('DR','CR') COLLATE utf8mb4_general_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `balance` decimal(10,2) NOT NULL,
  `mode` enum('Cash','Online','Kind') COLLATE utf8mb4_general_ci NOT NULL,
  `remarks` text COLLATE utf8mb4_general_ci,
  `datetime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `emp_id` (`emp_id`),
  CONSTRAINT `emp_account_ibfk_1` FOREIGN KEY (`emp_id`) REFERENCES `emp_details` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `emp_details`
--

DROP TABLE IF EXISTS `emp_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emp_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `adhaar` varchar(12) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `role_id` int NOT NULL,
  `phone` varchar(15) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `emp_details_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `emp_roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `emp_roles`
--

DROP TABLE IF EXISTS `emp_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emp_roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `extension_type`
--

DROP TABLE IF EXISTS `extension_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `extension_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `extension_type` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `extension_type_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `items`
--

DROP TABLE IF EXISTS `items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `symbol` varchar(4) COLLATE utf8mb4_general_ci NOT NULL,
  `item_type` enum('tailor_made','ready_made') COLLATE utf8mb4_general_ci NOT NULL,
  `gender` enum('M','F','U') COLLATE utf8mb4_general_ci NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `symbol` (`symbol`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `label_stock`
--

DROP TABLE IF EXISTS `label_stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `label_stock` (
  `id` int NOT NULL AUTO_INCREMENT,
  `labelling_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT '0',
  `created_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `labelling_id` (`labelling_id`),
  CONSTRAINT `label_stock_ibfk_1` FOREIGN KEY (`labelling_id`) REFERENCES `labelling` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `label_type`
--

DROP TABLE IF EXISTS `label_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `label_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `label_type` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `label_type_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `labelling`
--

DROP TABLE IF EXISTS `labelling`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `labelling` (
  `id` int NOT NULL AUTO_INCREMENT,
  `org_dress_id` int NOT NULL,
  `label_type_id` int NOT NULL,
  `stockable` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `org_dress_id` (`org_dress_id`),
  KEY `label_type_id` (`label_type_id`),
  CONSTRAINT `labelling_ibfk_1` FOREIGN KEY (`org_dress_id`) REFERENCES `org_dress` (`id`) ON DELETE CASCADE,
  CONSTRAINT `labelling_ibfk_2` FOREIGN KEY (`label_type_id`) REFERENCES `label_type` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `material_required`
--

DROP TABLE IF EXISTS `material_required`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_required` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `material_required` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `material_required_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `order_details`
--

DROP TABLE IF EXISTS `order_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `org_dress_id` int NOT NULL,
  `sq` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `customization` text COLLATE utf8mb4_general_ci,
  `remarks` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `org_dress_id` (`org_dress_id`),
  CONSTRAINT `order_details_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_details_ibfk_2` FOREIGN KEY (`org_dress_id`) REFERENCES `org_dress` (`id`),
  CONSTRAINT `order_details_chk_1` CHECK (json_valid(`sq`))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `org_id` int NOT NULL,
  `branch` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `date` date NOT NULL,
  `order_type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `advance` decimal(10,2) DEFAULT '0.00',
  `status` varchar(50) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Pending',
  `remarks` text COLLATE utf8mb4_general_ci,
  `eta` date DEFAULT NULL,
  `customer_details` text COLLATE utf8mb4_general_ci,
  `created_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `dispatch_status` enum('Pending','Packed','Delivered') COLLATE utf8mb4_general_ci DEFAULT 'Pending',
  `delivered_on` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `org_id` (`org_id`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`org_id`) REFERENCES `organization` (`id`),
  CONSTRAINT `orders_chk_1` CHECK (json_valid(`branch`))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `org_account`
--

DROP TABLE IF EXISTS `org_account`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `org_account` (
  `id` int NOT NULL AUTO_INCREMENT,
  `org_id` int NOT NULL,
  `transaction` enum('DR','CR') COLLATE utf8mb4_general_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `balance` decimal(10,2) NOT NULL,
  `mode` enum('Cash','Online','Supply') COLLATE utf8mb4_general_ci NOT NULL,
  `remarks` text COLLATE utf8mb4_general_ci,
  `datetime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `org_id` (`org_id`),
  CONSTRAINT `org_account_ibfk_1` FOREIGN KEY (`org_id`) REFERENCES `organization` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `org_dress`
--

DROP TABLE IF EXISTS `org_dress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `org_dress` (
  `id` int NOT NULL AUTO_INCREMENT,
  `org_dress_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `org_id` int NOT NULL,
  `item_id` int NOT NULL,
  `color_id` int NOT NULL,
  `material_req` text COLLATE utf8mb4_general_ci,
  `processing_rate` decimal(10,2) NOT NULL,
  `remarks` text COLLATE utf8mb4_general_ci,
  `created_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `org_id` (`org_id`),
  KEY `item_id` (`item_id`),
  KEY `color_id` (`color_id`),
  CONSTRAINT `org_dress_ibfk_1` FOREIGN KEY (`org_id`) REFERENCES `organization` (`id`),
  CONSTRAINT `org_dress_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `org_dress_ibfk_3` FOREIGN KEY (`color_id`) REFERENCES `colors` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `org_dress_extension`
--

DROP TABLE IF EXISTS `org_dress_extension`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `org_dress_extension` (
  `id` int NOT NULL AUTO_INCREMENT,
  `org_dress_id` int NOT NULL,
  `cloth_detail_id` int NOT NULL,
  `extension_type_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `org_dress_id` (`org_dress_id`),
  KEY `fk_ode_cloth` (`cloth_detail_id`),
  KEY `fk_ode_ext_type` (`extension_type_id`),
  CONSTRAINT `fk_ode_cloth` FOREIGN KEY (`cloth_detail_id`) REFERENCES `cloth_detail` (`id`),
  CONSTRAINT `fk_ode_ext_type` FOREIGN KEY (`extension_type_id`) REFERENCES `extension_type` (`id`),
  CONSTRAINT `org_dress_extension_ibfk_1` FOREIGN KEY (`org_dress_id`) REFERENCES `org_dress` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `organization`
--

DROP TABLE IF EXISTS `organization`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organization` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `org_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `phone` varchar(15) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `gstin` varchar(15) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `adhaar` varchar(12) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `branch` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `org_type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `organization_chk_1` CHECK (json_valid(`branch`))
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `patterns`
--

DROP TABLE IF EXISTS `patterns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patterns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pattern_series` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `item_id` int NOT NULL,
  `size` varchar(10) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `created_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `patterns_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `price_list`
--

DROP TABLE IF EXISTS `price_list`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `price_list` (
  `id` int NOT NULL AUTO_INCREMENT,
  `org_dress_id` int NOT NULL,
  `size` varchar(10) COLLATE utf8mb4_general_ci NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `created_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `org_dress_id` (`org_dress_id`),
  CONSTRAINT `price_list_ibfk_1` FOREIGN KEY (`org_dress_id`) REFERENCES `org_dress` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `process_stage`
--

DROP TABLE IF EXISTS `process_stage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `process_stage` (
  `id` int NOT NULL,
  `stage_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `processing`
--

DROP TABLE IF EXISTS `processing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `processing` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cut_stock_id` int NOT NULL,
  `sq` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `status` enum('in_queue','in_process','processed') COLLATE utf8mb4_general_ci DEFAULT 'in_queue',
  `remarks` text COLLATE utf8mb4_general_ci,
  `created_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `cut_stock_id` (`cut_stock_id`),
  CONSTRAINT `processing_ibfk_1` FOREIGN KEY (`cut_stock_id`) REFERENCES `cut_stock` (`id`),
  CONSTRAINT `processing_chk_1` CHECK (json_valid(`sq`))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `processing_details`
--

DROP TABLE IF EXISTS `processing_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `processing_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `processing_id` int NOT NULL,
  `sq` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `emp_id` int DEFAULT NULL,
  `stage_id` int NOT NULL,
  `processing_rate` decimal(10,2) DEFAULT NULL,
  `status` enum('in_process','processed') COLLATE utf8mb4_unicode_ci DEFAULT 'in_process',
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `processing_id` (`processing_id`),
  KEY `emp_id` (`emp_id`),
  KEY `stage_id` (`stage_id`),
  CONSTRAINT `processing_details_ibfk_1` FOREIGN KEY (`processing_id`) REFERENCES `processing` (`id`),
  CONSTRAINT `processing_details_ibfk_2` FOREIGN KEY (`emp_id`) REFERENCES `emp_details` (`id`),
  CONSTRAINT `processing_details_ibfk_3` FOREIGN KEY (`stage_id`) REFERENCES `process_stage` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `quality`
--

DROP TABLE IF EXISTS `quality`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quality` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quality_name` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `receipt_format`
--

DROP TABLE IF EXISTS `receipt_format`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `receipt_format` (
  `id` int NOT NULL AUTO_INCREMENT,
  `receipt_type` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `format_data` text COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `receipt_logs`
--

DROP TABLE IF EXISTS `receipt_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `receipt_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `receipt_format_id` int NOT NULL,
  `receipt_no` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `receipt_details` text COLLATE utf8mb4_general_ci,
  `created_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `receipt_format_id` (`receipt_format_id`),
  CONSTRAINT `receipt_logs_ibfk_1` FOREIGN KEY (`receipt_format_id`) REFERENCES `receipt_format` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sales_detail`
--

DROP TABLE IF EXISTS `sales_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_detail` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sales_history_id` int NOT NULL,
  `org_dress_id` int NOT NULL,
  `barcode_id` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `size` varchar(10) COLLATE utf8mb4_general_ci NOT NULL,
  `quantity` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sales_history_id` (`sales_history_id`),
  KEY `org_dress_id` (`org_dress_id`),
  CONSTRAINT `sales_detail_ibfk_1` FOREIGN KEY (`sales_history_id`) REFERENCES `sales_history` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_detail_ibfk_2` FOREIGN KEY (`org_dress_id`) REFERENCES `org_dress` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sales_history`
--

DROP TABLE IF EXISTS `sales_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `barcode_id` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `organization` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `branch` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `supply_type` enum('inward','outward') COLLATE utf8mb4_general_ci NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `created_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `selling_stock`
--

DROP TABLE IF EXISTS `selling_stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `selling_stock` (
  `id` int NOT NULL AUTO_INCREMENT,
  `org_dress_id` int NOT NULL,
  `brand` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `size` varchar(10) COLLATE utf8mb4_general_ci NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `remarks` text COLLATE utf8mb4_general_ci,
  `created_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `org_dress_id` (`org_dress_id`),
  CONSTRAINT `selling_stock_ibfk_1` FOREIGN KEY (`org_dress_id`) REFERENCES `org_dress` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `role` varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'admin',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-25  2:06:29
