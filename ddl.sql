-- nexus.games definition

CREATE TABLE `games` (
  `steam_app_id` varchar(100) NOT NULL,
  `steam_title` varchar(255) DEFAULT NULL,
  `steam_exe_target` varchar(255) DEFAULT NULL,
  `steam_start_dir` varchar(255) DEFAULT NULL,
  `steam_launch_args` varchar(255) DEFAULT NULL,
  `icon` longblob DEFAULT NULL,
  `game_location` varchar(255) DEFAULT NULL,
  `prefix_location` varchar(255) DEFAULT NULL,
  `launcher` enum('NOOP','PORT_PROTON','PS2','PS3','SWITCH_CITRON','SWITCH_RYUJINX') DEFAULT 'NOOP',
  `launcher_target` varchar(255) DEFAULT NULL,
  `game_hash_md5` varchar(255) DEFAULT NULL,
  `game_size_in_bytes` int(11) DEFAULT 0,
  `prefix_hash_md5` varchar(255) DEFAULT NULL,
  `prefix_size_in_bytes` int(11) DEFAULT 0,
  `status` enum('DRAFT','UPLOADING','ACTIVE','INACTIVE','ARCHIVED') DEFAULT 'DRAFT',
  PRIMARY KEY (`steam_app_id`),
  KEY `games_steam_title_IDX` (`steam_title`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;