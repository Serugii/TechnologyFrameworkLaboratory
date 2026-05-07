CREATE TABLE `devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`device` varchar(50) NOT NULL,
	`room` varchar(30) NOT NULL,
	`status` enum('on','off') NOT NULL DEFAULT 'off',
	`description` varchar(255) NOT NULL DEFAULT '',
	`image` varchar(500) DEFAULT null,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `devices_id` PRIMARY KEY(`id`)
);
