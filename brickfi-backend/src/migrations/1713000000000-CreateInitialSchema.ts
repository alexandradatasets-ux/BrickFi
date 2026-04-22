import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialSchema1713000000000 implements MigrationInterface {
  name = 'CreateInitialSchema1713000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users table 
    // Stores user accounts and authentication details
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "email"         VARCHAR(255) UNIQUE NOT NULL,
        "phone"         VARCHAR(50),
        "password_hash" VARCHAR(255) NOT NULL,
        "wallet_address" VARCHAR(100),
        "role"          VARCHAR(20) NOT NULL DEFAULT 'investor',
        "created_at"    TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Properties table (includes on-chain tokenization fields)
    // Stores real estate properties available for tokenization and investment 
    await queryRunner.query(`
      CREATE TABLE "properties" (
        "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"             VARCHAR(255) NOT NULL,
        "location"         VARCHAR(255) NOT NULL,
        "total_value_usd"  NUMERIC(18,2) NOT NULL,
        "total_units"      INTEGER NOT NULL,
        "price_per_unit"   NUMERIC(18,2) NOT NULL,
        "annual_yield"     NUMERIC(5,2) NOT NULL,
        "images"           TEXT[],
        "description"      TEXT,
        "is_active"        BOOLEAN DEFAULT TRUE,
        "short_code"       VARCHAR(20) NOT NULL,
        "nft_asset_code"   VARCHAR(20),
        "nft_tx_hash"      VARCHAR(100),
        "token_asset_code" VARCHAR(20),
        "token_issuer"     VARCHAR(100),
        "created_at"       TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Investments table
    //  Stores each user's ownership position in a specific property
    await queryRunner.query(`
      CREATE TABLE "investments" (
        "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"        UUID NOT NULL REFERENCES "users"("id"),
        "property_id"    UUID NOT NULL REFERENCES "properties"("id"),
        //units_owned: number of fractional units currently owned by the user
        "units_owned"    INTEGER NOT NULL DEFAULT 0,
        "total_invested" NUMERIC(18,2) NOT NULL DEFAULT 0,
        "created_at"     TIMESTAMPTZ DEFAULT NOW(),
        // Prevents duplicate investment records for the same user-property pair
        UNIQUE("user_id", "property_id")
      )
    `);

    // Rent payments table
    // Stores rent income collected for each property, with all monetary values in USD
    await queryRunner.query(`
      CREATE TABLE "rent_payments" (
        "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "property_id"    UUID NOT NULL REFERENCES "properties"("id"),
        "amount_usd"     NUMERIC(18,2) NOT NULL,
        // fee_percentage: platform fee deducted from the gross rent amount
        "fee_percentage" NUMERIC(5,2) NOT NULL DEFAULT 2.0,
        // net_amount_usd: rent amount remaining after platform fees
        "net_amount_usd" NUMERIC(18,2) NOT NULL,
        // period: rent period in YYYY-MM format to ensure one record per property per month
        "period"         VARCHAR(7) NOT NULL,
        "created_at"     TIMESTAMPTZ DEFAULT NOW(),
        // Prevents duplicate rent records for the same property and period
UNIQUE("property_id", "period")
        UNIQUE("property_id", "period")
      )
    `);

    // Distributions table
// Stores rent distributions allocated to users based on their property ownership
    await queryRunner.query(`
      CREATE TABLE "distributions" (
        "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"         UUID NOT NULL REFERENCES "users"("id"),
        "property_id"     UUID NOT NULL REFERENCES "properties"("id"),
        "rent_payment_id" UUID NOT NULL REFERENCES "rent_payments"("id"),
        // amount_usdc: distribution amount paid to the user in USDC (stablecoin)
        "amount_usdc"     NUMERIC(18,7) NOT NULL,
        // status: distribution status (e.g. pending, completed, failed)
        "status"          VARCHAR(20) NOT NULL DEFAULT 'pending',
        // tx_hash: blockchain transaction hash for the distribution payout
        "tx_hash"         VARCHAR(100),
        // period: rent period associated with this distribution (YYYY-MM format)
        "period"          VARCHAR(7) NOT NULL,
        "created_at"      TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Transactions table
    // Stores financial transactions (e.g. deposits, withdrawals) linked to users
    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"    UUID NOT NULL REFERENCES "users"("id"),
        // type: transaction type (e.g. deposit, withdrawal)
        "type"       VARCHAR(20) NOT NULL,
        // amount: transaction amount (supports high precision for crypto values)
        "amount"     NUMERIC(18,7) NOT NULL,
        // tx_hash: blockchain transaction hash associated with this transaction
        "tx_hash"    VARCHAR(100),
        // status: transaction status (e.g. pending, completed, failed)
        "status"     VARCHAR(20) NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Audit logs table
    // Stores user actions for tracking and debugging system activity
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"     UUID NOT NULL REFERENCES "users"("id"),
        // action: type of action performed by the user (e.g. create, update, delete)
        "action"      VARCHAR(100) NOT NULL,
        // resource: entity affected by the action (e.g. property, investment)
        "resource"    VARCHAR(100),
        "resource_id" UUID,
        // metadata: additional contextual data related to the action
        "metadata"    JSONB,
        "created_at"  TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "distributions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rent_payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "investments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "properties"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
