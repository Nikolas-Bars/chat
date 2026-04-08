import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRolesAndReactions1744020000000 implements MigrationInterface {
  name = 'AddRolesAndReactions1744020000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `users` ADD `role` enum ('root', 'admin', 'user') NOT NULL DEFAULT 'user'",
    );

    await queryRunner.query(`
      CREATE TABLE \`reaction_catalog\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`value\` varchar(32) NOT NULL,
        \`created_by_user_id\` int NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_reaction_catalog_value\` (\`value\`),
        INDEX \`IDX_reaction_catalog_created_by\` (\`created_by_user_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_reaction_catalog_created_by\` FOREIGN KEY (\`created_by_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`message_reactions\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`message_id\` int NOT NULL,
        \`user_id\` int NOT NULL,
        \`reaction_value\` varchar(32) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`UQ_message_reactions_message_user\` (\`message_id\`, \`user_id\`),
        INDEX \`IDX_message_reactions_message_id\` (\`message_id\`),
        INDEX \`IDX_message_reactions_user_id\` (\`user_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_message_reactions_message\` FOREIGN KEY (\`message_id\`) REFERENCES \`messages\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_message_reactions_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO \`reaction_catalog\` (\`value\`)
      VALUES
      ('😀'), ('😁'), ('😂'), ('🤣'), ('😅'), ('😊'), ('😍'), ('😘'),
      ('😎'), ('🤔'), ('😴'), ('😢'), ('😭'), ('😡'), ('🤯'), ('😇'),
      ('👍'), ('👎'), ('👏'), ('🙌'), ('💪'), ('🔥'), ('💯'), ('🎉'),
      ('❤️'), ('💔'), ('💙'), ('💚'), ('🤍'), ('🖤'), ('✅'), ('❌')
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `message_reactions`');
    await queryRunner.query('DROP TABLE `reaction_catalog`');
    await queryRunner.query('ALTER TABLE `users` DROP COLUMN `role`');
  }
}

