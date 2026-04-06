import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsersEmailConfirmation1743324600000
  implements MigrationInterface
{
  name = 'AddUsersEmailConfirmation1743324600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
      ADD \`email_confirmation_code\` varchar(36) NULL,
      ADD \`email_confirmation_expires_at\` datetime(6) NULL,
      ADD \`is_email_confirmed\` tinyint NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
      DROP COLUMN \`is_email_confirmed\`,
      DROP COLUMN \`email_confirmation_expires_at\`,
      DROP COLUMN \`email_confirmation_code\`
    `);
  }
}
