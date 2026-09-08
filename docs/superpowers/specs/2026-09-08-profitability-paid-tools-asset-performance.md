# Profitability, Paid Tools, and Asset Performance Spec

- Add “Are you profitable?” to onboarding with Yes, No, I don't know, and Break even. Existing completed users see the new question once before their updated review.
- Wallet reports remain free and unlimited for signed-in users.
- The journal and call booking require a confirmed payment. Protection must be enforced by server data, not only hidden links.
- `/payment` must use the payment record, not free report access, to decide whether paid tools are unlocked.
- Each exchange report and every combined report shows the asset with the highest positive net realized P&L and the asset with the lowest negative net realized P&L. If no qualifying winner or loser exists, show an honest empty value.
