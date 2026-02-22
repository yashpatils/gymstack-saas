DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pending_sensitive_changes_attempts_nonnegative') THEN
    ALTER TABLE pending_sensitive_changes
      ADD CONSTRAINT pending_sensitive_changes_attempts_nonnegative CHECK ("attempts" >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pending_sensitive_changes_max_attempts_positive') THEN
    ALTER TABLE pending_sensitive_changes
      ADD CONSTRAINT pending_sensitive_changes_max_attempts_positive CHECK ("maxAttempts" > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pending_sensitive_changes_attempts_lte_max') THEN
    ALTER TABLE pending_sensitive_changes
      ADD CONSTRAINT pending_sensitive_changes_attempts_lte_max CHECK ("attempts" <= "maxAttempts");
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'login_otp_challenges_attempts_nonnegative') THEN
    ALTER TABLE login_otp_challenges
      ADD CONSTRAINT login_otp_challenges_attempts_nonnegative CHECK ("attempts" >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'login_otp_challenges_max_attempts_positive') THEN
    ALTER TABLE login_otp_challenges
      ADD CONSTRAINT login_otp_challenges_max_attempts_positive CHECK ("maxAttempts" > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'login_otp_challenges_attempts_lte_max') THEN
    ALTER TABLE login_otp_challenges
      ADD CONSTRAINT login_otp_challenges_attempts_lte_max CHECK ("attempts" <= "maxAttempts");
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_pending_sensitive_changes_active_user
  ON pending_sensitive_changes ("userId", "otpExpiresAt" DESC, "createdAt" DESC)
  WHERE "consumedAt" IS NULL AND "cancelledAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_pending_sensitive_changes_active_tenant
  ON pending_sensitive_changes ("tenantId", "otpExpiresAt" DESC, "createdAt" DESC)
  WHERE "consumedAt" IS NULL AND "cancelledAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_login_otp_challenges_active_user
  ON login_otp_challenges ("userId", "otpExpiresAt" DESC, "createdAt" DESC)
  WHERE "consumedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_pending_sensitive_changes_cleanup_consumed
  ON pending_sensitive_changes ("createdAt")
  WHERE "consumedAt" IS NOT NULL OR "cancelledAt" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pending_sensitive_changes_cleanup_expired
  ON pending_sensitive_changes ("otpExpiresAt", "createdAt")
  WHERE "consumedAt" IS NULL AND "cancelledAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_login_otp_challenges_cleanup_consumed
  ON login_otp_challenges ("createdAt")
  WHERE "consumedAt" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_login_otp_challenges_cleanup_expired
  ON login_otp_challenges ("otpExpiresAt", "createdAt")
  WHERE "consumedAt" IS NULL;
