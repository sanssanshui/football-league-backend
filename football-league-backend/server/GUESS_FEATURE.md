# Adding Test Matches for Guess Feature

Since the scraper data may not have upcoming matches, you can run this script to add test matches:

```bash
cd server
npx ts-node prisma/add-test-matches.ts
```

This will create 10 test matches spread over the next 30 days with `status = 0` (未开始).

## Automatic Guess Evaluation

The system now includes automatic guess evaluation:

1. **Hourly Check**: Every hour, the system checks for finished matches (status = 2) and evaluates all pending guesses
2. **Daily Cleanup**: Every day at 2 AM, expired matches (past date but still status = 0) are marked as cancelled (status = 3)

### How Guess Evaluation Works:

- When a match finishes (status changes to 2), the system:
  1. Determines the actual result (主胜/平局/客胜) based on scores
  2. Compares each user's guess with the actual result
  3. If correct: awards 20 points and sets `isCorrect = true`
  4. If incorrect: sets `isCorrect = false`, no points awarded
  5. Updates guess status to 1 (已评估)

### Match Status Values:

- `0` = 未开始 (Not started - can guess)
- `1` = 进行中 (In progress - cannot guess)
- `2` = 已结束 (Finished - triggers evaluation)
- `3` = 已取消 (Cancelled)

## Frontend Filtering

Both `/guess` and `/community?tab=quiz` pages now filter matches to show only:
- Status = 0 (未开始)
- Match time between now and 30 days from now
- This ensures users only see relevant upcoming matches
