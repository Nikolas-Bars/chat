import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChatsAndMessagesTables1743500000000
  implements MigrationInterface
{
  name = 'CreateChatsAndMessagesTables1743500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`chats\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`first_user_id\` int NOT NULL,
        \`second_user_id\` int NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`UQ_chats_user_pair\` (\`first_user_id\`, \`second_user_id\`),
        INDEX \`IDX_chats_first_user\` (\`first_user_id\`),
        INDEX \`IDX_chats_second_user\` (\`second_user_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_chats_first_user\` FOREIGN KEY (\`first_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_chats_second_user\` FOREIGN KEY (\`second_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`messages\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`chat_id\` int NOT NULL,
        \`sender_id\` int NOT NULL,
        \`content\` text NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_messages_chat_id\` (\`chat_id\`),
        INDEX \`IDX_messages_sender_id\` (\`sender_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_messages_chat\` FOREIGN KEY (\`chat_id\`) REFERENCES \`chats\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_messages_sender\` FOREIGN KEY (\`sender_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`messages\``);
    await queryRunner.query(`DROP TABLE \`chats\``);
  }
}

