import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeleteToChatsAndMessages1744010000000
  implements MigrationInterface
{
  name = 'AddSoftDeleteToChatsAndMessages1744010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `chats` ADD `deleted_at` datetime(6) NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `messages` ADD `deleted_at` datetime(6) NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `messages` DROP COLUMN `deleted_at`');
    await queryRunner.query('ALTER TABLE `chats` DROP COLUMN `deleted_at`');
  }
}

