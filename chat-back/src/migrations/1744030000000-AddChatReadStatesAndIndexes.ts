import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatReadStatesAndIndexes1744030000000
  implements MigrationInterface
{
  name = 'AddChatReadStatesAndIndexes1744030000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`chat_read_states\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`chat_id\` int NOT NULL,
        \`user_id\` int NOT NULL,
        \`last_read_message_id\` int NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`UQ_chat_read_states_chat_user\` (\`chat_id\`, \`user_id\`),
        INDEX \`IDX_chat_read_states_user_id\` (\`user_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_chat_read_states_chat\` FOREIGN KEY (\`chat_id\`) REFERENCES \`chats\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_chat_read_states_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(
      'CREATE INDEX `IDX_messages_chat_deleted_created` ON `messages` (`chat_id`, `deleted_at`, `created_at`)',
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_users_phone` ON `users` (`phone`)',
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_users_email_confirmation_code` ON `users` (`email_confirmation_code`)',
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_users_role` ON `users` (`role`)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_users_role` ON `users`');
    await queryRunner.query('DROP INDEX `IDX_users_email_confirmation_code` ON `users`');
    await queryRunner.query('DROP INDEX `IDX_users_phone` ON `users`');
    await queryRunner.query('DROP INDEX `IDX_messages_chat_deleted_created` ON `messages`');
    await queryRunner.query('DROP TABLE `chat_read_states`');
  }
}
