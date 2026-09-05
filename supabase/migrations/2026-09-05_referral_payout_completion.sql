-- Referral payouts: completion flow + RLS hardening
-- 1. Close INSERT backdoor on referral_commissions (`OR true` let any user
--    fabricate commissions and claim payouts on them). Webhook writes use the
--    service-role key, which bypasses RLS, so this does not affect accrual.
DROP POLICY IF EXISTS commissions_admin_insert ON public.referral_commissions;
CREATE POLICY commissions_admin_insert ON public.referral_commissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.evaluator_profiles ep
      WHERE ep.user_id = auth.uid() AND ep.role = 'admin'
    )
  );

-- 2. Admins may update commissions (flipping eligible -> paid).
CREATE POLICY commissions_admin_update ON public.referral_commissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.evaluator_profiles ep
      WHERE ep.user_id = auth.uid() AND ep.role = 'admin'
    )
  );

-- 3. Admins may insert/update payout records.
CREATE POLICY payouts_admin_insert ON public.referral_payouts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.evaluator_profiles ep
      WHERE ep.user_id = auth.uid() AND ep.role = 'admin'
    )
  );

CREATE POLICY payouts_admin_update ON public.referral_payouts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.evaluator_profiles ep
      WHERE ep.user_id = auth.uid() AND ep.role = 'admin'
    )
  );

-- 4. Atomic payout completion. Callable by an authenticated admin session only
--    (checks role inside). Marks ALL eligible commissions of the partner as
--    paid, links them to a new payout record, enforces the £25 minimum from
--    the partner terms, and writes an audit entry. All in one transaction.
CREATE OR REPLACE FUNCTION public.complete_partner_payout(
  p_partner_id uuid,
  p_bank_reference text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_onboarded boolean;
  v_total integer;
  v_payout_id uuid;
  v_actor text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.evaluator_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT onboarding_completed INTO v_onboarded
  FROM public.referral_partners
  WHERE id = p_partner_id;

  IF v_onboarded IS NOT TRUE THEN
    RAISE EXCEPTION 'Partner has not completed payout onboarding';
  END IF;

  SELECT COALESCE(SUM(commission_amount_pence), 0) INTO v_total
  FROM public.referral_commissions
  WHERE partner_id = p_partner_id AND status = 'eligible';

  IF v_total < 2500 THEN
    RAISE EXCEPTION 'Payable balance below £25 minimum (currently %p)', v_total;
  END IF;

  INSERT INTO public.referral_payouts
    (partner_id, total_amount_pence, status, bank_reference, paid_at)
  VALUES
    (p_partner_id, v_total, 'paid', p_bank_reference, now())
  RETURNING id INTO v_payout_id;

  UPDATE public.referral_commissions
  SET status = 'paid', payout_id = v_payout_id, updated_at = now()
  WHERE partner_id = p_partner_id AND status = 'eligible';

  SELECT email INTO v_actor FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.referral_audit_log
    (actor, entity_type, entity_id, old_status, new_status, note)
  VALUES
    (COALESCE(v_actor, 'admin'),
     'referral_payouts',
     v_payout_id,
     'eligible',
     'paid',
     'Payout of ' || v_total || 'p covering all eligible commissions'
       || COALESCE(' — ref: ' || p_bank_reference, ''));

  RETURN v_payout_id;
END;
$$;
